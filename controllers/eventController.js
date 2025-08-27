const Event = require('../models/Event');
const Person = require('../models/Person');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all events
// @route   GET /api/events
// @access  Public (filtered by isPublic) / Private (all events for authenticated users)
exports.getEvents = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 25;
  const startIndex = (page - 1) * limit;
  
  let query = {};
  
  // If user is not authenticated, only show public events
  if (!req.user) {
    query.isPublic = true;
    query.isActive = true;
  } else {
    // Filter by active status if specified
    if (req.query.active !== undefined) {
      query.isActive = req.query.active === 'true';
    }
    
    // Filter by public status if specified
    if (req.query.public !== undefined) {
      query.isPublic = req.query.public === 'true';
    }
  }
  
  // Filter by manager if specified (Admin only)
  if (req.query.managerId && req.user && req.user.role === 'Admin') {
    query.manager = req.query.managerId;
  }
  
  // Search by name or description
  if (req.query.search) {
    query.$or = [
      { name: { $regex: req.query.search, $options: 'i' } },
      { description: { $regex: req.query.search, $options: 'i' } }
    ];
  }
  
  // Filter by date range
  if (req.query.startDate || req.query.endDate) {
    query.startTime = {};
    if (req.query.startDate) {
      query.startTime.$gte = new Date(req.query.startDate);
    }
    if (req.query.endDate) {
      query.startTime.$lte = new Date(req.query.endDate);
    }
  }
  
  const total = await Event.countDocuments(query);
  const events = await Event.find(query)
    .populate('manager', 'firstName lastName email')
    .sort({ startTime: 1 })
    .limit(limit)
    .skip(startIndex);
  
  // Pagination result
  const pagination = {};
  
  if (startIndex + limit < total) {
    pagination.next = {
      page: page + 1,
      limit
    };
  }
  
  if (startIndex > 0) {
    pagination.prev = {
      page: page - 1,
      limit
    };
  }
  
  res.status(200).json({
    success: true,
    count: events.length,
    total,
    pagination,
    data: events
  });
});

// @desc    Get single event
// @route   GET /api/events/:id
// @access  Public (if public event) / Private
exports.getEvent = asyncHandler(async (req, res, next) => {
  const event = await Event.findById(req.params.id)
    .populate('manager', 'firstName lastName email')
    .populate('participants.person', 'firstName lastName email');
  
  if (!event) {
    return next(new ErrorResponse('Event not found', 404));
  }
  
  // Check if user can access this event
  if (!event.isPublic && (!req.user || (req.user.role !== 'Admin' && req.user.id !== event.manager.toString()))) {
    return next(new ErrorResponse('Not authorized to access this event', 403));
  }
  
  res.status(200).json({
    success: true,
    data: event
  });
});

// @desc    Create event
// @route   POST /api/events
// @access  Private/Manager+
exports.createEvent = asyncHandler(async (req, res, next) => {
  // Set the manager to the current user if not specified (Admin can specify different manager)
  if (req.user.role !== 'Admin') {
    req.body.manager = req.user.id;
  } else if (!req.body.manager) {
    req.body.manager = req.user.id;
  }
  
  // Validate manager exists and has appropriate role
  if (req.body.manager !== req.user.id) {
    const manager = await Person.findById(req.body.manager);
    if (!manager) {
      return next(new ErrorResponse('Manager not found', 404));
    }
    if (!['Admin', 'Manager'].includes(manager.role)) {
      return next(new ErrorResponse('Specified manager must have Manager or Admin role', 400));
    }
  }
  
  const event = await Event.create(req.body);
  
  res.status(201).json({
    success: true,
    data: event
  });
});

// @desc    Update event
// @route   PUT /api/events/:id
// @access  Private/Manager of event or Admin
exports.updateEvent = asyncHandler(async (req, res, next) => {
  let event = await Event.findById(req.params.id);
  
  if (!event) {
    return next(new ErrorResponse('Event not found', 404));
  }
  
  // Check if user can update this event
  if (req.user.role !== 'Admin' && req.user.id !== event.manager.toString()) {
    return next(new ErrorResponse('Not authorized to update this event', 403));
  }
  
  // Prevent changing manager unless Admin
  if (req.user.role !== 'Admin' && req.body.manager) {
    delete req.body.manager;
  }
  
  // Validate new manager if specified
  if (req.body.manager && req.body.manager !== event.manager.toString()) {
    const manager = await Person.findById(req.body.manager);
    if (!manager) {
      return next(new ErrorResponse('Manager not found', 404));
    }
    if (!['Admin', 'Manager'].includes(manager.role)) {
      return next(new ErrorResponse('New manager must have Manager or Admin role', 400));
    }
  }
  
  event = await Event.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  }).populate('manager', 'firstName lastName email');
  
  res.status(200).json({
    success: true,
    data: event
  });
});

