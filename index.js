const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Import the API routes
const apiRoutes = require("./routes/api");

// Define routes
app.use("/api", apiRoutes);

// Define routes
app.get("/", (req, res) => {
  res.send("Welcome to PoopMates server!");
});

// Add your routes here

// Start the server
const port = process.env.PORT || 3030;
app.listen(port, () => console.log(`Server running on port ${port}`));
