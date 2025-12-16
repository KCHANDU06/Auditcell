const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { auth } = require('../middleware/auth');

// Public routes
router.post('/login', userController.login);
router.post('/register', userController.register);
router.post('/send-otp', userController.sendOTP);
router.post('/verify-otp', userController.verifyOTP);

// Protected routes (require authentication)
router.post('/logout', auth, userController.logout);
router.get('/profile', auth, userController.getProfile);
router.post('/update-password', auth, userController.updatePassword);

module.exports = router;