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
      required: true,
      index: true,
    },
    optionIndex: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { timestamps: true }
);

// Enforce one active vote per user per poll at the database level.
voteSchema.index({ pollId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("Vote", voteSchema);
