const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require("passport");
const User = require('../models/User');

const buildNameFromUsername = (username) => {
  if (!username) return "User";
  const source = username.includes("@") ? username.split("@")[0] : username;
  return source
    .replace(/[._-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const normalizeEmail = (email) => (email || "").trim().toLowerCase();

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!name || !normalizedEmail || !password) {
      return res.status(400).json({ message: 'All fields required' });
    }

    const existingUser = await User.findOne({ username: normalizedEmail });
    if (existingUser) return res.status(400).json({ message: 'Email already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      name: name.trim(),
      username: normalizedEmail,
      password: hashedPassword,
    });
    await user.save();

    res.status(201).json({ message: 'User created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, username, password } = req.body;
    const loginEmail = normalizeEmail(email || username);

    if (!loginEmail || !password) {
      return res.status(400).json({ message: 'All fields required' });
    }

    const user = await User.findOne({ username: loginEmail });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });
    res.json({
      token,
      username: user.username,
      name: user.name || buildNameFromUsername(user.username),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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
      const token = jwt.sign(
        { id: req.user._id },
        process.env.JWT_SECRET || "secret",
        { expiresIn: "1h" }
      );

      const redirectBase = process.env.CLIENT_URL || "http://localhost:5173";
      const redirectUrl =
        `${redirectBase}/login?token=${encodeURIComponent(token)}` +
        `&username=${encodeURIComponent(req.user.username)}` +
        `&name=${encodeURIComponent(req.user.name || buildNameFromUsername(req.user.username))}`;

      res.redirect(redirectUrl);
    } catch (err) {
      res.redirect(
        `${process.env.CLIENT_URL || "http://localhost:5173"}/login?error=google_auth_failed`
      );
    }
  }
);

module.exports = router;
