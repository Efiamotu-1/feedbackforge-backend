const express = require('express');

const app = express();

const userRoute = require('./routes/userRoute');
const feedbackRoute = require('./routes/feebackRoute');

app.use(express.json());

app.use('/api/v1/users', userRoute)
app.use('/api/v1/feedbacks', feedbackRoute)

module.exports = app;