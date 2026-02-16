const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const auth = require("../middleware/auth");
const { createPollLimiter, voteLimiter } = require("../middleware/rateLimiter");

const Poll = mongoose.model("Poll");
const Vote = require("../models/Vote");

const router = express.Router();
const VOTER_TOKEN_HEADER = "x-voter-token";

const createHttpError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const getOptionalUserId = (req) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return null;
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
    return decoded.id;
  } catch (_error) {
    return null;
  }
};

const normalizeGuestToken = (rawToken) => {
  if (typeof rawToken !== "string") return null;
  const token = rawToken.trim();
  if (token.length < 8 || token.length > 120) return null;
  if (!/^[a-zA-Z0-9_-]+$/.test(token)) return null;
  return token;
};

const getRequesterIp = (req) => {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0].trim();
  }

  return req.ip || "unknown";
};

const resolveVoteIdentity = (req) => {
  const userId = getOptionalUserId(req);
  if (userId) {
    return {
      userId,
      voterKey: `user:${userId}`,
    };
  }

  const guestToken = normalizeGuestToken(req.headers[VOTER_TOKEN_HEADER]);
  if (guestToken) {
    return {
      userId: null,
      voterKey: `guest:${guestToken}`,
    };
  }

  return {
    userId: null,
    voterKey: `ip:${getRequesterIp(req).replace(/\s+/g, "")}`,
  };
};

const buildVoteLookupConditions = ({ userId, voterKey }) => {
  const conditions = [{ voterKey }];
  if (userId) {
    conditions.push({ userId });
  }

  return conditions;
};

const normalizePollPayload = (question, options) => {
  const normalizedQuestion = typeof question === "string" ? question.trim() : "";
  const normalizedOptions = Array.isArray(options)
    ? options
        .map((opt) => (typeof opt === "string" ? opt.trim() : ""))
        .filter(Boolean)
    : [];
  const distinctOptions = new Set(
    normalizedOptions.map((opt) => opt.toLowerCase())
  );

  return {
    normalizedQuestion,
    normalizedOptions,
    distinctCount: distinctOptions.size,
  };
};

const enrichPollForUser = (pollData, userId, currentUserVote = null) => ({
  ...pollData,
  currentUserVote,
  isOwner: Boolean(userId) && String(pollData.createdBy || "") === String(userId),
});

const isTransactionUnsupportedError = (error) => {
  const message = error?.message || "";
  return (
    message.includes("Transaction numbers are only allowed on a replica set member or mongos") ||
    message.includes("Transaction support is not available")
  );
};

const applyVoteChange = async ({ pollId, userId, voterKey, optionIndex, session }) => {
  const pollQuery = Poll.findById(pollId);
  if (session) {
    pollQuery.session(session);
  }

  const poll = await pollQuery;
  if (!poll) {
    throw createHttpError(404, "Poll not found");
  }

  if (!poll.options[optionIndex]) {
    throw createHttpError(400, "Option does not exist");
  }

  const existingVoteQuery = Vote.findOne({
    pollId,
    $or: buildVoteLookupConditions({ userId, voterKey }),
  }).sort({ createdAt: -1 });
  if (session) {
    existingVoteQuery.session(session);
  }

  const existingVote = await existingVoteQuery;
  let currentUserVote = optionIndex;

  if (existingVote && existingVote.optionIndex === optionIndex) {
    poll.options[optionIndex].votes = Math.max(0, poll.options[optionIndex].votes - 1);

    if (session) {
      await Vote.deleteOne({ _id: existingVote._id }, { session });
    } else {
      await Vote.deleteOne({ _id: existingVote._id });
    }

    currentUserVote = null;
  } else if (existingVote) {
    if (poll.options[existingVote.optionIndex]) {
      poll.options[existingVote.optionIndex].votes = Math.max(
        0,
        poll.options[existingVote.optionIndex].votes - 1
      );
    }

    poll.options[optionIndex].votes += 1;
    existingVote.optionIndex = optionIndex;
    existingVote.voterKey = voterKey;
    if (userId && !existingVote.userId) {
      existingVote.userId = userId;
    }

    if (session) {
      await existingVote.save({ session });
    } else {
      await existingVote.save();
    }
  } else {
    poll.options[optionIndex].votes += 1;
    const voteData = {
      pollId,
      optionIndex,
      voterKey,
    };
    if (userId) {
      voteData.userId = userId;
    }

    if (session) {
      await Vote.create([voteData], { session });
    } else {
      await Vote.create(voteData);
    }
  }

  if (session) {
    await poll.save({ session });
  } else {
    await poll.save();
  }

  const pollData = poll.toObject();
  delete pollData.voters;
  pollData.currentUserVote = currentUserVote;
  return pollData;
};

