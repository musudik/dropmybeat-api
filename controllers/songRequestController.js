const SongRequest = require('../models/SongRequest');
const Event = require('../models/Event');
const Person = require('../models/Person');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get all song requests for an event
// @route   GET /api/events/:eventId/song-requests
// @access  Public (if event is public) / Private (if event is private)
exports.getSongRequests = asyncHandler(async (req, res, next) => {
  const { eventId } = req.params;
  const { status, priority, search, sort = '-createdAt', page = 1, limit = 20 } = req.query;

  // Check if event exists and user has access
  const event = await Event.findById(eventId);
  if (!event) {
    return next(new ErrorResponse('Event not found', 404));
  }

  // Check access permissions
  if (!event.isPublic && (!req.user || !event.participants.includes(req.user.id))) {
    return next(new ErrorResponse('Access denied to this event', 403));
  }

  // Build query
  let query = { event: eventId };

  // Filter by status
  if (status) {
    query.status = status;
  }

  // Filter by priority
  if (priority) {
    query.priority = priority;
  }

  // Search functionality
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { artist: { $regex: search, $options: 'i' } },
      { album: { $regex: search, $options: 'i' } }
    ];
  }

  // Execute query with pagination
  const startIndex = (page - 1) * limit;
  const total = await SongRequest.countDocuments(query);
  
  const songRequests = await SongRequest.find(query)
    .populate('requestedBy', 'firstName lastName profilePicture')
    .populate('approvedBy', 'firstName lastName')
    .sort(sort)
    .skip(startIndex)
    .limit(parseInt(limit));

  // Pagination result
  const pagination = {};
  if (startIndex + limit < total) {
    pagination.next = { page: parseInt(page) + 1, limit: parseInt(limit) };
  }
  if (startIndex > 0) {
    pagination.prev = { page: parseInt(page) - 1, limit: parseInt(limit) };
  }

  res.status(200).json({
    success: true,
    count: songRequests.length,
    total,
    pagination,
    data: songRequests
  });
});

// @desc    Get single song request
// @route   GET /api/events/:eventId/song-requests/:id
// @access  Public (if event is public) / Private (if event is private)
exports.getSongRequest = asyncHandler(async (req, res, next) => {
  const { eventId, id } = req.params;

  // Check if event exists and user has access
  const event = await Event.findById(eventId);
  if (!event) {
    return next(new ErrorResponse('Event not found', 404));
  }

  if (!event.isPublic && (!req.user || !event.participants.includes(req.user.id))) {
    return next(new ErrorResponse('Access denied to this event', 403));
  }

  const songRequest = await SongRequest.findOne({ _id: id, event: eventId })
    .populate('requestedBy', 'firstName lastName profilePicture')
    .populate('approvedBy', 'firstName lastName');

  if (!songRequest) {
    return next(new ErrorResponse('Song request not found', 404));
  }

  res.status(200).json({
    success: true,
    data: songRequest
  });
});

// @desc    Create song request
// @route   POST /api/events/:eventId/song-requests
// @access  Private (must be event participant)
exports.createSongRequest = asyncHandler(async (req, res, next) => {
  const { eventId } = req.params;
  const { title, artist, album, duration, spotifyId, youtubeId, message } = req.body;

  // Check if event exists and is active
  const event = await Event.findById(eventId);
  if (!event) {
    return next(new ErrorResponse('Event not found', 404));
  }

  if (!event.isActive) {
    return next(new ErrorResponse('Event is not active', 400));
  }

  // Check if user is participant
  if (!event.participants.includes(req.user.id)) {
    return next(new ErrorResponse('You must be a participant to request songs', 403));
  }

  // Check for duplicate requests
  const existingRequest = await SongRequest.findOne({
    event: eventId,
    requestedBy: req.user.id,
    $or: [
      { spotifyId: spotifyId },
      { youtubeId: youtubeId },
      { title: title, artist: artist }
    ]
  });

  if (existingRequest) {
    return next(new ErrorResponse('You have already requested this song', 400));
  }

  // Check request limits
  const userRequestCount = await SongRequest.countDocuments({
    event: eventId,
    requestedBy: req.user.id,
    status: { $in: ['pending', 'approved'] }
  });

  if (userRequestCount >= event.settings.maxSongRequestsPerUser) {
    return next(new ErrorResponse(`Maximum ${event.settings.maxSongRequestsPerUser} song requests allowed per user`, 400));
  }

  // Create song request
  const songRequest = await SongRequest.create({
    title,
    artist,
    album,
    duration,
    spotifyId,
    youtubeId,
    message,
    event: eventId,
    requestedBy: req.user.id
  });

  await songRequest.populate('requestedBy', 'firstName lastName profilePicture');

  // Emit real-time event
  const io = req.app.get('io');
  if (io) {
    io.to(`event_${eventId}`).emit('songRequestCreated', {
      songRequest,
      event: eventId
    });
  }

  res.status(201).json({
    success: true,
    data: songRequest
  });
});

