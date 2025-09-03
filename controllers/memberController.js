const Event = require('../models/Event');
const SongRequest = require('../models/SongRequest');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get member dashboard data
// @route   GET /api/member/dashboard
// @access  Private/Member
exports.getMemberDashboard = asyncHandler(async (req, res, next) => {
  const memberId = req.user.id;
  
  // Events joined
  const joinedEvents = await Event.find({ 'Members.user': memberId, 'Members.isApproved': true })
    .populate('manager', 'firstName lastName')
    .sort({ startDate: 1 });
  
  const totalJoinedEvents = joinedEvents.length;
  const upcomingEvents = joinedEvents.filter(event => new Date(event.startDate) > new Date()).slice(0, 3);
  const activeEvents = joinedEvents.filter(event => event.status === 'Active');
  
  // Song requests made
  const totalSongRequests = await SongRequest.countDocuments({ requestedBy: memberId });
  const approvedSongRequests = await SongRequest.countDocuments({ requestedBy: memberId, status: 'Approved' });
  const pendingSongRequests = await SongRequest.countDocuments({ requestedBy: memberId, status: 'Pending' });
  
  // Recent song requests
  const recentSongRequests = await SongRequest.find({ requestedBy: memberId })
    .populate('event', 'name')
    .sort({ createdAt: -1 })
    .limit(5);
  
  // Total likes received
  const totalLikesReceived = await SongRequest.aggregate([
    { $match: { requestedBy: memberId } },
    { $group: { _id: null, totalLikes: { $sum: '$likes' } } }
  ]);
  
  res.status(200).json({
    success: true,
    data: {
      stats: {
        totalJoinedEvents,
        activeEventsCount: activeEvents.length,
        totalSongRequests,
        approvedSongRequests,
        pendingSongRequests,
        totalLikesReceived: totalLikesReceived[0]?.totalLikes || 0
      },
      upcomingEvents,
      activeEvents: activeEvents.slice(0, 3),
      recentSongRequests
    }
  });
});

// @desc    Get member's joined events
// @route   GET /api/member/events
// @access  Private/Member
exports.getMemberEvents = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 25;
  const startIndex = (page - 1) * limit;
  
  let query = { 'Members.user': req.user.id, 'Members.isApproved': true };
  
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
    .populate('manager', 'firstName lastName')
    .sort({ startDate: 1 })
    .limit(limit)
    .skip(startIndex);
  
  // Add member's song request count for each event
  const eventsWithStats = await Promise.all(
    events.map(async (event) => {
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
    total,
    data: eventsWithStats
  });
});

// @desc    Get member's song requests
// @route   GET /api/member/song-requests
// @access  Private/Member
exports.getMemberSongRequests = asyncHandler(async (req, res, next) => {
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