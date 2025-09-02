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
  getEventGuestParticipants
} = require('../controllers/eventController');
const { protect, authorize, optionalAuth } = require('../middleware/auth');
const {
  validateEventCreation,
  validateEventUpdate,
  validateObjectId,
  validatePagination,
  handleValidationErrors
} = require('../middleware/validation');

const router = express.Router();

// Public routes (with optional authentication)
router
  .route('/')
  .get(optionalAuth, validatePagination, handleValidationErrors, getEvents)
  .post(protect, authorize('Manager', 'Admin'), validateEventCreation, handleValidationErrors, createEvent);

router
  .route('/:id')
  .get(optionalAuth, validateObjectId('id'), handleValidationErrors, getEvent)
  .put(protect, validateObjectId('id'), validateEventUpdate, handleValidationErrors, updateEvent)
  .delete(protect, validateObjectId('id'), handleValidationErrors, deleteEvent);

// Event management routes
router
  .route('/:id/activate')
  .put(protect, validateObjectId('id'), handleValidationErrors, activateEvent);

router
  .route('/:id/deactivate')
  .put(protect, validateObjectId('id'), handleValidationErrors, deactivateEvent);

// Participant management routes
router
  .route('/:id/join')
  .post(protect, validateObjectId('id'), handleValidationErrors, joinEvent);

// New guest join route (no authentication required)
router
  .route('/:id/join-guest')
  .post(validateObjectId('id'), handleValidationErrors, joinEventAsGuest);

router
  .route('/:id/leave')
  .post(protect, validateObjectId('id'), handleValidationErrors, leaveEvent);

router
  .route('/:id/participants')
  .get(protect, validateObjectId('id'), handleValidationErrors, getEventParticipants);

// New guest participants route
router
  .route('/:id/guest-participants')
  .get(protect, validateObjectId('id'), handleValidationErrors, getEventGuestParticipants);
module.exports = router;