// @desc    Update song request
// @route   PUT /api/events/:eventId/song-requests/:id
// @access  Private (owner or event manager)
exports.updateSongRequest = asyncHandler(async (req, res, next) => {
  const { eventId, id } = req.params;
  const { title, artist, album, duration, message, priority } = req.body;

  // Find song request
  let songRequest = await SongRequest.findOne({ _id: id, event: eventId });
  if (!songRequest) {
    return next(new ErrorResponse('Song request not found', 404));
  }

  // Check permissions
  const event = await Event.findById(eventId);
  const isOwner = songRequest.requestedBy.toString() === req.user.id;
  const isManager = event.managers.includes(req.user.id);
  const isAdmin = req.user.role === 'admin';

  if (!isOwner && !isManager && !isAdmin) {
    return next(new ErrorResponse('Not authorized to update this song request', 403));
  }

  // Only allow certain fields to be updated by owner
  const allowedFields = isOwner && !isManager && !isAdmin 
    ? { title, artist, album, duration, message }
    : { title, artist, album, duration, message, priority };

  // Remove undefined fields
  Object.keys(allowedFields).forEach(key => 
    allowedFields[key] === undefined && delete allowedFields[key]
  );

  songRequest = await SongRequest.findByIdAndUpdate(id, allowedFields, {
    new: true,
    runValidators: true
  }).populate('requestedBy', 'firstName lastName profilePicture')
    .populate('approvedBy', 'firstName lastName');

  // Emit real-time event
  const io = req.app.get('io');
  if (io) {
    io.to(`event_${eventId}`).emit('songRequestUpdated', {
      songRequest,
      event: eventId
    });
  }

  res.status(200).json({
    success: true,
    data: songRequest
  });
});

