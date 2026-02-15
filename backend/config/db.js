const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    // Use 127.0.0.1 to avoid issues with localhost resolution on some systems
    const conn = await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/pollroom"
    );
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);

    if (process.env.MONGODB_URI) {
      console.error("Check MONGODB_URI, network connectivity, and Atlas IP access list.");
    } else {
      console.error("Please ensure MongoDB is running locally on port 27017.");
    }

    process.exit(1);
  }
};

module.exports = connectDB;
