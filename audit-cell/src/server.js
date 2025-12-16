const express = require('express');
const cors = require('cors');
const { testConnection } = require('./config/database');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`📩 ${req.method} request received at ${req.url}`);
  if (Object.keys(req.body).length > 0) {
    console.log('🧾 Request Body:', req.body);
  }
  next();
});

// Import routes
const userRoutes = require('./routes/userRoutes');

// Use routes
app.use('/api/users', userRoutes);

// Root route
app.get('/', (req, res) => {
  res.send('✅ Academic Audit System API is running');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Start server
async function startServer() {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      throw new Error('Database connection failed');
    }

    // Start server
    app.listen(PORT, () => {
      console.log(`✅ Academic Audit System Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Server startup error:', error);
    process.exit(1);
  }
}

startServer();