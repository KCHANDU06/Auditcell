const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { pool } = require('../config/database');

// Initialize nodemailer transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  requireTLS: true
});

// Generate OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// OTP storage (in production, use Redis or database)
const otpStore = new Map();

const userController = {
  // Login user
  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }

      // Get user from database
      const [users] = await pool.query(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );

      if (users.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'Email not found'
        });
      }

      const user = users[0];

      // Check password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid password'
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Save session
      await pool.query(
        'INSERT INTO sessions (id, userId, token, expires) VALUES (UUID(), ?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))',
        [user.id, token]
      );

      // Update last login
      await pool.query(
        'UPDATE users SET lastLogin = NOW() WHERE id = ?',
        [user.id]
      );

      res.json({
        success: true,
        message: 'Login successful',
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        },
        role: user.role,
        token
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Error during login'
      });
    }
  },

  // Register user
  async register(req, res) {
    try {
      const { name, email, password } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({
          success: false,
          message: 'All fields are required'
        });
      }

      // Check if email exists
      const [existingUsers] = await pool.query(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );

      if (existingUsers.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Email is already registered'
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Determine role
      const adminEmails = ['gugulothusai877@gmail.com', 'cm6@gmail.com'];
      const inspectEmails = ['ganesh123@gmail.com'];
      let role = 'user';

      if (adminEmails.includes(email)) role = 'admin';
      else if (inspectEmails.includes(email)) role = 'inspect';

      // Insert user
      const [result] = await pool.query(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
        [name, email, hashedPassword, role]
      );

      res.status(201).json({
        success: true,
        message: `Registered successfully as ${role}!`
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Error during registration'
      });
    }
  },

  // Send OTP
  async sendOTP(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required'
        });
      }

      // Check if email exists
      const [users] = await pool.query(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );

      if (users.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Email is already registered'
        });
      }

      // Generate and store OTP
      const otp = generateOTP();
      otpStore.set(email, {
        otp,
        expires: Date.now() + 5 * 60 * 1000 // 5 minutes
      });

      // Send OTP email
      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: email,
        subject: 'OTP for Academic Audit System',
        text: `Your OTP for registration is: ${otp}. It will expire in 5 minutes.`
      });

      res.json({
        success: true,
        message: 'OTP sent successfully'
      });
    } catch (error) {
      console.error('Send OTP error:', error);
      res.status(500).json({
        success: false,
        message: 'Error sending OTP'
      });
    }
  },

  // Verify OTP
  async verifyOTP(req, res) {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        return res.status(400).json({
          success: false,
          message: 'Email and OTP are required'
        });
      }

      const record = otpStore.get(email);
      if (!record || record.otp !== otp || Date.now() > record.expires) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired OTP'
        });
      }

      // Remove OTP from store
      otpStore.delete(email);

      res.json({
        success: true,
        message: 'OTP verified successfully!'
      });
    } catch (error) {
      console.error('Verify OTP error:', error);
      res.status(500).json({
        success: false,
        message: 'Error verifying OTP'
      });
    }
  },

  // Logout user
  async logout(req, res) {
    try {
      // Remove session
      await pool.query(
        'DELETE FROM sessions WHERE userId = ? AND token = ?',
        [req.user.id, req.token]
      );

      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Error during logout'
      });
    }
  },

  // Get user profile
  async getProfile(req, res) {
    try {
      const [user] = await pool.query(
        'SELECT id, name, email, role, lastLogin, createdAt FROM users WHERE id = ?',
        [req.user.id]
      );

      res.json({
        success: true,
        user: user[0]
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching profile'
      });
    }
  },

  // Update password
  async updatePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current and new password are required'
        });
      }

      // Get user with password
      const [users] = await pool.query(
        'SELECT * FROM users WHERE id = ?',
        [req.user.id]
      );

      const user = users[0];

      // Verify current password
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await pool.query(
        'UPDATE users SET password = ? WHERE id = ?',
        [hashedPassword, req.user.id]
      );

      res.json({
        success: true,
        message: 'Password updated successfully'
      });
    } catch (error) {
      console.error('Update password error:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating password'
      });
    }
  }
};

module.exports = userController;