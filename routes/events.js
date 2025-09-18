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
  joinEventAsGuest,
  getEventGuestMembers,
  leaveEvent,
  getEventParticipants,
  uploadEventLogo,
  uploadEventBanner,
  getEventLogo,
  getEventBanner,
  deleteEventLogo,
  deleteEventBanner
} = require('../controllers/eventController');
const { createSongRequest } = require('../controllers/songRequestController');
const {
  getEventFeedback,
  createEventFeedback,
  getFeedback,
  approveFeedback,
  deleteFeedback,
  getFeedbackStats
} = require('../controllers/eventFeedbackController');
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
  validateFeedbackPagination,
  validateSongRequest,
  validateEventFeedback,
  validateFeedbackApproval,
  handleValidationErrors
} = require('../middleware/validation');
const { upload } = require('../middleware/upload');

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
  .post(protect, authorize('Manager', 'Admin', 'Member'), validateObjectId('id'), handleValidationErrors, joinEvent);

// Guest join route (no authentication required)
router
  .route('/:id/join-guest')
  .post(validateObjectId('id'), handleValidationErrors, joinEventAsGuest);

router
  .route('/:id/leave')
  .post(protect, authorize('Manager', 'Admin', 'Member'), validateObjectId('id'), handleValidationErrors, leaveEvent);

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

// Image upload routes
router.post('/:id/upload-logo', protect, upload.single('logo'), uploadEventLogo);
router.post('/:id/upload-banner', protect, upload.single('banner'), uploadEventBanner);
router.get('/:id/logo', getEventLogo);
router.get('/:id/banner', getEventBanner);
router.delete('/:id/logo', protect, deleteEventLogo);
router.delete('/:id/banner', protect, deleteEventBanner);

// Event Feedback routes (Public access - no authentication required)
router
  .route('/:eventId/feedback')
  .get(validateObjectId('eventId'), validateFeedbackPagination, handleValidationErrors, getEventFeedback)
  .post(validateObjectId('eventId'), validateEventFeedback, handleValidationErrors, createEventFeedback);

router
  .route('/:eventId/feedback/stats')
  .get(validateObjectId('eventId'), handleValidationErrors, getFeedbackStats);

router
  .route('/:eventId/feedback/:id')
  .get(validateObjectId('eventId'), validateObjectId('id'), handleValidationErrors, getFeedback)
  .delete(protect, managerEventAccess, validateObjectId('eventId'), validateObjectId('id'), handleValidationErrors, deleteFeedback);

router
  .route('/:eventId/feedback/:id/approve')
  .put(protect, managerEventAccess, validateObjectId('eventId'), validateObjectId('id'), handleValidationErrors, approveFeedback);

module.exports = router;