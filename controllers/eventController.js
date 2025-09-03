const Event = require('../models/Event');
const Person = require('../models/Person');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const EventParticipant = require('../models/EventParticipant');

// @desc    Get all events
// @route   GET /api/events
// @access  Public (filtered by role)
exports.getEvents = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 25;
  const startIndex = (page - 1) * limit;
  
  let query = {};
  
  // Role-based filtering
  if (!req.user) {
    // Unauthenticated users - only public events
    query.isPublic = true;
    query.status = 'Active';
  } else {
    switch (req.user.role) {
      case 'Admin':
        // Admin can see all events
        break;
      case 'Manager':
        // Manager can see all public events + their own events
        if (req.query.myEvents === 'true') {
          query.manager = req.user.id;
        } else {
          query.$or = [
            { isPublic: true },
            { manager: req.user.id }
          ];
        }
        break;
      case 'Member':
        // Member can see all public events
        query.isPublic = true;
        break;
      case 'Guest':
        // Guest can only see events they've joined
        const joinedEvents = await Event.find({
          'Members.user': req.user.id,
          'Members.isApproved': true
        }).select('_id');
        query._id = { $in: joinedEvents.map(e => e._id) };
        break;
      default:
        query.isPublic = true;
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
    query.startDate = {};
    if (req.query.startDate) {
      query.startDate.$gte = new Date(req.query.startDate);
    }
    if (req.query.endDate) {
      query.startDate.$lte = new Date(req.query.endDate);
    }
  }
  
  const total = await Event.countDocuments(query);
  const events = await Event.find(query)
    .populate('manager', 'firstName lastName email')
    .sort({ startDate: 1 })
    .limit(limit)
    .skip(startIndex);
  
  // Add guest Member counts and details to each event
  const eventsWithGuestDetails = await Promise.all(
    events.map(async (event) => {
      const guestMembers = await EventParticipant.find({ event: event._id })
        .select('email firstName lastName isApproved joinedAt');
      const eventObj = event.toObject();
      eventObj.guestMembers = guestMembers;
      eventObj.guestMemberCount = guestMembers.length;
      eventObj.totalMemberCount = eventObj.MemberCount + guestMembers.length;
      return eventObj;
    })
  );
  
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
    count: eventsWithGuestDetails.length,
    total,
    pagination,
    data: eventsWithGuestDetails
  });
});

// @desc    Get single event
// @route   GET /api/events/:id
// @access  Role-based access
exports.getEvent = asyncHandler(async (req, res, next) => {
  const event = await Event.findById(req.params.id)
    .populate('manager', 'firstName lastName email')
    .populate('Members.user', 'firstName lastName email');
  
  if (!event) {
    return next(new ErrorResponse('Event not found', 404));
  }
  
  // Role-based access control
  if (!req.user) {
    // Unauthenticated users - only public events
    if (!event.isPublic) {
      return next(new ErrorResponse('Not authorized to access this event', 403));
    }
  } else {
    switch (req.user.role) {
      case 'Admin':
        // Admin can access all events
        break;
      case 'Manager':
        // Manager can access public events + their own events
        if (!event.isPublic && event.manager.toString() !== req.user.id) {
          return next(new ErrorResponse('Not authorized to access this event', 403));
        }
        break;
      case 'Member':
        // Member can access all public events
        if (!event.isPublic) {
          return next(new ErrorResponse('Not authorized to access this event', 403));
        }
        break;
      case 'Guest':
        // Guest can only access events they've joined
        const isMember = event.Members.some(
          p => p.user.toString() === req.user.id && p.isApproved
        );
        if (!isMember) {
          return next(new ErrorResponse('Not authorized to access this event', 403));
        }
        break;
      default:
        if (!event.isPublic) {
          return next(new ErrorResponse('Not authorized to access this event', 403));
        }
    }
  }
  
  // Add guest Member count
  const guestCount = await EventParticipant.countDocuments({ event: req.params.id });
  const eventObj = event.toObject();
  eventObj.guestMemberCount = guestCount;
  eventObj.totalMemberCount = eventObj.MemberCount + guestCount;
  
  res.status(200).json({
    success: true,
    data: eventObj
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
  
  event.status = 'Active';
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
  
  event.status = 'Draft';
  await event.save();
  
  res.status(200).json({
    success: true,
    data: event
  });
});

// @desc    Join event (authenticated users)
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
  
  if (!event.isPublic && req.user.role === 'Member') {
    return next(new ErrorResponse('Cannot join private event', 403));
  }
  
  // Check if already joined
  const alreadyJoined = event.Members.some(
    Member => Member.user.toString() === req.user.id
  );
  
  if (alreadyJoined) {
    return next(new ErrorResponse('Already joined this event', 400));
  }
  
  // Check max Members
  if (event.maxMembers && event.Members.length >= event.maxMembers) {
    return next(new ErrorResponse('Event is full', 400));
  }
  
  event.Members.push({
    user: req.user.id,
    joinedAt: new Date()
  });
  
  await event.save();
  
  res.status(200).json({
    success: true,
    message: 'Successfully joined event',
    data: event
  });
});

