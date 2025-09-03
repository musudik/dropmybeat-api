const Event = require('../models/Event');
const Person = require('../models/Person');
const SongRequest = require('../models/SongRequest');
const EventParticipant = require('../models/EventParticipant');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get admin dashboard data
// @route   GET /api/admin/dashboard
// @access  Private/Admin
exports.getAdminDashboard = asyncHandler(async (req, res, next) => {
  const totalEvents = await Event.countDocuments();
  const activeEvents = await Event.countDocuments({ status: 'Active' });
  const totalManagers = await Person.countDocuments({ role: 'Manager' });
  const totalMembers = await Person.countDocuments({ role: 'Member' });
  const totalGuests = await Person.countDocuments({ role: 'Guest' });
  const totalSongRequests = await SongRequest.countDocuments();
  const pendingSongRequests = await SongRequest.countDocuments({ status: 'Pending' });
  
  // Recent events
  const recentEvents = await Event.find()
    .populate('manager', 'firstName lastName email')
    .sort({ createdAt: -1 })
    .limit(5);
  
  // Top managers by event count
  const topManagers = await Event.aggregate([
    { $group: { _id: '$manager', eventCount: { $sum: 1 } } },
    { $lookup: { from: 'persons', localField: '_id', foreignField: '_id', as: 'manager' } },
    { $unwind: '$manager' },
    { $sort: { eventCount: -1 } },
    { $limit: 5 }
  ]);
  
  res.status(200).json({
    success: true,
    data: {
      stats: {
        totalEvents,
        activeEvents,
        totalManagers,
        totalMembers,
        totalGuests,
        totalSongRequests,
        pendingSongRequests
      },
      recentEvents,
      topManagers
    }
  });
});

// @desc    Get all managers
// @route   GET /api/admin/managers
// @access  Private/Admin
exports.getAllManagers = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 25;
  const startIndex = (page - 1) * limit;
  
  let query = { role: 'Manager' };
  
  if (req.query.search) {
    query.$or = [
      { firstName: { $regex: req.query.search, $options: 'i' } },
      { lastName: { $regex: req.query.search, $options: 'i' } },
      { email: { $regex: req.query.search, $options: 'i' } }
    ];
  }
  
  const total = await Person.countDocuments(query);
  const managers = await Person.find(query)
    .select('-password')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(startIndex);
  
  // Add event counts for each manager
  const managersWithStats = await Promise.all(
    managers.map(async (manager) => {
      const eventCount = await Event.countDocuments({ manager: manager._id });
      const activeEventCount = await Event.countDocuments({ manager: manager._id, status: 'Active' });
      return {
        ...manager.toObject(),
        eventCount,
        activeEventCount
      };
    })
  );
  
  res.status(200).json({
    success: true,
    count: managersWithStats.length,
    total,
    data: managersWithStats
  });
});

// @desc    Get system analytics
// @route   GET /api/admin/analytics
// @access  Private/Admin
exports.getSystemAnalytics = asyncHandler(async (req, res, next) => {
  const { startDate, endDate } = req.query;
  let dateFilter = {};
  
  if (startDate || endDate) {
    dateFilter.createdAt = {};
    if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
    if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
  }
  
  // Event analytics
  const eventsByType = await Event.aggregate([
    { $match: dateFilter },
    { $group: { _id: '$eventType', count: { $sum: 1 } } }
  ]);
  
  const eventsByStatus = await Event.aggregate([
    { $match: dateFilter },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);
  
  // Song request analytics
  const songRequestsByStatus = await SongRequest.aggregate([
    { $match: dateFilter },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);
  
  // User growth
  const userGrowth = await Person.aggregate([
    { $match: dateFilter },
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);
  
  res.status(200).json({
    success: true,
    data: {
      eventsByType,
      eventsByStatus,
      songRequestsByStatus,
      userGrowth
    }
  });
});