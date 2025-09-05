const jwt = require('jsonwebtoken');
const Person = require('../models/Person');
const { asyncHandler } = require('./errorHandler');
const ErrorResponse = require('../utils/errorResponse');

// Protect routes - require authentication
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Make sure token exists
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from token
    const user = await Person.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User account is deactivated'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }
});

// Grant access to specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`
      });
    }
    next();
  };
};

// Optional authentication - doesn't fail if no token
const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await Person.findById(decoded.id).select('-password');
    } catch (error) {
      // Token is invalid, but we allow the request to continue without user
      req.user = null;
    }
  }

  next();
});

// Guest access middleware - allows guests and authenticated users
const guestAccess = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await Person.findById(decoded.id).select('-password');
    
    if (!req.user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Allow access for all roles including Guest
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
});

// Admin only access - for managing managers and all events
const adminOnly = asyncHandler(async (req, res, next) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin role required'
    });
  }
  next();
});

// Manager access for their own events
const managerEventAccess = asyncHandler(async (req, res, next) => {
  const eventId = req.params.eventId || req.params.id;
  
  if (!eventId) {
    return res.status(400).json({
      success: false,
      message: 'Event ID is required'
    });
  }

  // Admin can access all events
  if (req.user.role === 'Admin') {
    return next();
  }

  // Manager can only access their own events
  if (req.user.role === 'Manager') {
    const Event = require('../models/Event');
    const event = await Event.findById(eventId);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    if (event.manager.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only manage your own events'
      });
    }

    req.event = event;
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Access denied. Manager or Admin role required'
  });
});

// Member access for joined events
const memberEventAccess = asyncHandler(async (req, res, next) => {
  const eventId = req.params.eventId || req.params.id;
  
  if (!eventId) {
    return res.status(400).json({
      success: false,
      message: 'Event ID is required'
    });
  }

  const Event = require('../models/Event');
  const event = await Event.findById(eventId);
  
  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found'
    });
  }

  // Admin and event manager have access
  if (req.user.role === 'Admin' || event.manager.toString() === req.user._id.toString()) {
    req.event = event;
    return next();
  }

  // Member must be joined to the event
  if (req.user.role === 'Member') {
    const isMember = event.Members.some(
      p => p.user.toString() === req.user._id.toString() && p.isApproved
    );

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You must join this event first'
      });
    }

    req.event = event;
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Access denied. Member role required'
  });
});

// Guest access for joined events only
const guestEventAccess = asyncHandler(async (req, res, next) => {
  const eventId = req.params.eventId || req.params.id;
  
  if (!eventId) {
    return res.status(400).json({
      success: false,
      message: 'Event ID is required'
    });
  }

  const Event = require('../models/Event');
  const event = await Event.findById(eventId);
  
  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found'
    });
  }

  // Admin and event manager have access
  if (req.user.role === 'Admin' || event.manager.toString() === req.user._id.toString()) {
    req.event = event;
    return next();
  }

  // Guest must be joined to the event
  if (req.user.role === 'Guest') {
    const isMember = event.Members.some(
      p => p.user.toString() === req.user._id.toString() && p.isApproved
    );

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You must join this event first'
      });
    }

    req.event = event;
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Access denied. Guest role required'
  });
});

// Combined event access for Members and Guests (for song requests, likes)
const eventParticipantAccess = asyncHandler(async (req, res, next) => {
  const eventId = req.params.eventId || req.params.id;
  
  if (!eventId) {
    return res.status(400).json({
      success: false,
      message: 'Event ID is required'
    });
  }

  const Event = require('../models/Event');
  const event = await Event.findById(eventId);
  
  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found'
    });
  }

  // Admin and event manager have access
  if (req.user.role === 'Admin' || event.manager.toString() === req.user._id.toString()) {
    req.event = event;
    return next();
  }

  // Members and Guests must be joined to the event
  if (req.user.role === 'Member' || req.user.role === 'Manager' || req.user.role === 'Guest') {
    const isMember = event.Members.some(
      p => p.user.toString() === req.user._id.toString() && p.isApproved
    );

    // For guests, also check EventParticipant collection by email
    let isEventParticipant = false;
    if (req.user.role === 'Guest' && !isMember) {
      const EventParticipant = require('../models/EventParticipant');
      const participant = await EventParticipant.findOne({
        event: eventId,
        email: req.user.email,
        isApproved: true
      });
      isEventParticipant = !!participant;
    }

    if (!isMember && !isEventParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You must join this event first'
      });
    }

    req.event = event;
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Access denied. Member or Guest role required'
  });
});

// Legacy middleware for backward compatibility
const isEventManagerOrAdmin = managerEventAccess;
const isEventParticipant = eventParticipantAccess;

module.exports = {
  protect,
  authorize,
  optionalAuth,
  guestAccess,
  adminOnly,
  managerEventAccess,
  memberEventAccess,
  guestEventAccess,
  eventParticipantAccess,
  isEventManagerOrAdmin,
  isEventParticipant
};