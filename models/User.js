const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  isPooping: {
    type: Boolean,
    default: false
  },
  isPoopingExpiresAt: {
    type: Date,
    default: null
  },
  friends: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],
  friendRequests: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],
  chatRooms: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Chat"
  }],
});

module.exports = mongoose.model("User", UserSchema);
