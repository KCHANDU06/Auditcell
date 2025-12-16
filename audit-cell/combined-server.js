const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 8080;

// Define frontend directory path
const frontendPath = path.join(__dirname, '..', 'front');

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(cors({
    origin: ['http://localhost:8080', 'http://127.0.0.1:8080'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Serve static files from the frontend directory
app.use(express.static(frontendPath));

// Default route serves index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// Database connection
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'auditcell_db'
});

db.connect(err => {
    if (err) {
        console.error('❌ Database connection failed:', err);
        console.log('⚠️ Please ensure MySQL is running and database exists');
    } else {
        console.log('✅ Database Connected Successfully!');
    }
});

// Import all routes from server.js
const mainServer = require('./server.js');
app.use('/', mainServer);

// Start server
app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
    console.log('🌐 Access the application at:');
    console.log(`   - Frontend: http://localhost:${PORT}`);
    console.log(`   - API: http://localhost:${PORT}/api`);
    console.log(`   - Login page: http://localhost:${PORT}/login.html`);
});