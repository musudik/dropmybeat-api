const express = require('express');
const {
  getGuestDashboard,
  getGuestEvents,
  getGuestSongRequests
} = require('../controllers/guestController');
const { protect, authorize } = require('../middleware/auth');
const { getEvents } = require('../controllers/eventController');

const router = express.Router();

// All routes require guest access
router.use(protect, authorize('Guest'));

router.get('/dashboard', getGuestDashboard);
router.get('/events', getEvents); // Use main events controller instead
router.get('/song-requests', getGuestSongRequests);

module.exports = router;