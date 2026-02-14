const passport = require("passport");
const bcrypt = require("bcryptjs");
const { Strategy: GoogleStrategy } = require("passport-google-oauth20");
const User = require("../models/User");

const buildNameFromUsername = (username) => {
  if (!username) return "User";
  const source = username.includes("@") ? username.split("@")[0] : username;
  return source
    .replace(/[._-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const configurePassport = () => {
  const clientID = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const callbackURL =
    process.env.GOOGLE_CALLBACK_URL ||
    "http://localhost:5000/auth/google/callback";

  if (!clientID || !clientSecret) {
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID,
        clientSecret,
        callbackURL,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          const fallbackUsername = `google_${profile.id}`;
          const username = email || fallbackUsername;
          const googleName = profile.displayName || buildNameFromUsername(username);

          let user = await User.findOne({ username });
          if (!user) {
            const generatedPassword = await bcrypt.hash(
              `${profile.id}_${Date.now()}`,
              10
            );
            user = await User.create({
              name: googleName,
              username,
              password: generatedPassword,
            });
          } else if (!user.name && googleName) {
            user.name = googleName;
            await user.save();
          }

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );
};

module.exports = configurePassport;
