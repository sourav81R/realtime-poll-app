const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const auth = require("../middleware/auth");
const createPollLimiter = require("../middleware/rateLimiter");

const Poll = mongoose.model("Poll");
const Vote = require("../models/Vote");

const router = express.Router();

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

    if (!question || !options || options.length < 2) {
      return res.status(400).json({ message: "Invalid poll data" });
    }

    const poll = new Poll({
      question,
      options: options.map((opt) => ({ text: opt, votes: 0 })),
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

    const poll = await Poll.findById(pollId);
    if (!poll) {
      return res.status(404).json({ message: "Poll not found" });
    }

    if (!poll.options[optionIndex]) {
      return res.status(400).json({ message: "Option does not exist" });
    }

    const existingVote = await Vote.findOne({ pollId, userId });
    let currentUserVote = optionIndex;

    if (existingVote && existingVote.optionIndex === optionIndex) {
      poll.options[optionIndex].votes = Math.max(0, poll.options[optionIndex].votes - 1);
      await Vote.deleteOne({ _id: existingVote._id });
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
      await existingVote.save();
    } else {
      poll.options[optionIndex].votes += 1;
      await Vote.create({ pollId, userId, optionIndex });
    }

    await poll.save();

    const pollData = poll.toObject();
    delete pollData.voters;
    pollData.currentUserVote = currentUserVote;

    const io = req.app.get("io");
    if (io) {
      const broadcastData = { ...pollData };
      delete broadcastData.currentUserVote;
      io.to(pollId).emit("update_poll", broadcastData);
    }

    return res.json(pollData);
  } catch (err) {
    console.error("Error submitting vote:", err);
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
