# DropMyBeats Backend API

## Overview

DropMyBeats is an interactive mobile application backend that facilitates real-time song requests and interactions between DJs and participants at events. The backend supports role-based access control, real-time updates, file management, and scalable event management.

## Features

- **Role-Based Access Control**: Admin, Manager, and Participant roles with specific permissions
- **Real-Time Communication**: Socket.io for live song requests and updates
- **Event Management**: Create, manage, and join events with unique links/QR codes
- **Song Request System**: Request, like, and manage songs with TimeBomb feature
- **File Upload**: AWS S3 integration for event logos
- **Authentication**: JWT-based secure authentication
- **Scalable Architecture**: Built for 500+ participants per event

## Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JSON Web Tokens (JWT)
- **Real-time**: Socket.io
- **File Storage**: AWS S3
- **Validation**: express-validator
- **Security**: Helmet, CORS, bcryptjs
- **Testing**: Jest, Supertest

## Project Structure
backend/
├── config/
│   ├── aws.js              # AWS S3 configuration
│   ├── database.js         # MongoDB connection
│   └── jwt.js              # JWT utilities
├── controllers/
│   ├── authController.js   # Authentication logic
│   ├── eventController.js  # Event management
│   ├── personController.js # User management
│   └── songRequestController.js # Song request logic
├── middleware/
│   ├── auth.js            # Authentication middleware
│   ├── errorHandler.js    # Error handling
│   └── validation.js      # Input validation
├── models/
│   ├── Event.js           # Event schema
│   ├── Person.js          # User schema
│   └── SongRequest.js     # Song request schema
├── routes/
│   ├── auth.js            # Authentication routes
│   ├── events.js          # Event routes
│   ├── persons.js         # User routes
│   └── songRequests.js    # Song request routes
├── sockets/
│   ├── eventHandlers.js   # Socket event handlers
│   └── index.js           # Socket.io configuration
├── utils/
│   ├── asyncHandler.js    # Async error wrapper
│   └── errorResponse.js   # Custom error class
├── .env                   # Environment variables
├── .gitignore            # Git ignore rules
├── package.json          # Dependencies
├── README.md             # Documentation
└── server.js             # Main server file


## Prerequisites

- Node.js 18 or higher
- MongoDB (local or MongoDB Atlas)
- AWS Account (for S3 file storage)
- npm or yarn package manager

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd dropmybeat-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   
   Configure the following environment variables:
   ```env
   NODE_ENV=development
   PORT=8080
   MONGODB_URI=mongodb://localhost:27017/dropmybeats
   JWT_SECRET=your-super-secret-jwt-key
   JWT_REFRESH_SECRET=your-refresh-secret-key
   JWT_EXPIRE=15m
   JWT_REFRESH_EXPIRE=7d
   
   # AWS Configuration
   AWS_ACCESS_KEY_ID=your-aws-access-key
   AWS_SECRET_ACCESS_KEY=your-aws-secret-key
   AWS_REGION=us-east-1
   S3_BUCKET_NAME=dropmybeats-logos
   
   # CORS
   ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
   ```

4. **Database Setup**
   - Ensure MongoDB is running locally or configure MongoDB Atlas connection
   - The application will automatically create necessary collections

5. **AWS S3 Setup**
   - Create an S3 bucket for file storage
   - Configure IAM user with S3 permissions
   - Update AWS credentials in .env file

## Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

### Testing
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## API Documentation

The API follows RESTful conventions and includes the following main endpoints:

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Person Management
- `GET /api/persons` - Get all persons (Admin only)
- `POST /api/persons` - Create person (Role-based)
- `GET /api/persons/:id` - Get person by ID
- `PUT /api/persons/:id` - Update person
- `DELETE /api/persons/:id` - Delete person
- `POST /api/persons/:id/activate` - Activate person (Admin only)
- `POST /api/persons/:id/deactivate` - Deactivate person (Admin only)

### Event Management
- `GET /api/events` - Get all events
- `GET /api/events/:id` - Get single event
- `POST /api/events` - Create event
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event
- `POST /api/events/:id/join` - Join event
- `POST /api/events/:id/leave` - Leave event

