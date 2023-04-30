const mongoose = require("mongoose");

const ChatSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  }],
  messages: [{
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    content: {
      type: String
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
  }],
});

module.exports = mongoose.model("Chat", ChatSchema);
