const { body, param, query, validationResult } = require('express-validator');

// Handle validation errors
exports.handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Authentication validations
exports.validateRegistration = [
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('role')
    .optional()
    .isIn(['Admin', 'Manager', 'Member'])
    .withMessage('Role must be Admin, Manager, or Member')
];

exports.validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

exports.validateProfileUpdate = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('phoneNumber')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  body('dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid date of birth')
];

exports.validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number')
];

// Person management validations
exports.validatePersonCreation = [
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('role')
    .isIn(['Admin', 'Manager', 'Member'])
    .withMessage('Role must be Admin, Manager, or Member'),
  body('phoneNumber')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  body('dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid date of birth')
];

exports.validatePersonUpdate = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('role')
    .optional()
    .isIn(['Admin', 'Manager', 'Member'])
    .withMessage('Role must be Admin, Manager, or Member'),
  body('phoneNumber')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  body('dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid date of birth'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value')
];

// Event validations
exports.validateEventCreation = [
  body('name')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Event name must be between 3 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  body('startTime')
    .isISO8601()
    .withMessage('Please provide a valid start time'),
  body('endTime')
    .isISO8601()
    .withMessage('Please provide a valid end time')
    .custom((endTime, { req }) => {
      if (new Date(endTime) <= new Date(req.body.startTime)) {
        throw new Error('End time must be after start time');
      }
      return true;
    }),
  body('location')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Location cannot exceed 200 characters'),
  body('maxMembers')
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage('Max Members must be between 1 and 10000'),
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean value'),
  body('allowSongRequests')
    .optional()
    .isBoolean()
    .withMessage('allowSongRequests must be a boolean value'),
  body('timeBombEnabled')
    .optional()
    .isBoolean()
    .withMessage('timeBombEnabled must be a boolean value'),
  body('timeBombDuration')
    .optional()
    .isInt({ min: 30, max: 3600 })
    .withMessage('TimeBomb duration must be between 30 and 3600 seconds')
];

exports.validateEventUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Event name must be between 3 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  body('startTime')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid start time'),
  body('endTime')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid end time'),
  body('location')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Location cannot exceed 200 characters'),
  body('maxMembers')
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage('Max Members must be between 1 and 10000'),
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean value'),
  body('allowSongRequests')
    .optional()
    .isBoolean()
    .withMessage('allowSongRequests must be a boolean value'),
  body('timeBombEnabled')
    .optional()
    .isBoolean()
    .withMessage('timeBombEnabled must be a boolean value'),
  body('timeBombDuration')
    .optional()
    .isInt({ min: 30, max: 3600 })
    .withMessage('TimeBomb duration must be between 30 and 3600 seconds')
];

// Song request validations
exports.validateSongRequest = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Song title must be between 1 and 200 characters'),
  body('artist')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Artist name must be between 1 and 100 characters'),
  body('album')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Album name cannot exceed 100 characters'),
  body('genre')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Genre cannot exceed 50 characters'),
  body('duration')
    .optional()
    .isInt({ min: 1, max: 3600 })
    .withMessage('Duration must be between 1 and 3600 seconds'),
  body('spotifyId')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Spotify ID cannot exceed 100 characters'),
  body('youtubeId')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('YouTube ID cannot exceed 100 characters'),
  body('eventId')
    .isMongoId()
    .withMessage('Please provide a valid event ID')
];

// Add this missing validation function
exports.validateSongRequestUpdate = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Song title must be between 1 and 200 characters'),
  body('artist')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Artist name must be between 1 and 100 characters'),
  body('album')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Album name cannot exceed 100 characters'),
  body('genre')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Genre cannot exceed 50 characters'),
  body('duration')
    .optional()
    .isInt({ min: 1, max: 3600 })
    .withMessage('Duration must be between 1 and 3600 seconds'),
  body('spotifyId')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Spotify ID cannot exceed 100 characters'),
  body('youtubeId')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('YouTube ID cannot exceed 100 characters'),
  body('status')
    .optional()
    .isIn(['pending', 'approved', 'rejected', 'played'])
    .withMessage('Status must be pending, approved, rejected, or played'),
  body('priority')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Priority must be between 1 and 10')
];

// Common validations
exports.validateObjectId = (field) => [
  param(field)
    .isMongoId()
    .withMessage(`Please provide a valid ${field}`)
];

exports.validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('sort')
    .optional()
    .isIn(['createdAt', '-createdAt', 'name', '-name', 'startTime', '-startTime'])
    .withMessage('Invalid sort parameter')
];

// Event Feedback validations
exports.validateEventFeedback = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5 stars'),
  body('comment')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Comment must be between 10 and 1000 characters')
];

exports.validateFeedbackApproval = [
  body('isApproved')
    .isBoolean()
    .withMessage('isApproved must be a boolean value')
];

// Add a new validation function for feedback pagination
exports.validateFeedbackPagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('sort')
    .optional()
    .isIn(['newest', 'oldest', 'rating-high', 'rating-low', 'createdAt', '-createdAt'])
    .withMessage('Invalid sort parameter'),
  query('rating')
    .optional()
    .isIn(['1', '2', '3', '4', '5', 'all'])
    .withMessage('Rating must be 1-5 or "all"')
];