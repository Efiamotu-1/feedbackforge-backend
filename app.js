const express = require('express');
const cors = require('cors');
const app = express();

const userRoute = require('./routes/userRoute');
const feedbackRoute = require('./routes/feebackRoute');

const allowedOrigins = [
  'http://localhost:5173',
  'https://feedbackforge-frontend.vercel.app'
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json());


app.use('/api/v1/users', userRoute)
app.use('/api/v1/feedbacks', feedbackRoute)

module.exports = app;