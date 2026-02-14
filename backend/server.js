require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const passport = require("passport");

const connectDB = require("./config/db");
const configurePassport = require("./config/passport");
require("./models/Poll"); // Register the Poll model
const pollRoutes = require("./routes/pollRoutes");
const authRoutes = require("./routes/authRoutes");

connectDB();
configurePassport();

const app = express();
app.use(cors());
app.use(express.json());
app.use(passport.initialize());

app.use("/api/polls", pollRoutes);
app.use("/api/auth", authRoutes);
app.use("/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("API Running...");
});

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join_poll", (id) => {
    socket.join(id);
  });

  socket.on("vote", async ({ pollId, optionIndex }) => {
    try {
      const Poll = mongoose.model("Poll");
      const poll = await Poll.findById(pollId);
      if (!poll) return;

      // Fairness Control #2: IP Address Check
      // Use x-forwarded-for header to get real IP if behind a proxy (like Render)
      const forwarded = socket.handshake.headers['x-forwarded-for'];
      const ip = forwarded ? forwarded.split(',')[0] : socket.handshake.address;

      if (poll.voters && poll.voters.includes(ip)) {
        socket.emit("error", "You have already voted from this IP address.");
        return;
      }

      if (poll.options[optionIndex]) {
        poll.options[optionIndex].votes += 1;
        poll.voters.push(ip);
        await poll.save();
        
        const pollData = poll.toObject();
        delete pollData.voters;
        console.log(`🗳️  Vote received for poll ${pollId}. Broadcasting update.`);
        io.to(pollId).emit("update_poll", pollData);
      }
    } catch (err) {
      console.error("Vote error:", err);
    }
  });
});

server.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);