// Feed: latest polls
router.get("/", async (req, res) => {
  try {
    const polls = await Poll.find().select("-voters").sort({ createdAt: -1 }).limit(100);
    const identity = resolveVoteIdentity(req);
    const optionalUserId = getOptionalUserId(req);

    if (polls.length === 0) {
      return res.json(polls);
    }

    const pollIds = polls.map((poll) => poll._id);
    const votes = await Vote.find({
      pollId: { $in: pollIds },
      $or: buildVoteLookupConditions(identity),
    })
      .sort({ createdAt: -1 })
      .select("pollId optionIndex");

    const voteMap = new Map();
    for (const vote of votes) {
      const key = String(vote.pollId);
      if (!voteMap.has(key)) {
        voteMap.set(key, vote.optionIndex);
      }
    }

    const feed = polls.map((poll) => ({
      ...enrichPollForUser(
        poll.toObject(),
        optionalUserId,
        voteMap.has(String(poll._id)) ? voteMap.get(String(poll._id)) : null
      ),
    }));

    return res.json(feed);
  } catch (err) {
    console.error("Error fetching polls feed:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Create a new poll (auth required)
router.post("/", auth, createPollLimiter, async (req, res) => {
  try {
    const { question, options } = req.body;
    const { normalizedQuestion, normalizedOptions, distinctCount } =
      normalizePollPayload(question, options);

    if (!normalizedQuestion || normalizedOptions.length < 2) {
      return res.status(400).json({ message: "Invalid poll data" });
    }

    if (distinctCount < 2) {
      return res.status(400).json({
        message: "Please provide at least 2 different options",
      });
    }

    const poll = new Poll({
      createdBy: req.user.id,
      question: normalizedQuestion,
      options: normalizedOptions.map((opt) => ({ text: opt, votes: 0 })),
    });

    await poll.save();
    return res.status(201).json(poll);
  } catch (err) {
    console.error("Error creating poll:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Edit poll (owner only)
router.put("/:id", auth, async (req, res) => {
  try {
    const { id: pollId } = req.params;
    const ownerId = req.user.id;
    const { question, options } = req.body;

    if (!mongoose.Types.ObjectId.isValid(pollId)) {
      return res.status(400).json({ message: "Invalid Poll ID" });
    }

    const { normalizedQuestion, normalizedOptions, distinctCount } =
      normalizePollPayload(question, options);

    if (!normalizedQuestion || normalizedOptions.length < 2) {
      return res.status(400).json({ message: "Invalid poll data" });
    }

    if (distinctCount < 2) {
      return res.status(400).json({
        message: "Please provide at least 2 different options",
      });
    }

    const poll = await Poll.findById(pollId);
    if (!poll) {
      return res.status(404).json({ message: "Poll not found" });
    }

    if (String(poll.createdBy || "") !== String(ownerId)) {
      return res.status(403).json({ message: "Only the poll owner can edit this poll" });
    }

    const previousOptions = poll.options.map((opt) => String(opt.text || "").trim());
    const optionsChanged =
      previousOptions.length !== normalizedOptions.length ||
      previousOptions.some((text, index) => text !== normalizedOptions[index]);

    poll.question = normalizedQuestion;

    if (optionsChanged) {
      poll.options = normalizedOptions.map((text) => ({ text, votes: 0 }));
      await Vote.deleteMany({ pollId });
    } else {
      poll.options = poll.options.map((existingOption, index) => ({
        text: normalizedOptions[index],
        votes: existingOption.votes,
      }));
    }

    await poll.save();

    let currentUserVote = null;
    if (!optionsChanged) {
      const ownerVote = await Vote.findOne({ pollId, userId: ownerId }).select("optionIndex");
      currentUserVote = ownerVote ? ownerVote.optionIndex : null;
    }

    const pollData = enrichPollForUser(poll.toObject(), ownerId, currentUserVote);
    const io = req.app.get("io");
    if (io) {
      const broadcastData = { ...pollData };
      delete broadcastData.currentUserVote;
      io.to(pollId).emit("update_poll", broadcastData);
    }

    return res.json({
      ...pollData,
      message: optionsChanged
        ? "Poll updated and votes reset because options were changed"
        : "Poll updated",
    });
  } catch (err) {
    console.error("Error editing poll:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Delete poll (owner only)
router.delete("/:id", auth, async (req, res) => {
  try {
    const { id: pollId } = req.params;
    const ownerId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(pollId)) {
      return res.status(400).json({ message: "Invalid Poll ID" });
    }

    const poll = await Poll.findById(pollId).select("_id createdBy");
    if (!poll) {
      return res.status(404).json({ message: "Poll not found" });
    }

    if (String(poll.createdBy || "") !== String(ownerId)) {
      return res.status(403).json({ message: "Only the poll owner can delete this poll" });
    }

    await Promise.all([
      Vote.deleteMany({ pollId }),
      Poll.deleteOne({ _id: pollId }),
    ]);

    const io = req.app.get("io");
    if (io) {
      io.to(pollId).emit("poll_deleted", { pollId });
    }

    return res.json({ message: "Poll deleted successfully" });
  } catch (err) {
    console.error("Error deleting poll:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Vote / change vote / revoke vote by selecting same option again
router.post("/:id/vote", voteLimiter, async (req, res) => {
  let session;

  try {
    const { id: pollId } = req.params;
    const { optionIndex } = req.body;
    const identity = resolveVoteIdentity(req);
    const { userId, voterKey } = identity;

    if (!mongoose.Types.ObjectId.isValid(pollId)) {
      return res.status(400).json({ message: "Invalid Poll ID" });
    }

    if (!Number.isInteger(optionIndex) || optionIndex < 0) {
      return res.status(400).json({ message: "Invalid option index" });
    }

    session = await mongoose.startSession();
    let pollData;

    try {
      await session.withTransaction(async () => {
        pollData = await applyVoteChange({
          pollId,
          userId,
          voterKey,
          optionIndex,
          session,
        });
      });
    } catch (transactionError) {
      if (isTransactionUnsupportedError(transactionError)) {
        pollData = await applyVoteChange({
          pollId,
          userId,
          voterKey,
          optionIndex,
          session: null,
        });
      } else {
        throw transactionError;
      }
    }

    const io = req.app.get("io");
    if (io) {
      const broadcastData = { ...pollData };
      delete broadcastData.currentUserVote;
      io.to(pollId).emit("update_poll", broadcastData);
    }

    return res.json(pollData);
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({
        message: "A vote update conflict occurred. Please retry once.",
      });
    }

    if (err?.status) {
      return res.status(err.status).json({ message: err.message });
    }

    console.error("Error submitting vote:", err);
    return res.status(500).json({ message: "Server error" });
  } finally {
    if (session) {
      await session.endSession();
    }
  }
});

// Profile dashboard: polls created by user + polls voted by user
router.get("/me/dashboard", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const createdPolls = await Poll.find({ createdBy: userId })
      .select("-voters")
      .sort({ createdAt: -1 });

    const userVotes = await Vote.find({ userId })
      .select("pollId optionIndex createdAt")
      .sort({ createdAt: -1 });

    const voteMap = new Map();
    for (const vote of userVotes) {
      const key = String(vote.pollId);
      if (!voteMap.has(key)) {
        voteMap.set(key, {
          optionIndex: vote.optionIndex,
          votedAt: vote.createdAt,
        });
      }
    }

    const votedPollIds = [...voteMap.keys()];
    const votedPollDocs =
      votedPollIds.length > 0
        ? await Poll.find({ _id: { $in: votedPollIds } }).select("-voters")
        : [];

    const votedPolls = votedPollDocs
      .map((poll) => {
        const voteInfo = voteMap.get(String(poll._id));
        return {
          ...poll.toObject(),
          currentUserVote: voteInfo ? voteInfo.optionIndex : null,
          votedAt: voteInfo ? voteInfo.votedAt : null,
        };
      })
      .sort((a, b) => new Date(b.votedAt || 0) - new Date(a.votedAt || 0));

    return res.json({
      createdPolls,
      votedPolls,
    });
  } catch (err) {
    console.error("Error loading profile dashboard:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Get a poll by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid Poll ID" });
    }

    const poll = await Poll.findById(id).select("-voters");
    if (!poll) {
      return res.status(404).json({ message: "Poll not found" });
    }

    const pollData = poll.toObject();
    const identity = resolveVoteIdentity(req);
    const vote = await Vote.findOne({
      pollId: id,
      $or: buildVoteLookupConditions(identity),
    })
      .sort({ createdAt: -1 })
      .select("optionIndex");
    const currentUserVote = vote ? vote.optionIndex : null;
    const optionalUserId = getOptionalUserId(req);
    const responsePoll = enrichPollForUser(pollData, optionalUserId, currentUserVote);

    return res.json(responsePoll);
  } catch (err) {
    console.error("Error fetching poll:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
