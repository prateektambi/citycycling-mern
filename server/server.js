const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const config = require('./config');

const app = express();
const port = config.PORT || 5000;

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

// Routes
const seedRoutes = require('./routes/seed');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/order');
const authRoutes = require('./routes/authRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/seed', seedRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);

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
