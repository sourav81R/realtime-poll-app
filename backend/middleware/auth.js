const jwt = require("jsonwebtoken");
const User = require("../models/User");

const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const bearerToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;
    const token = bearerToken || req.headers["x-auth-token"];

    if (!token) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
    let role = decoded.role;
    const userId = decoded.id;

    // Backward compatibility for tokens created before `role` was added.
    if (!role) {
      const user = await User.findById(userId).select("role");
      if (!user) {
        return res.status(401).json({ message: "Invalid or expired token" });
      }
      role = user.role || "user";
    }

    req.user = {
      id: userId,
      role,
    };

    // Track authenticated user activity while keeping request flow resilient.
    try {
      const now = new Date();
      const cutoff = new Date(now.getTime() - 60 * 1000);
      await User.updateOne(
        {
          _id: userId,
          $or: [{ lastActiveAt: { $exists: false } }, { lastActiveAt: { $lt: cutoff } }],
        },
        { $set: { lastActiveAt: now } }
      );
    } catch (_error) {
      // Do not block protected routes if activity tracking fails.
    }

    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = auth;
