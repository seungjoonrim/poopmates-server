const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const Chat = require("../models/Chat");

require("dotenv").config();

const jwtSecret = process.env.JWT_SECRET;
const router = express.Router();

// USER ROUTES ________________________________________________________________
// User registration
router.post("/register", async (req, res) => {
  console.log("REGISTERING USER");
  try {
    const { username, email, password } = req.body;

    // Check if the user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create the user
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
    });

    await newUser.save();
    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// User login
router.post("/login", async (req, res) => {
  console.log("LOGGING IN USER");
  try {
    const authHeader = req.headers.authorization;
    const { email, password } = req.body;

    // Auth via JWT
    if (authHeader) {
      try {
        const decodedToken = jwt.verify(authHeader, jwtSecret);
        const userId = decodedToken.userId;
        const user = await User.findById(userId);
        const token = jwt.sign({ userId: user._id }, jwtSecret, { expiresIn: "1h" });
        const { password: pw, access_token, ...rest } = user.toObject();
        return res.status(200).json({ userData: rest, token, message: "User logged in successfully" });
      } catch (e) {
        return res.status(400).json({ message: "Invalid JWT. Please log in with un/pw." });
      }
    }

    // Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Check the password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Sign a JWT token
    const token = jwt.sign({ userId: user._id }, jwtSecret, { expiresIn: "1h" });
    const { password: pw, access_token, ...rest } = user.toObject();
    return res.status(200).json({ userData: rest, token, message: "User logged in successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Get user profile
router.get("/users/:userId", async (req, res) => {
  console.log("GETTING USER");
  try {
    const user = await User.findById(req.params.userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Set isPooping
router.patch("/users/:userId/update-status", async (req, res) => {
  console.log("UPDATING STATUS");
  const { userId } = req.params;
  const { isPooping, isPoopingExpiresAt } = req.body;

  try {
    const user = await User.findByIdAndUpdate(
      userId,
      { isPooping, isPoopingExpiresAt },
      { new: true }
    );

    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }

    res.send(user);
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'An error occurred while updating the status' });
  }
});

// Search for other users
router.get("/search", async (req, res) => {
  console.log("SEARCHING");
  const searchTerm = req.query.q;

  try {
    const users = await User.find({
      username: new RegExp(searchTerm, 'i'),
    }).select('-password -__v');

    res.json(users);
  } catch (error) {
    console.error('Error searching for users:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Friend request
router.post("/send-friend-request/:userId/:friendId", async (req, res) => {
  console.log("SENDING FRIEND REQUEST");
  try {
    const user = await User.findById(req.params.userId);
    const friend = await User.findById(req.params.friendId);
    if (!user || !friend) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!friend.friendRequests.includes(user._id)) {
      friend.friendRequests.push(user._id);
      await friend.save();
    }

    res.status(200).json({ message: "Friend request sent" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Accept friend request
router.post("/accept-friend-request/:userId/:friendId", async (req, res) => {
  console.log("ACCEPTING FRIEND REQUEST");
  try {
    const user = await User.findById(req.params.userId);
    const friend = await User.findById(req.params.friendId);
    if (!user || !friend) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.friendRequests.includes(friend._id)) {
      user.friends.push(friend._id);
      user.friendRequests.pull(friend._id);
      friend.friendRequests.pull(user._id);
      friend.friends.push(user._id);
      await user.save();
      await friend.save();
    }

    res.status(200).json({ message: "Friend request accepted" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Reject friend request
router.post("/reject-friend-request/:userId/:friendId", async (req, res) => {
  console.log("REJECTING FRIEND REQUEST");
  try {
    const user = await User.findById(req.params.userId);
    const friend = await User.findById(req.params.friendId);
    if (!user || !friend) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.friendRequests.includes(friend._id)) {
      user.friendRequests.pull(friend._id);
      await user.save();
    }

    res.status(200).json({ message: "Friend request rejected" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// CHAT ROUTES _________________________________________________________________
// Create a new chat room
router.post("/create-chat-room/:userId/:friendId", async (req, res) => {
  console.log("CREATING CHAT ROOM");
  try {
    const user = await User.findById(req.params.userId);
    const friend = await User.findById(req.params.friendId);

    if (!user || !friend) {
      return res.status(404).json({ message: "User not found" });
    }

    const existingChatRoom = await Chat.findOne({
      participants: { $all: [user._id, friend._id] },
    });

    if (existingChatRoom) {
      return res.status(200).json({ chatId: existingChatRoom._id });
    }

    const newChatRoom = new Chat({ participants: [user._id, friend._id] });
    await newChatRoom.save();

    user.chatRooms.push(newChatRoom._id);
    friend.chatRooms.push(newChatRoom._id);
    await user.save();
    await friend.save();

    res.status(201).json({ chatId: newChatRoom._id });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Send a message in a chat room
router.post("/send-message/:userId/:chatId", async (req, res) => {
  console.log("SENDING MESSAGE");
  try {
    const { content } = req.body;

    const user = await User.findById(req.params.userId);
    const chat = await Chat.findById(req.params.chatId);

    if (!user || !chat) {
      return res.status(404).json({ message: "User or chat not found" });
    }

    if (!chat.participants.includes(user._id)) {
      return res.status(403).json({ message: "User not in the chat room" });
    }

    chat.messages.push({ sender: user._id, content });
    await chat.save();

    res.status(201).json({ message: "Message sent" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Get the chat history for a specific chat room
router.get("/get-chat-history/:userId/:chatId", async (req, res) => {
  console.log("GETTING CHAT HISTORY");
  try {
    const user = await User.findById(req.params.userId);
    const chat = await Chat.findById(req.params.chatId).populate("messages.sender");

    if (!user || !chat) {
      return res.status(404).json({ message: "User or chat not found" });
    }

    if (!chat.participants.includes(user._id)) {
      return res.status(403).json({ message: "User not in the chat room" });
    }

    res.status(200).json(chat.messages);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
