const express = require('express');
const {
  getMemberDashboard,
  getMemberEvents,
  getMemberSongRequests
} = require('../controllers/memberController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require member access
router.use(protect, authorize('Member'));

router.get('/dashboard', getMemberDashboard);
router.get('/events', getMemberEvents);
router.get('/song-requests', getMemberSongRequests);

module.exports = router;