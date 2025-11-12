const dotenv = require('dotenv')
dotenv.config({path: './config.env'})
const mongoose = require('mongoose');
const app = require('./app');

const PORT = process.env.PORT || 3000;

const DB = process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD)


mongoose.connect(DB, {
  useNewUrlParser: true,
  useCreateIndex: true,
  useFindAndModify: false
}).then(() => {
  console.log('ff DB connection successful!')
})


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});