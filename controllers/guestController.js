const Event = require('../models/Event');
const SongRequest = require('../models/SongRequest');
const EventParticipant = require('../models/EventParticipant');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get guest dashboard data
// @route   GET /api/guest/dashboard
// @access  Private/Guest
exports.getGuestDashboard = asyncHandler(async (req, res, next) => {
  const guestId = req.user.id;
  
  // Events joined (for registered guests)
  const joinedEvents = await Event.find({ 'Members.user': guestId, 'Members.isApproved': true })
    .populate('manager', 'firstName lastName')
    .sort({ startDate: 1 });
  
  // Events joined as guest participant (for unregistered guests who later registered)
  const guestParticipations = await EventParticipant.find({ 
    $or: [
      { user: guestId },
      { email: req.user.email }
    ]
  }).populate('event', 'name startDate endDate manager status');
  
  const totalJoinedEvents = joinedEvents.length + guestParticipations.length;
  const activeEvents = joinedEvents.filter(event => event.status === 'Active');
  
  // Song requests made
  const totalSongRequests = await SongRequest.countDocuments({ requestedBy: guestId });
  const approvedSongRequests = await SongRequest.countDocuments({ requestedBy: guestId, status: 'Approved' });
  const pendingSongRequests = await SongRequest.countDocuments({ requestedBy: guestId, status: 'Pending' });
  
  // Recent song requests
  const recentSongRequests = await SongRequest.find({ requestedBy: guestId })
    .populate('event', 'name')
    .sort({ createdAt: -1 })
    .limit(5);
  
  // Upcoming events
  const upcomingEvents = joinedEvents
    .filter(event => new Date(event.startDate) > new Date())
    .slice(0, 3);
  
  res.status(200).json({
    success: true,
    data: {
      stats: {
        totalJoinedEvents,
        activeEventsCount: activeEvents.length,
        totalSongRequests,
        approvedSongRequests,
        pendingSongRequests
      },
      upcomingEvents,
      activeEvents: activeEvents.slice(0, 3),
      recentSongRequests,
      guestParticipations: guestParticipations.slice(0, 3)
    }
  });
});

// @desc    Get guest's joined events
// @route   GET /api/guest/events
// @access  Private/Guest
exports.getGuestEvents = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 25;
  const startIndex = (page - 1) * limit;
  
  // Get events where user is a registered member
  const memberEvents = await Event.find({ 'Members.user': req.user.id, 'Members.isApproved': true })
    .populate('manager', 'firstName lastName')
    .sort({ startDate: 1 });
  
  // Get events where user participated as guest
  const guestParticipations = await EventParticipant.find({ 
    $or: [
      { user: req.user.id },
      { email: req.user.email }
    ]
  }).populate('event');
  
  const guestEventIds = guestParticipations.map(gp => gp.event._id);
  const guestEvents = await Event.find({ _id: { $in: guestEventIds } })
    .populate('manager', 'firstName lastName');
  
  // Combine and deduplicate events
  const allEvents = [...memberEvents, ...guestEvents];
  const uniqueEvents = allEvents.filter((event, index, self) => 
    index === self.findIndex(e => e._id.toString() === event._id.toString())
  );
  
  // Apply pagination
  const paginatedEvents = uniqueEvents.slice(startIndex, startIndex + limit);
  
  // Add guest's song request count for each event
  const eventsWithStats = await Promise.all(
    paginatedEvents.map(async (event) => {
      const mySongRequests = await SongRequest.countDocuments({ event: event._id, requestedBy: req.user.id });
      const myApprovedRequests = await SongRequest.countDocuments({ event: event._id, requestedBy: req.user.id, status: 'Approved' });
      
      return {
        ...event.toObject(),
        mySongRequests,
        myApprovedRequests
      };
    })
  );
  
  res.status(200).json({
    success: true,
    count: eventsWithStats.length,
    total: uniqueEvents.length,
    data: eventsWithStats
  });
});

// @desc    Get guest's song requests
// @route   GET /api/guest/song-requests
// @access  Private/Guest
exports.getGuestSongRequests = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 25;
  const startIndex = (page - 1) * limit;
  
  let query = { requestedBy: req.user.id };
  
  if (req.query.status) {
    query.status = req.query.status;
  }
  
  if (req.query.eventId) {
    query.event = req.query.eventId;
  }
  
  const total = await SongRequest.countDocuments(query);
  const songRequests = await SongRequest.find(query)
    .populate('event', 'name manager')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(startIndex);
  
  res.status(200).json({
    success: true,
    count: songRequests.length,
    total,
    data: songRequests
  });
});