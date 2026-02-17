const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const User = require("../models/User");
const Poll = require("../models/Poll");
const Vote = require("../models/Vote");
const auth = require("../middleware/auth");

const router = express.Router();

const DEFAULT_ADMIN_EMAIL = "souravchowdhury0203@gmail.com";
const DEFAULT_ADMIN_PASSWORD = "Sourav@123";

const buildNameFromUsername = (username) => {
  if (!username) return "User";
  const source = username.includes("@") ? username.split("@")[0] : username;
  return source
    .replace(/[._-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const normalizeEmail = (email) => (email || "").trim().toLowerCase();

const getAdminCredentials = () => ({
  adminEmail: normalizeEmail(process.env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL),
  adminPassword: process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD,
});

const signToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role || "user",
    },
    process.env.JWT_SECRET || "secret",
    { expiresIn: "1h" }
  );
};

const buildAuthResponse = (user, token, message) => ({
  token,
  username: user.username,
  name: user.name || buildNameFromUsername(user.username),
  role: user.role || "user",
  ...(message ? { message } : {}),
});

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }

  next();
};

const ensureAdminUser = async ({ adminEmail, adminPassword }) => {
  let user = await User.findOne({ username: adminEmail });

  if (!user) {
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    user = await User.create({
      name: buildNameFromUsername(adminEmail),
      username: adminEmail,
      password: hashedPassword,
      role: "admin",
    });
    return user;
  }

  let shouldSave = false;

  if (user.role !== "admin") {
    user.role = "admin";
    shouldSave = true;
  }

  if (!user.name) {
    user.name = buildNameFromUsername(adminEmail);
    shouldSave = true;
  }

  let passwordMatches = false;
  if (typeof user.password === "string" && user.password.trim()) {
    passwordMatches = await bcrypt.compare(adminPassword, user.password);
  }

  if (!passwordMatches) {
    user.password = await bcrypt.hash(adminPassword, 10);
    shouldSave = true;
  }

  if (shouldSave) {
    await user.save();
  }

  return user;
};

const deleteUserWithRelatedData = async (userId) => {
  const ownedPollIds = await Poll.find({ createdBy: userId }).distinct("_id");

  const operations = [
    Vote.deleteMany({ userId }),
    Poll.deleteMany({ createdBy: userId }),
    User.deleteOne({ _id: userId }),
  ];

  if (ownedPollIds.length > 0) {
    operations.push(Vote.deleteMany({ pollId: { $in: ownedPollIds } }));
  }

  await Promise.all(operations);
};

const clearNonAdminUsers = async () => {
  const usersToDelete = await User.find({ role: { $ne: "admin" } }).select("_id");
  if (usersToDelete.length === 0) {
    return 0;
  }

  const userIds = usersToDelete.map((user) => user._id);
  const ownedPollIds = await Poll.find({ createdBy: { $in: userIds } }).distinct("_id");

  const operations = [
    Vote.deleteMany({ userId: { $in: userIds } }),
    Poll.deleteMany({ createdBy: { $in: userIds } }),
    User.deleteMany({ _id: { $in: userIds } }),
  ];

  if (ownedPollIds.length > 0) {
    operations.push(Vote.deleteMany({ pollId: { $in: ownedPollIds } }));
  }

  await Promise.all(operations);
  return userIds.length;
};

const markLoginActivity = async (user) => {
  if (!user) return;
  const now = new Date();
  user.lastLoginAt = now;
  user.lastActiveAt = now;
  await user.save();
};

// Register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const normalizedName = (name || "").trim();

    if (!normalizedName || !normalizedEmail || !password) {
      return res.status(400).json({ message: "All fields required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const existingUser = await User.findOne({ username: normalizedEmail });
    if (existingUser) return res.status(400).json({ message: "Email already exists" });

    const { adminEmail, adminPassword } = getAdminCredentials();
    const role =
      normalizedEmail === adminEmail && password === adminPassword ? "admin" : "user";

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      name: normalizedName,
      username: normalizedEmail,
      password: hashedPassword,
      role,
      lastLoginAt: new Date(),
      lastActiveAt: new Date(),
    });
    await user.save();

    const token = signToken(user);

    res.status(201).json(buildAuthResponse(user, token, "User created"));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, username, password } = req.body;
    const loginEmail = normalizeEmail(email || username);

    if (!loginEmail || !password) {
      return res.status(400).json({ message: "All fields required" });
    }

    const { adminEmail, adminPassword } = getAdminCredentials();
    if (loginEmail === adminEmail && password === adminPassword) {
      const adminUser = await ensureAdminUser({ adminEmail, adminPassword });
      await markLoginActivity(adminUser);
      const adminToken = signToken(adminUser);
      return res.json(buildAuthResponse(adminUser, adminToken));
    }

    const user = await User.findOne({ username: loginEmail });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    await markLoginActivity(user);
    const token = signToken(user);
    res.json(buildAuthResponse(user, token));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get(
  "/admin/users",
  auth,
  requireAdmin,
  async (_req, res) => {
    try {
      const users = await User.find()
        .select("_id name username role createdAt lastLoginAt lastActiveAt")
        .sort({ role: 1, username: 1 });

      return res.json({ users });
    } catch (err) {
      return res.status(500).json({ message: err.message || "Failed to fetch users" });
    }
  }
);

router.delete(
  "/admin/users/:id",
  auth,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid user id" });
      }

      const user = await User.findById(id).select("_id role");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.role === "admin") {
        return res.status(403).json({ message: "Admin users cannot be deleted" });
      }

      await deleteUserWithRelatedData(user._id);
      return res.json({ message: "User deleted successfully" });
    } catch (err) {
      return res.status(500).json({ message: err.message || "Failed to delete user" });
    }
  }
);

router.delete(
  "/admin/users",
  auth,
  requireAdmin,
  async (_req, res) => {
    try {
      const deletedUsers = await clearNonAdminUsers();
      return res.json({
        message: "All non-admin users deleted successfully",
        deletedUsers,
      });
    } catch (err) {
      return res.status(500).json({ message: err.message || "Failed to clear users" });
    }
  }
);

router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${process.env.CLIENT_URL || "http://localhost:5173"}/login?error=google_auth_failed`,
  }),
  async (req, res) => {
    try {
      await markLoginActivity(req.user);
      const token = signToken(req.user);

      const redirectBase = process.env.CLIENT_URL || "http://localhost:5173";
      const redirectUrl =
        `${redirectBase}/login?token=${encodeURIComponent(token)}` +
        `&username=${encodeURIComponent(req.user.username)}` +
        `&name=${encodeURIComponent(req.user.name || buildNameFromUsername(req.user.username))}` +
        `&role=${encodeURIComponent(req.user.role || "user")}`;

      res.redirect(redirectUrl);
    } catch (err) {
      res.redirect(
        `${process.env.CLIENT_URL || "http://localhost:5173"}/login?error=google_auth_failed`
      );
    }
  }
);

module.exports = router;
