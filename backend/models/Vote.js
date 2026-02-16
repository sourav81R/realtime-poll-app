const mongoose = require("mongoose");

const voteSchema = new mongoose.Schema(
  {
    pollId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Poll",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    voterKey: {
      type: String,
      required: true,
      trim: true,
    },
    optionIndex: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { timestamps: true }
);

// One vote per authenticated user per poll (when userId is present).
voteSchema.index(
  { pollId: 1, userId: 1 },
  {
    unique: true,
    partialFilterExpression: { userId: { $exists: true } },
  }
);

// One vote per resolved voter identity (user token, guest token, or IP fallback) per poll.
voteSchema.index(
  { pollId: 1, voterKey: 1 },
  {
    unique: true,
    partialFilterExpression: { voterKey: { $exists: true } },
  }
);

module.exports = mongoose.model("Vote", voteSchema);