// @desc    Delete song request
// @route   DELETE /api/events/:eventId/song-requests/:id
// @access  Private (owner or event manager)
exports.deleteSongRequest = asyncHandler(async (req, res, next) => {
  const { eventId, id } = req.params;

  const songRequest = await SongRequest.findOne({ _id: id, event: eventId });
  if (!songRequest) {
    return next(new ErrorResponse('Song request not found', 404));
  }

  // Check permissions
  const event = await Event.findById(eventId);
  const isOwner = songRequest.requestedBy.toString() === req.user.id;
  const isManager = event.managers.includes(req.user.id);
  const isAdmin = req.user.role === 'admin';

  if (!isOwner && !isManager && !isAdmin) {
    return next(new ErrorResponse('Not authorized to delete this song request', 403));
  }

  await songRequest.deleteOne();

  // Emit real-time event
  const io = req.app.get('io');
  if (io) {
    io.to(`event_${eventId}`).emit('songRequestDeleted', {
      songRequestId: id,
      event: eventId
    });
  }

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Like/Unlike song request
// @route   POST /api/events/:eventId/song-requests/:id/like
// @access  Private (event participants)
exports.toggleLike = asyncHandler(async (req, res, next) => {
  const { eventId, id } = req.params;

  // Check if event exists and user is participant
  const event = await Event.findById(eventId);
  if (!event) {
    return next(new ErrorResponse('Event not found', 404));
  }

  if (!event.participants.includes(req.user.id)) {
    return next(new ErrorResponse('You must be a participant to like songs', 403));
  }

  const songRequest = await SongRequest.findOne({ _id: id, event: eventId });
  if (!songRequest) {
    return next(new ErrorResponse('Song request not found', 404));
  }

  const result = await songRequest.toggleLike(req.user.id);
  await songRequest.populate('requestedBy', 'firstName lastName profilePicture');

  // Emit real-time event
  const io = req.app.get('io');
  if (io) {
    io.to(`event_${eventId}`).emit('songRequestLiked', {
      songRequestId: id,
      userId: req.user.id,
      action: result.action,
      likeCount: songRequest.likeCount,
      event: eventId
    });
  }

  res.status(200).json({
    success: true,
    data: {
      action: result.action,
      likeCount: songRequest.likeCount,
      songRequest
    }
  });
});

// @desc    Approve song request
// @route   POST /api/events/:eventId/song-requests/:id/approve
// @access  Private (event managers only)
exports.approveSongRequest = asyncHandler(async (req, res, next) => {
  const { eventId, id } = req.params;
  const { queuePosition } = req.body;

  const songRequest = await SongRequest.findOne({ _id: id, event: eventId });
  if (!songRequest) {
    return next(new ErrorResponse('Song request not found', 404));
  }

  const result = await songRequest.approve(req.user.id, queuePosition);
  await songRequest.populate('requestedBy', 'firstName lastName profilePicture')
    .populate('approvedBy', 'firstName lastName');

  // Emit real-time event
  const io = req.app.get('io');
  if (io) {
    io.to(`event_${eventId}`).emit('songRequestApproved', {
      songRequest,
      event: eventId
    });
  }

  res.status(200).json({
    success: true,
    data: songRequest
  });
});

// @desc    Reject song request
// @route   POST /api/events/:eventId/song-requests/:id/reject
// @access  Private (event managers only)
exports.rejectSongRequest = asyncHandler(async (req, res, next) => {
  const { eventId, id } = req.params;
  const { reason } = req.body;

  const songRequest = await SongRequest.findOne({ _id: id, event: eventId });
  if (!songRequest) {
    return next(new ErrorResponse('Song request not found', 404));
  }

  const result = await songRequest.reject(req.user.id, reason);
  await songRequest.populate('requestedBy', 'firstName lastName profilePicture')
    .populate('approvedBy', 'firstName lastName');

  // Emit real-time event
  const io = req.app.get('io');
  if (io) {
    io.to(`event_${eventId}`).emit('songRequestRejected', {
      songRequest,
      event: eventId
    });
  }

  res.status(200).json({
    success: true,
    data: songRequest
  });
});

// @desc    Get event queue (approved songs)
// @route   GET /api/events/:eventId/queue
// @access  Public (if event is public) / Private (if event is private)
exports.getEventQueue = asyncHandler(async (req, res, next) => {
  const { eventId } = req.params;

  // Check if event exists and user has access
  const event = await Event.findById(eventId);
  if (!event) {
    return next(new ErrorResponse('Event not found', 404));
  }

  if (!event.isPublic && (!req.user || !event.participants.includes(req.user.id))) {
    return next(new ErrorResponse('Access denied to this event', 403));
  }

  const queue = await SongRequest.getEventQueue(eventId);

  res.status(200).json({
    success: true,
    count: queue.length,
    data: queue
  });
});

// @desc    Get TimeBomb requests
// @route   GET /api/events/:eventId/timebombs
// @access  Private (event managers only)
exports.getTimeBombs = asyncHandler(async (req, res, next) => {
  const { eventId } = req.params;

  const timeBombs = await SongRequest.getTimeBombs(eventId);

  res.status(200).json({
    success: true,
    count: timeBombs.length,
    data: timeBombs
  });
});

// @desc    Get event statistics
// @route   GET /api/events/:eventId/stats
// @access  Private (event managers only)
exports.getEventStats = asyncHandler(async (req, res, next) => {
  const { eventId } = req.params;

  const stats = await SongRequest.getEventStats(eventId);

  res.status(200).json({
    success: true,
    data: stats
  });
});