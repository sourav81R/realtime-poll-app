const Poll = require("../models/Poll");
const Vote = require("../models/Vote");

// Create Poll
exports.createPoll = async (req, res) => {
  try {
    const { question, options } = req.body;

    if (!question || options.length < 2) {
      return res.status(400).json({ message: "Minimum 2 options required" });
    }

    const poll = await Poll.create({
      question,
      options: options.map((text) => ({ text })),
    });

    res.status(201).json(poll);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Poll
exports.getPoll = async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.id);
    if (!poll) return res.status(404).json({ message: "Poll not found" });
    res.json(poll);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Vote
exports.votePoll = async (req, res) => {
  try {
    const { optionIndex } = req.body;
    const pollId = req.params.id;

    const ip = req.ip;

    // Fairness #2 → one vote per IP
    const existingVote = await Vote.findOne({ pollId, voterIp: ip });
    if (existingVote) {
      return res.status(400).json({ message: "You already voted" });
    }

    const poll = await Poll.findById(pollId);
    if (!poll) return res.status(404).json({ message: "Poll not found" });

    poll.options[optionIndex].votes += 1;
    await poll.save();

    await Vote.create({ pollId, voterIp: ip });

    res.json(poll);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
