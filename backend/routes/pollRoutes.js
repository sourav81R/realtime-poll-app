const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Poll = mongoose.model('Poll');
const createPollLimiter = require('../middleware/rateLimiter');
const auth = require("../middleware/auth");

// Create a new poll
router.post('/', auth, createPollLimiter, async (req, res) => {
  try {
    const { question, options } = req.body;
    
    if (!question || !options || options.length < 2) {
      return res.status(400).json({ message: "Invalid poll data" });
    }

    const poll = new Poll({
      question,
      options: options.map(opt => ({ text: opt, votes: 0 }))
    });

    await poll.save();
    res.status(201).json(poll);
  } catch (err) {
    console.error("Error creating poll:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get a poll by ID (Join by link)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid Poll ID" });
    }

    const poll = await Poll.findById(id).select('-voters');
    if (!poll) {
      return res.status(404).json({ message: "Poll not found" });
    }

    res.json(poll);
  } catch (err) {
    console.error("Error fetching poll:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
