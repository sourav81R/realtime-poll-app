require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const passport = require("passport");

const connectDB = require("./config/db");
const configurePassport = require("./config/passport");
require("./models/Poll");
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

app.get("/", (_req, res) => {
  res.send("API Running...");
});

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.set("io", io);

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
  socket.on("join_poll", (id) => socket.join(id));
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
