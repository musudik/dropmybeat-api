const jwt = require('jsonwebtoken');
const Person = require('../models/Person');
const Event = require('../models/Event');

// Authenticate socket connection
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      // Allow anonymous connections for public events
      socket.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await Person.findById(decoded.id).select('-password');
    
    if (!user) {
      return next(new Error('User not found'));
    }

    socket.user = user;
    next();
  } catch (error) {
    next(new Error('Authentication failed'));
  }
};

// Handle socket connection
const handleConnection = (io) => {
  return async (socket) => {
    console.log(`Socket connected: ${socket.id}`);
    
    // Join event room
    socket.on('joinEvent', async (data) => {
      try {
        const { eventId } = data;
        
        // Validate event exists
        const event = await Event.findById(eventId);
        if (!event) {
          socket.emit('error', { message: 'Event not found' });
          return;
        }

        // Check access permissions
        if (!event.isPublic && (!socket.user || !event.Members.includes(socket.user._id))) {
          socket.emit('error', { message: 'Access denied to this event' });
          return;
        }

        // Join the event room
        socket.join(`event_${eventId}`);
        socket.currentEvent = eventId;
        
        // Notify others in the room
        socket.to(`event_${eventId}`).emit('userJoined', {
          user: socket.user ? {
            id: socket.user._id,
            firstName: socket.user.firstName,
            lastName: socket.user.lastName
          } : { firstName: 'Anonymous', lastName: 'User' },
          timestamp: new Date()
        });

        // Send current event status
        socket.emit('eventJoined', {
          eventId,
          message: 'Successfully joined event',
          timestamp: new Date()
        });

        console.log(`User ${socket.user?.firstName || 'Anonymous'} joined event ${eventId}`);
      } catch (error) {
        socket.emit('error', { message: 'Failed to join event' });
      }
    });

    // Leave event room
    socket.on('leaveEvent', (data) => {
      const { eventId } = data;
      
      if (socket.currentEvent === eventId) {
        socket.leave(`event_${eventId}`);
        socket.to(`event_${eventId}`).emit('userLeft', {
          user: socket.user ? {
            id: socket.user._id,
            firstName: socket.user.firstName,
            lastName: socket.user.lastName
          } : { firstName: 'Anonymous', lastName: 'User' },
          timestamp: new Date()
        });
        
        socket.currentEvent = null;
        console.log(`User ${socket.user?.firstName || 'Anonymous'} left event ${eventId}`);
      }
    });

    // Handle typing indicators for song requests
    socket.on('typing', (data) => {
      const { eventId, isTyping } = data;
      
      if (socket.currentEvent === eventId && socket.user) {
        socket.to(`event_${eventId}`).emit('userTyping', {
          user: {
            id: socket.user._id,
            firstName: socket.user.firstName,
            lastName: socket.user.lastName
          },
          isTyping,
          timestamp: new Date()
        });
      }
    });

    // Handle real-time chat messages (if needed)
    socket.on('sendMessage', async (data) => {
      try {
        const { eventId, message } = data;
        
        if (!socket.user) {
          socket.emit('error', { message: 'Authentication required for messaging' });
          return;
        }

        if (socket.currentEvent !== eventId) {
          socket.emit('error', { message: 'You must join the event first' });
          return;
        }

        // Validate event access
        const event = await Event.findById(eventId);
        if (!event || (!event.isPublic && !event.Members.includes(socket.user._id))) {
          socket.emit('error', { message: 'Access denied' });
          return;
        }

        const messageData = {
          id: Date.now().toString(),
          user: {
            id: socket.user._id,
            firstName: socket.user.firstName,
            lastName: socket.user.lastName,
            profilePicture: socket.user.profilePicture
          },
          message: message.trim(),
          timestamp: new Date()
        };

        // Broadcast to all users in the event room
        io.to(`event_${eventId}`).emit('newMessage', messageData);
        
        console.log(`Message sent in event ${eventId} by ${socket.user.firstName}`);
      } catch (error) {
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      if (socket.currentEvent) {
        socket.to(`event_${socket.currentEvent}`).emit('userLeft', {
          user: socket.user ? {
            id: socket.user._id,
            firstName: socket.user.firstName,
            lastName: socket.user.lastName
          } : { firstName: 'Anonymous', lastName: 'User' },
          timestamp: new Date()
        });
      }
      
      console.log(`Socket disconnected: ${socket.id}`);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  };
};

module.exports = {
  authenticateSocket,
  handleConnection
};