const dotenv = require('dotenv');
dotenv.config({ path: './config.env' });
const mongoose = require('mongoose');
const app = require('./app');


const PORT = process.env.PORT || 3000;

// Replace <PASSWORD> placeholder dynamically
const DB = process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD);

// Connect to MongoDB
mongoose.connect(DB, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('✅ FeedbackForge DB connection successful!'))
  .catch((err) => console.error('❌ DB connection error:', err));

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}...`);
});
