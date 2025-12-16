const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password)
    return res.status(400).json({ message: 'Username & password required' });

  const hashedPassword = await bcrypt.hash(password, 10);

  db.query(
    'INSERT INTO users (username, password) VALUES (?, ?)',
    [username, hashedPassword],
    (err) => {
      if (err) return res.status(500).json({ message: 'Error registering user' });
      res.status(201).json({ message: 'User registered successfully' });
    }
  );
});

// Login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  db.query(
    'SELECT * FROM users WHERE username = ?',
    [username],
    async (err, results) => {
      if (err) return res.status(500).json({ message: 'Error logging in' });
      if (results.length === 0) return res.status(401).json({ message: 'Invalid credentials' });

      const user = results[0];
      const match = await bcrypt.compare(password, user.password);

      if (!match) return res.status(401).json({ message: 'Invalid credentials' });

      req.session.user = { id: user.id, username: user.username };
      res.json({ message: 'Login successful' });
    }
  );
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ message: 'Logged out successfully' });
  });
});

module.exports = router;





   