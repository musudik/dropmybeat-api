const express = require('express');
const {
  getSongRequests,
  getSongRequest,
  createSongRequest,
  updateSongRequest,
  deleteSongRequest,
  toggleLike,
  approveSongRequest,
  rejectSongRequest,
  getEventQueue,
  getTimeBombs,
  getEventStats
} = require('../controllers/songRequestController');

const { protect, authorize, optionalAuth, isEventManagerOrAdmin } = require('../middleware/auth');
const {
  validateSongRequest,
  validateSongRequestUpdate,
  validateObjectId,
  validatePagination
} = require('../middleware/validation');

const router = express.Router({ mergeParams: true });

// Public/Protected routes (depending on event visibility)
router.route('/')
  .get(optionalAuth, validatePagination, getSongRequests)
  .post(protect, validateSongRequest, createSongRequest);

router.route('/:id')
  .get(optionalAuth, validateObjectId('id'), getSongRequest)
  .put(protect, validateObjectId('id'), validateSongRequestUpdate, updateSongRequest)
  .delete(protect, validateObjectId('id'), deleteSongRequest);

// Song interaction routes
router.post('/:id/like', protect, validateObjectId('id'), toggleLike);

// Manager-only routes
router.post('/:id/approve', 
  protect, 
  isEventManagerOrAdmin, 
  validateObjectId('id'), 
  approveSongRequest
);

router.post('/:id/reject', 
  protect, 
  isEventManagerOrAdmin, 
  validateObjectId('id'), 
  rejectSongRequest
);

// Event-specific routes
router.get('/queue', optionalAuth, getEventQueue);
router.get('/timebombs', protect, isEventManagerOrAdmin, getTimeBombs);
router.get('/stats', protect, isEventManagerOrAdmin, getEventStats);

module.exports = router;