// @desc    Delete event
// @route   DELETE /api/events/:id
// @access  Private/Manager of event or Admin
exports.deleteEvent = asyncHandler(async (req, res, next) => {
  const event = await Event.findById(req.params.id);
  
  if (!event) {
    return next(new ErrorResponse('Event not found', 404));
  }
  
  // Check if user can delete this event
  if (req.user.role !== 'Admin' && req.user.id !== event.manager.toString()) {
    return next(new ErrorResponse('Not authorized to delete this event', 403));
  }
  
  await event.deleteOne();
  
  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Activate event
// @route   PUT /api/events/:id/activate
// @access  Private/Manager of event or Admin
exports.activateEvent = asyncHandler(async (req, res, next) => {
  const event = await Event.findById(req.params.id);
  
  if (!event) {
    return next(new ErrorResponse('Event not found', 404));
  }
  
  // Check if user can activate this event
  if (req.user.role !== 'Admin' && req.user.id !== event.manager.toString()) {
    return next(new ErrorResponse('Not authorized to activate this event', 403));
  }
  
  event.isActive = true;
  await event.save();
  
  res.status(200).json({
    success: true,
    data: event
  });
});

// @desc    Deactivate event
// @route   PUT /api/events/:id/deactivate
// @access  Private/Manager of event or Admin
exports.deactivateEvent = asyncHandler(async (req, res, next) => {
  const event = await Event.findById(req.params.id);
  
  if (!event) {
    return next(new ErrorResponse('Event not found', 404));
  }
  
  // Check if user can deactivate this event
  if (req.user.role !== 'Admin' && req.user.id !== event.manager.toString()) {
    return next(new ErrorResponse('Not authorized to deactivate this event', 403));
  }
  
  event.isActive = false;
  await event.save();
  
  res.status(200).json({
    success: true,
    data: event
  });
});

// @desc    Join event
// @route   POST /api/events/:id/join
// @access  Private
exports.joinEvent = asyncHandler(async (req, res, next) => {
  const event = await Event.findById(req.params.id);
  
  if (!event) {
    return next(new ErrorResponse('Event not found', 404));
  }
  
  if (!event.isActive) {
    return next(new ErrorResponse('Cannot join inactive event', 400));
  }
  
  if (!event.isPublic && req.user.role === 'Participant') {
    return next(new ErrorResponse('Cannot join private event', 403));
  }
  
  // Check if already joined
  const alreadyJoined = event.participants.some(
    participant => participant.person.toString() === req.user.id
  );
  
  if (alreadyJoined) {
    return next(new ErrorResponse('Already joined this event', 400));
  }
  
  // Check max participants
  if (event.maxParticipants && event.participants.length >= event.maxParticipants) {
    return next(new ErrorResponse('Event is full', 400));
  }
  
  event.participants.push({
    person: req.user.id,
    joinedAt: new Date()
  });
  
  await event.save();
  
  res.status(200).json({
    success: true,
    message: 'Successfully joined event',
    data: event
  });
});

// @desc    Leave event
// @route   POST /api/events/:id/leave
// @access  Private
exports.leaveEvent = asyncHandler(async (req, res, next) => {
  const event = await Event.findById(req.params.id);
  
  if (!event) {
    return next(new ErrorResponse('Event not found', 404));
  }
  
  // Check if user is a participant
  const participantIndex = event.participants.findIndex(
    participant => participant.person.toString() === req.user.id
  );
  
  if (participantIndex === -1) {
    return next(new ErrorResponse('Not a participant of this event', 400));
  }
  
  event.participants.splice(participantIndex, 1);
  await event.save();
  
  res.status(200).json({
    success: true,
    message: 'Successfully left event',
    data: event
  });
});

// @desc    Get event participants
// @route   GET /api/events/:id/participants
// @access  Private/Manager of event or Admin or Participant of event
exports.getEventParticipants = asyncHandler(async (req, res, next) => {
  const event = await Event.findById(req.params.id)
    .populate('participants.person', 'firstName lastName email role');
  
  if (!event) {
    return next(new ErrorResponse('Event not found', 404));
  }
  
  // Check if user can view participants
  const isParticipant = event.participants.some(
    participant => participant.person._id.toString() === req.user.id
  );
  
  if (req.user.role !== 'Admin' && 
      req.user.id !== event.manager.toString() && 
      !isParticipant) {
    return next(new ErrorResponse('Not authorized to view participants', 403));
  }
  
  res.status(200).json({
    success: true,
    count: event.participants.length,
    data: event.participants
  });
});