const express = require('express');
const {
  getAdminDashboard,
  getAllManagers,
  getSystemAnalytics
} = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// All routes require admin access
router.use(protect, adminOnly);

router.get('/dashboard', getAdminDashboard);
router.get('/managers', getAllManagers);
router.get('/analytics', getSystemAnalytics);

module.exports = router;