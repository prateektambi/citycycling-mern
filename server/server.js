const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
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

// Routes
const seedRoutes = require('./routes/seed');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/order');
app.use('/api/seed', seedRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
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
    const newUser = new User({ name: 'John Doe1' });
    await newUser.save();
    res.status(201).json(newUser);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


if (process.env.NODE_ENV === 'production') {
  // Static files middleware (must come before the catch-all route)
  app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));

  // Use /{*splat} to catch all routes including the root (/)
  app.get('/{*splat}', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
  });
}

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
