const mongoose = require("mongoose");

const voteSchema = new mongoose.Schema(
  {
    pollId: { type: mongoose.Schema.Types.ObjectId, ref: "Poll" },
    voterIp: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Vote", voteSchema);
