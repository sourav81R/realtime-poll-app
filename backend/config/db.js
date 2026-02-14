const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Use 127.0.0.1 to avoid issues with localhost resolution on some systems
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pollroom');
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    console.error("Please ensure MongoDB is running locally on port 27017");
    process.exit(1);
  }
};

module.exports = connectDB;