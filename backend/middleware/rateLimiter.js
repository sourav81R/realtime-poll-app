const rateLimit = require("express-rate-limit");

const createPollLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 create requests per windowMs
  message: { message: "Too many polls created from this IP, please try again later." },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

const voteLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 40, // Limit each IP to 40 vote requests per minute
  message: { message: "Too many vote attempts from this IP, please try again shortly." },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  createPollLimiter,
  voteLimiter,
};
