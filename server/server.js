const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const config = require('./config');

const app = express();
const port = config.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(config.MONGODB_URI);
const connection = mongoose.connection;
connection.once('open', () => {
  console.log('MongoDB database connection established successfully');
});
connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
  process.exit();
});

// Basic User model for testing
const userSchema = new mongoose.Schema({
  name: String
});
const User = mongoose.model('User', userSchema);

// Basic route
app.get('/', (req, res) => {
  res.send('Hello from the CityCycling backend!');
});

// Test DB route
app.get('/users', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/add-user', async (req, res) => {
  try {
    const newUser = new User({ name: 'John Doe' });
    await newUser.save();
    res.status(201).json(newUser);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
