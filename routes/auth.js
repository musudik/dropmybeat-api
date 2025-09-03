const express = require('express');
const {
  register,
  login,
  getMe,
  guestLogin,
  updateProfile,
  changePassword,
  logout
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const {
  validateRegistration,
  validateLogin,
  validateProfileUpdate,
  validatePasswordChange,
  handleValidationErrors
} = require('../middleware/validation');

const router = express.Router();

// Public routes
router.post('/register', validateRegistration, handleValidationErrors, register);
router.post('/login', validateLogin, handleValidationErrors, login);
router.post('/guest-login', guestLogin);

// Protected routes
router.get('/me', protect, getMe);
router.put('/profile', protect, validateProfileUpdate, handleValidationErrors, updateProfile);
router.put('/change-password', protect, validatePasswordChange, handleValidationErrors, changePassword);
router.post('/logout', protect, logout);

module.exports = router;