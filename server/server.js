require('./tracing');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const config = require('./config');

const app = express();
const port = config.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '15mb' })); // raised for WhatsApp .txt export uploads (JSON)


// Fix for local DNS SRV resolution issues (ECONNREFUSED)
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

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
const itemRoutes = require('./routes/itemRoutes');
const testRoutes = require('./routes/testRoutes');
const userRoutes = require('./routes/userRoutes');
const shippingRoutes = require('./routes/shippingRoutes');
const cartRoutes = require('./routes/cartRoutes');
const aiRoutes = require('./routes/aiRoutes');
const whatsappRoutes = require('./routes/whatsappRoutes');
const cronService = require('./services/cronService');

app.use('/api/auth', authRoutes);
app.use('/api/seed', seedRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/users', userRoutes);
app.use('/api/shipping', shippingRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/ai/whatsapp', whatsappRoutes);

// Test routes (only in development)
if (process.env.NODE_ENV !== 'production') {
  app.use('/api/test', testRoutes);
  console.log('📧 Test email routes enabled at /api/test/email');
}

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
  // Initialize background scheduler
  cronService.initScheduler();
});
