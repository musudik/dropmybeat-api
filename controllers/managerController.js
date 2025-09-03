const Event = require('../models/Event');
const SongRequest = require('../models/SongRequest');
const EventParticipant = require('../models/EventParticipant');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get manager dashboard data
// @route   GET /api/manager/dashboard
// @access  Private/Manager
exports.getManagerDashboard = asyncHandler(async (req, res, next) => {
  const managerId = req.user.id;
  
  const totalEvents = await Event.countDocuments({ manager: managerId });
  const activeEvents = await Event.countDocuments({ manager: managerId, status: 'Active' });
  const draftEvents = await Event.countDocuments({ manager: managerId, status: 'Draft' });
  const completedEvents = await Event.countDocuments({ manager: managerId, status: 'Completed' });
  
  // Total participants across all events
  const events = await Event.find({ manager: managerId }).select('_id Members');
  const totalParticipants = events.reduce((sum, event) => sum + event.Members.length, 0);
  
  // Total guest participants
  const eventIds = events.map(e => e._id);
  const totalGuestParticipants = await EventParticipant.countDocuments({ event: { $in: eventIds } });
  
  // Total song requests
  const totalSongRequests = await SongRequest.countDocuments({ event: { $in: eventIds } });
  const pendingSongRequests = await SongRequest.countDocuments({ event: { $in: eventIds }, status: 'Pending' });
  
  // Recent events
  const recentEvents = await Event.find({ manager: managerId })
    .populate('Members.user', 'firstName lastName')
    .sort({ createdAt: -1 })
    .limit(5);
  
  // Upcoming events
  const upcomingEvents = await Event.find({ 
    manager: managerId, 
    startDate: { $gte: new Date() },
    status: { $in: ['Published', 'Active'] }
  })
    .sort({ startDate: 1 })
    .limit(3);
  
  res.status(200).json({
    success: true,
    data: {
      stats: {
        totalEvents,
        activeEvents,
        draftEvents,
        completedEvents,
        totalParticipants,
        totalGuestParticipants,
        totalSongRequests,
        pendingSongRequests
      },
      recentEvents,
      upcomingEvents
    }
  });
});

// @desc    Get manager's events
// @route   GET /api/manager/events
// @access  Private/Manager
exports.getManagerEvents = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 25;
  const startIndex = (page - 1) * limit;
  
  let query = { manager: req.user.id };
  
  if (req.query.status) {
    query.status = req.query.status;
  }
  
  if (req.query.search) {
    query.$or = [
      { name: { $regex: req.query.search, $options: 'i' } },
      { description: { $regex: req.query.search, $options: 'i' } }
    ];
  }
  
  const total = await Event.countDocuments(query);
  const events = await Event.find(query)
    .populate('Members.user', 'firstName lastName email')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(startIndex);
  
  // Add additional stats for each event
  const eventsWithStats = await Promise.all(
    events.map(async (event) => {
      const guestCount = await EventParticipant.countDocuments({ event: event._id });
      const songRequestCount = await SongRequest.countDocuments({ event: event._id });
      const pendingSongRequests = await SongRequest.countDocuments({ event: event._id, status: 'Pending' });
      
      return {
        ...event.toObject(),
        guestMemberCount: guestCount,
        totalMemberCount: event.Members.length + guestCount,
        songRequestCount,
        pendingSongRequests
      };
    })
  );
  
  res.status(200).json({
    success: true,
    count: eventsWithStats.length,
    total,
    data: eventsWithStats
  });
});

// @desc    Get event analytics for manager
// @route   GET /api/manager/events/:id/analytics
// @access  Private/Manager
exports.getEventAnalytics = asyncHandler(async (req, res, next) => {
  const event = await Event.findOne({ _id: req.params.id, manager: req.user.id });
  
  if (!event) {
    return next(new ErrorResponse('Event not found or not authorized', 404));
  }
  
  // Song request analytics
  const songRequestsByStatus = await SongRequest.aggregate([
    { $match: { event: event._id } },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);
  
  const songRequestsByPriority = await SongRequest.aggregate([
    { $match: { event: event._id } },
    { $group: { _id: '$priority', count: { $sum: 1 } } }
  ]);
  
  // Top requested songs
  const topSongs = await SongRequest.find({ event: event._id })
    .sort({ likes: -1, createdAt: -1 })
    .limit(10)
    .populate('requestedBy', 'firstName lastName');
  
  // Participant growth over time
  const participantGrowth = await EventParticipant.aggregate([
    { $match: { event: event._id } },
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$joinedAt" } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);
  
  res.status(200).json({
    success: true,
    data: {
      event: {
        name: event.name,
        status: event.status,
        memberCount: event.Members.length,
        guestMemberCount: await EventParticipant.countDocuments({ event: event._id })
      },
      songRequestsByStatus,
      songRequestsByPriority,
      topSongs,
      participantGrowth
    }
  });
});