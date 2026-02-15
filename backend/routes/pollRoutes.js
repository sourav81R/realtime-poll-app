const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const auth = require("../middleware/auth");
const createPollLimiter = require("../middleware/rateLimiter");

const Poll = mongoose.model("Poll");
const Vote = require("../models/Vote");

const router = express.Router();

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

const isTransactionUnsupportedError = (error) => {
  const message = error?.message || "";
  return (
    message.includes("Transaction numbers are only allowed on a replica set member or mongos") ||
    message.includes("Transaction support is not available")
  );
};

const applyVoteChange = async ({ pollId, userId, optionIndex, session }) => {
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

  const existingVoteQuery = Vote.findOne({ pollId, userId });
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

    if (session) {
      await existingVote.save({ session });
    } else {
      await existingVote.save();
    }
  } else {
    poll.options[optionIndex].votes += 1;

    if (session) {
      await Vote.create([{ pollId, userId, optionIndex }], { session });
    } else {
      await Vote.create({ pollId, userId, optionIndex });
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
    const userId = getOptionalUserId(req);

    if (!userId || polls.length === 0) {
      return res.json(polls);
    }

    const pollIds = polls.map((poll) => poll._id);
    const votes = await Vote.find({
      userId,
      pollId: { $in: pollIds },
    }).select("pollId optionIndex");

    const voteMap = new Map(votes.map((vote) => [String(vote.pollId), vote.optionIndex]));
    const feed = polls.map((poll) => ({
      ...poll.toObject(),
      currentUserVote: voteMap.has(String(poll._id))
        ? voteMap.get(String(poll._id))
        : null,
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
    const normalizedQuestion =
      typeof question === "string" ? question.trim() : "";
    const normalizedOptions = Array.isArray(options)
      ? options
          .map((opt) => (typeof opt === "string" ? opt.trim() : ""))
          .filter(Boolean)
      : [];
    const distinctOptions = new Set(
      normalizedOptions.map((opt) => opt.toLowerCase())
    );

    if (!normalizedQuestion || normalizedOptions.length < 2) {
      return res.status(400).json({ message: "Invalid poll data" });
    }

    if (distinctOptions.size < 2) {
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

// Vote / change vote / revoke vote by selecting same option again
router.post("/:id/vote", auth, async (req, res) => {
  let session;

  try {
    const { id: pollId } = req.params;
    const { optionIndex } = req.body;
    const userId = req.user.id;

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
          optionIndex,
          session,
        });
      });
    } catch (transactionError) {
      if (isTransactionUnsupportedError(transactionError)) {
        pollData = await applyVoteChange({
          pollId,
          userId,
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
    const userId = getOptionalUserId(req);
    if (userId) {
      const vote = await Vote.findOne({ pollId: id, userId }).select("optionIndex");
      pollData.currentUserVote = vote ? vote.optionIndex : null;
    }

    return res.json(pollData);
  } catch (err) {
    console.error("Error fetching poll:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
