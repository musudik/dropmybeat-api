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
  getEventStats,
  markSongAsPlayed,
  removeSongFromList
} = require('../controllers/songRequestController');

const { 
  protect, 
  optionalAuth, 
  eventParticipantAccess,
  managerEventAccess
} = require('../middleware/auth');
const {
  validateSongRequest,
  validateSongRequestUpdate,
  validateObjectId,
  validatePagination
} = require('../middleware/validation');

const router = express.Router({ mergeParams: true });

// Grant access to specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`
      });
    }
    next();
  };
};

// Public/Protected routes (Members and Guests who joined events)
router.route('/')
  .get(optionalAuth, validatePagination, getSongRequests)
  .post(protect, eventParticipantAccess, validateSongRequest, createSongRequest);

router.route('/:id')
  .get(optionalAuth, validateObjectId('id'), getSongRequest)
  .put(protect, eventParticipantAccess, validateObjectId('id'), validateSongRequestUpdate, updateSongRequest)
  .delete(protect, eventParticipantAccess, validateObjectId('id'), deleteSongRequest);

// Song interaction routes (Members and Guests who joined events)
router.post('/:id/like', protect, eventParticipantAccess, validateObjectId('id'), toggleLike);

// Manager-only routes
router.post('/:id/approve', 
  protect, 
  managerEventAccess, 
  validateObjectId('id'), 
  approveSongRequest
);

router.post('/:id/reject', 
  protect, 
  managerEventAccess, 
  validateObjectId('id'), 
  rejectSongRequest
);

// Event management routes (Manager/Admin only)
router.get('/queue', optionalAuth, getEventQueue);
router.get('/timebombs', protect, managerEventAccess, getTimeBombs);
router.get('/stats', protect, managerEventAccess, getEventStats);

// Mark song as played (Admin/Manager only)
router.put('/:eventId/song-requests/:id/mark-played', 
  protect, 
  authorize('Admin', 'Manager'), 
  markSongAsPlayed
);

// Remove song from list (Admin/Manager only)
router.delete('/:eventId/song-requests/:id/remove', 
  protect, 
  authorize('Admin', 'Manager'), 
  removeSongFromList
);

module.exports = router;