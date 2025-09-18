const EventFeedback = require('../models/EventFeedback');
const Event = require('../models/Event');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all feedback for an event
// @route   GET /api/events/:eventId/feedback
// @access  Public
exports.getEventFeedback = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;

  // Check if event exists
  const event = await Event.findById(req.params.eventId);
  if (!event) {
    return next(new ErrorResponse('Event not found', 404));
  }

  // Build query
  const query = { 
    event: req.params.eventId,
    isApproved: true 
  };

  // Filter by rating if specified and not 'all'
  if (req.query.rating && req.query.rating !== 'all') {
    query.rating = parseInt(req.query.rating);
  }

  // Handle sort parameter
  let sortOption = { createdAt: -1 }; // default: newest first
  
  switch (req.query.sort) {
    case 'newest':
      sortOption = { createdAt: -1 };
      break;
    case 'oldest':
      sortOption = { createdAt: 1 };
      break;
    case 'rating-high':
      sortOption = { rating: -1, createdAt: -1 };
      break;
    case 'rating-low':
      sortOption = { rating: 1, createdAt: -1 };
      break;
    case 'createdAt':
      sortOption = { createdAt: 1 };
      break;
    case '-createdAt':
      sortOption = { createdAt: -1 };
      break;
  }

  // Get feedback with pagination
  const feedback = await EventFeedback.find(query)
    .populate('event', 'name')
    .sort(sortOption)
    .skip(startIndex)
    .limit(limit);

  const total = await EventFeedback.countDocuments(query);

  // Get feedback statistics
  const stats = await EventFeedback.getEventStats(req.params.eventId);

  res.status(200).json({
    success: true,
    count: feedback.length,
    total,
    pagination: {
      page,
      limit,
      pages: Math.ceil(total / limit)
    },
    stats: stats[0] || { totalFeedback: 0, averageRating: 0, ratingDistribution: {} },
    data: feedback
  });
});

// @desc    Create new feedback for an event
// @route   POST /api/events/:eventId/feedback
// @access  Public
exports.createEventFeedback = asyncHandler(async (req, res, next) => {
  const { firstName, rating, comment } = req.body;
  const eventId = req.params.eventId;
  const ipAddress = req.ip || req.connection.remoteAddress;

  // Check if event exists
  const event = await Event.findById(eventId);
  if (!event) {
    return next(new ErrorResponse('Event not found', 404));
  }

  // Removed rate limiting check - users can now submit multiple feedback per event

  // Create feedback
  const feedback = await EventFeedback.create({
    event: eventId,
    firstName: firstName || undefined,
    rating,
    comment,
    ipAddress
  });

  await feedback.populate('event', 'name');

  res.status(201).json({
    success: true,
    message: 'Feedback submitted successfully',
    data: feedback
  });
});

// @desc    Get single feedback
// @route   GET /api/events/:eventId/feedback/:id
// @access  Public
exports.getFeedback = asyncHandler(async (req, res, next) => {
  const feedback = await EventFeedback.findOne({
    _id: req.params.id,
    event: req.params.eventId,
    isApproved: true
  }).populate('event', 'name');

  if (!feedback) {
    return next(new ErrorResponse('Feedback not found', 404));
  }

  res.status(200).json({
    success: true,
    data: feedback
  });
});

// @desc    Update feedback approval status (Admin/Manager only)
// @route   PUT /api/events/:eventId/feedback/:id/approve
// @access  Private/Admin/Manager
exports.approveFeedback = asyncHandler(async (req, res, next) => {
  const feedback = await EventFeedback.findOne({
    _id: req.params.id,
    event: req.params.eventId
  });

  if (!feedback) {
    return next(new ErrorResponse('Feedback not found', 404));
  }

  feedback.isApproved = true;
  await feedback.save();

  res.status(200).json({
    success: true,
    message: 'Feedback approved successfully',
    data: feedback
  });
});

// @desc    Delete feedback (Admin/Manager only)
// @route   DELETE /api/events/:eventId/feedback/:id
// @access  Private/Admin/Manager
exports.deleteFeedback = asyncHandler(async (req, res, next) => {
  const feedback = await EventFeedback.findOne({
    _id: req.params.id,
    event: req.params.eventId
  });

  if (!feedback) {
    return next(new ErrorResponse('Feedback not found', 404));
  }

  await feedback.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Feedback deleted successfully'
  });
});

// @desc    Get feedback statistics for an event
// @route   GET /api/events/:eventId/feedback/stats
// @access  Public
exports.getFeedbackStats = asyncHandler(async (req, res, next) => {
  const stats = await EventFeedback.getEventStats(req.params.eventId);

  res.status(200).json({
    success: true,
    data: stats[0] || { 
      totalFeedback: 0, 
      averageRating: 0, 
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } 
    }
  });
});