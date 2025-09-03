const express = require('express');
const {
  getEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  activateEvent,
  deactivateEvent,
  joinEvent,
  leaveEvent,
  getEventParticipants,
  joinEventAsGuest,
  getEventGuestMembers
} = require('../controllers/eventController');
const { createSongRequest } = require('../controllers/songRequestController');
const { 
  protect, 
  authorize, 
  optionalAuth, 
  adminOnly,
  managerEventAccess,
  eventParticipantAccess
} = require('../middleware/auth');
const {
  validateEventCreation,
  validateEventUpdate,
  validateObjectId,
  validatePagination,
  validateSongRequest,
  handleValidationErrors
} = require('../middleware/validation');

const router = express.Router();

// Public routes (with optional authentication for role-based filtering)
router
  .route('/')
  .get(optionalAuth, validatePagination, handleValidationErrors, getEvents)
  .post(protect, authorize('Manager', 'Admin'), validateEventCreation, handleValidationErrors, createEvent);

router
  .route('/:id')
  .get(optionalAuth, validateObjectId('id'), handleValidationErrors, getEvent)
  .put(protect, managerEventAccess, validateObjectId('id'), validateEventUpdate, handleValidationErrors, updateEvent)
  .delete(protect, managerEventAccess, validateObjectId('id'), handleValidationErrors, deleteEvent);

// Event management routes (Manager/Admin only)
router
  .route('/:id/activate')
  .put(protect, managerEventAccess, validateObjectId('id'), handleValidationErrors, activateEvent);

router
  .route('/:id/deactivate')
  .put(protect, managerEventAccess, validateObjectId('id'), handleValidationErrors, deactivateEvent);

// Member management routes
router
  .route('/:id/join')
  .post(protect, authorize('Member'), validateObjectId('id'), handleValidationErrors, joinEvent);

// Guest join route (no authentication required)
router
  .route('/:id/join-guest')
  .post(validateObjectId('id'), handleValidationErrors, joinEventAsGuest);

router
  .route('/:id/leave')
  .post(protect, authorize('Member', 'Guest'), validateObjectId('id'), handleValidationErrors, leaveEvent);

// Participant viewing routes (Manager/Admin only)
router
  .route('/:id/Members')
  .get(protect, managerEventAccess, validateObjectId('id'), handleValidationErrors, getEventParticipants);

router
  .route('/:id/guest-Members')
  .get(protect, managerEventAccess, validateObjectId('id'), handleValidationErrors, getEventGuestMembers);

// Song request routes (Members and Guests who joined events)
router.post('/:eventId/song-requests', 
  protect, 
  eventParticipantAccess, 
  validateSongRequest, 
  handleValidationErrors, 
  createSongRequest
);

module.exports = router;