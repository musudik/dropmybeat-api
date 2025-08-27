const jwt = require('jsonwebtoken');
const Person = require('../models/Person');
const { asyncHandler } = require('./errorHandler');

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
      const user = await Person.findById(decoded.id).select('-password');
      
      if (user && user.isActive) {
        req.user = user;
      }
    } catch (error) {
      // Ignore token errors for optional auth
    }
  }

  next();
});

// Check if user is event manager or admin
const isEventManagerOrAdmin = asyncHandler(async (req, res, next) => {
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

  // Check if user is the event manager
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
      message: 'Not authorized to manage this event'
    });
  }

  req.event = event;
  next();
});

// Check if user is event participant
const isEventParticipant = asyncHandler(async (req, res, next) => {
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

  // Check if user is a participant
  const isParticipant = event.participants.some(
    p => p.user.toString() === req.user._id.toString() && p.isApproved
  );

  if (!isParticipant) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to access this event'
    });
  }

  req.event = event;
  next();
});

module.exports = {
  protect,
  authorize,
  optionalAuth,
  isEventManagerOrAdmin,
  isEventParticipant
};