const { Server } = require('socket.io');
const { authenticateSocket, handleConnection } = require('./eventHandlers');

const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  // Authentication middleware
  io.use(authenticateSocket);

  // Handle connections
  io.on('connection', handleConnection(io));

  // Helper function to emit to specific event rooms
  io.emitToEvent = (eventId, event, data) => {
    io.to(`event_${eventId}`).emit(event, data);
  };

  // Helper function to get room info
  io.getEventRoomInfo = async (eventId) => {
    const room = io.sockets.adapter.rooms.get(`event_${eventId}`);
    return {
      connectedUsers: room ? room.size : 0,
      roomExists: !!room
    };
  };

  console.log('Socket.io initialized successfully');
  return io;
};

module.exports = initializeSocket;