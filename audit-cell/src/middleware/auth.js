const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

const auth = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No authentication token found'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user exists and token is valid
    const [users] = await pool.query(
      'SELECT * FROM sessions WHERE userId = ? AND token = ? AND expires > NOW()',
      [decoded.id, token]
    );

    if (users.length === 0) {
      throw new Error('Invalid token');
    }

    // Get user details
    const [userRows] = await pool.query(
      'SELECT id, name, email, role FROM users WHERE id = ?',
      [decoded.id]
    );

    if (userRows.length === 0) {
      throw new Error('User not found');
    }

    // Attach user to request object
    req.user = userRows[0];
    req.token = token;

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Please authenticate',
      error: error.message
    });
  }
};

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }
  next();
};

// Middleware to check if user is inspector
const isInspector = (req, res, next) => {
  if (req.user.role !== 'inspect') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Inspector privileges required.'
    });
  }
  next();
};

// Middleware to check if user is admin or inspector
const isAdminOrInspector = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'inspect') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin or Inspector privileges required.'
    });
  }
  next();
};

module.exports = {
  auth,
  isAdmin,
  isInspector,
  isAdminOrInspector
};