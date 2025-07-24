const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Hardcode URI langsung
    await mongoose.connect('mongodb://localhost:27017/bapdb', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};

module.exports = connectDB; 