### Participant Management
- `GET /api/events/:eventId/participants` - Get event participants
- `POST /api/events/:eventId/participants` - Add participant
- `PUT /api/events/:eventId/participants/:personId` - Update participant
- `DELETE /api/events/:eventId/participants/:personId` - Remove participant

### Song Requests
- `GET /api/events/:eventId/song-requests` - Get song requests
- `POST /api/events/:eventId/song-requests` - Create song request
- `GET /api/events/:eventId/song-requests/:id` - Get single request
- `PUT /api/events/:eventId/song-requests/:id` - Update request
- `DELETE /api/events/:eventId/song-requests/:id` - Delete request
- `POST /api/events/:eventId/song-requests/:id/like` - Like/Unlike song
- `POST /api/events/:eventId/song-requests/:id/approve` - Approve song
- `POST /api/events/:eventId/song-requests/:id/reject` - Reject song
- `GET /api/events/:eventId/queue` - Get event queue
- `GET /api/events/:eventId/timebombs` - Get TimeBomb requests
- `GET /api/events/:eventId/stats` - Get event statistics

## Real-Time Features

The application uses Socket.io for real-time communication:

### Socket Events
- `join-event` - Join event room for real-time updates
- `new-song-request` - Broadcast new song requests
- `song-liked` - Broadcast song likes
- `song-status-changed` - Broadcast song status updates
- `timebomb-triggered` - Notify when TimeBomb feature activates

## Role-Based Access Control

### Admin
- Manage Managers (create, update, delete, activate/deactivate)
- View all system data
- System administration tasks

### Manager
- Manage Events (create, update, delete, activate/deactivate)
- Manage Participants within their events
- Manage Song Requests within their events
- Upload event logos

### Participant
- Join events via link/QR code
- Request songs
- Like song requests
- View event details and song queue

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-Based Authorization**: Granular permission control
- **Input Validation**: Comprehensive request validation
- **Rate Limiting**: API abuse prevention
- **CORS Protection**: Cross-origin request security
- **Helmet Security**: HTTP security headers
- **Password Hashing**: bcrypt for secure password storage

## Performance Considerations

- **Database Indexing**: Optimized queries with proper indexes
- **Connection Pooling**: Efficient database connections
- **Compression**: Response compression for better performance
- **Caching**: Redis integration ready for scaling
- **File Upload Limits**: 5MB limit for logo uploads

## Deployment

### AWS Deployment
1. **EC2 Instance**: t3.small or larger
2. **MongoDB Atlas**: M10 cluster recommended
3. **S3 Bucket**: For file storage
4. **CloudFront**: CDN for static assets (optional)
5. **Route 53**: DNS management

### Docker Deployment
```bash
# Build Docker image
docker build -t dropmybeats-backend .

# Run container
docker run -p 8080:8080 --env-file .env dropmybeats-backend
```

### Environment Variables for Production
```env
NODE_ENV=production
PORT=8080
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dropmybeats
JWT_SECRET=production-secret-key
AWS_ACCESS_KEY_ID=production-access-key
AWS_SECRET_ACCESS_KEY=production-secret-key
S3_BUCKET_NAME=dropmybeats-production-logos
ALLOWED_ORIGINS=https://yourdomain.com
```

## Monitoring and Logging

- **Winston Logger**: Structured logging with different levels
- **Health Check Endpoint**: `/health` for monitoring
- **Error Tracking**: Comprehensive error handling and logging
- **Performance Metrics**: Request timing and database query monitoring

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Testing Strategy

- **Unit Tests**: Individual function and method testing
- **Integration Tests**: API endpoint testing
- **Load Testing**: Performance under concurrent users
- **Security Testing**: Authentication and authorization testing

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation and API reference

## Changelog

### Version 1.0.0
- Initial release
- Core API functionality
- Real-time features
- Authentication system
- File upload capabilities

---
🔐 Test Accounts:
   Admin: admin@dropmybeats.com / Admin123!
   Manager: sarah.manager@dropmybeats.com / Manager123!
   DJ: mike.dj@dropmybeats.com / Manager123!
   User: alice@example.com / User123!


**Note**: This backend is designed to work with the DropMyBeats mobile application and web dashboard. Ensure all components are properly configured for full functionality.