// @desc    Join event with email and name (no auth required)
// @route   POST /api/events/:id/join-guest
// @access  Public
exports.joinEventAsGuest = asyncHandler(async (req, res, next) => {
  const { email, firstName, lastName } = req.body;
  
  // Validate required fields
  if (!email || !firstName || !lastName) {
    return next(new ErrorResponse('Email, first name, and last name are required', 400));
  }
  
  const event = await Event.findById(req.params.id);
  
  if (!event) {
    return next(new ErrorResponse('Event not found', 404));
  }
  
  if (!event.isActive) {
    return next(new ErrorResponse('Cannot join inactive event', 400));
  }
  
  if (!event.isPublic) {
    return next(new ErrorResponse('Cannot join private event', 403));
  }
  
  // Check if Member already exists (unique email and lastName per event)
  const existingMember = await EventParticipant.MemberExists(
    req.params.id, 
    email, 
    lastName
  );
  
  if (existingMember) {
    return next(new ErrorResponse('A Member with this email and last name already exists for this event', 400));
  }
  
  // Check max Members
  if (event.maxMembers) {
    const currentMemberCount = await EventParticipant.countDocuments({ event: req.params.id });
    if (currentMemberCount >= event.maxMembers) {
      return next(new ErrorResponse('Event is full', 400));
    }
  }
  
  // Create new Member
  const Member = await EventParticipant.create({
    event: req.params.id,
    email: email.toLowerCase(),
    firstName,
    lastName,
    isApproved: !event.requiresApproval
  });
  
  await Member.populate('event', 'name startDate endDate venue.name');
  
  res.status(201).json({
    success: true,
    message: 'Successfully joined event',
    data: {
      Member,
      event: {
        id: event._id,
        name: event.name,
        startDate: event.startDate,
        endDate: event.endDate,
        venue: event.venue.name
      }
    }
  });
});

// @desc    Get event Members (guest Members)
// @route   GET /api/events/:id/guest-Members
// @access  Private
exports.getEventGuestMembers = asyncHandler(async (req, res, next) => {
  const event = await Event.findById(req.params.id);
  
  if (!event) {
    return next(new ErrorResponse('Event not found', 404));
  }
  
  const Members = await EventParticipant.findByEvent(req.params.id);
  
  res.status(200).json({
    success: true,
    count: Members.length,
    data: Members
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
  
  // Check if user is a Member
  const MemberIndex = event.Members.findIndex(
    Member => Member.person.toString() === req.user.id
  );
  
  if (MemberIndex === -1) {
    return next(new ErrorResponse('Not a Member of this event', 400));
  }
  
  event.Members.splice(MemberIndex, 1);
  await event.save();
  
  res.status(200).json({
    success: true,
    message: 'Successfully left event',
    data: event
  });
});

// @desc    Get event Members
// @route   GET /api/events/:id/Members
// @access  Private/Manager of event or Admin or Member of event
exports.getEventParticipants = asyncHandler(async (req, res, next) => {
  const event = await Event.findById(req.params.id)
    .populate('Members.user', 'firstName lastName email role');
  
  if (!event) {
    return next(new ErrorResponse('Event not found', 404));
  }
  
  // Check if user can view Members
  const isMember = event.Members.some(
    Member => Member.user._id.toString() === req.user.id
  );
  
  if (req.user.role !== 'Admin' && 
      req.user.id !== event.manager.toString() && 
      !isMember) {
    return next(new ErrorResponse('Not authorized to view Members', 403));
  }
  
  res.status(200).json({
    success: true,
    count: event.Members.length,
    data: event.Members
  });
});