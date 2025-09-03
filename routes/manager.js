const express = require('express');
const {
  getManagerDashboard,
  getManagerEvents,
  getEventAnalytics
} = require('../controllers/managerController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require manager access
router.use(protect, authorize('Manager', 'Admin'));

router.get('/dashboard', getManagerDashboard);
router.get('/events', getManagerEvents);
router.get('/events/:id/analytics', getEventAnalytics);

module.exports = router;