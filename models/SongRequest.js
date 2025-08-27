const mongoose = require('mongoose');

// Define enums
const SongStatus = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  PLAYED: 'Played',
  SKIPPED: 'Skipped'
};

const songRequestSchema = new mongoose.Schema({
  // Song details
  title: {
    type: String,
    required: [true, 'Song title is required'],
    trim: true,
    maxlength: [200, 'Song title cannot exceed 200 characters']
  },
  artist: {
    type: String,
    required: [true, 'Artist name is required'],
    trim: true,
    maxlength: [200, 'Artist name cannot exceed 200 characters']
  },
  album: {
    type: String,
    trim: true,
    maxlength: [200, 'Album name cannot exceed 200 characters']
  },
  genre: {
    type: String,
    trim: true,
    maxlength: [50, 'Genre cannot exceed 50 characters']
  },
  duration: {
    type: Number, // in seconds
    min: [1, 'Duration must be at least 1 second'],
    max: [3600, 'Duration cannot exceed 1 hour']
  },
  releaseYear: {
    type: Number,
    min: [1900, 'Release year must be after 1900'],
    max: [new Date().getFullYear() + 1, 'Release year cannot be in the future']
  },
  
  // External service integration
  spotifyId: {
    type: String,
    trim: true
  },
  youtubeId: {
    type: String,
    trim: true
  },
  appleMusicId: {
    type: String,
    trim: true
  },
  
  // Request details
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: [true, 'Event is required']
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Person',
    required: [true, 'Requester is required']
  },
  status: {
    type: String,
    enum: Object.values(SongStatus),
    default: SongStatus.PENDING,
    required: true
  },
  
  // Priority and ordering
  priority: {
    type: Number,
    default: 0,
    min: [0, 'Priority cannot be negative']
  },
  queuePosition: {
    type: Number,
    min: [1, 'Queue position must be at least 1']
  },
  
  // Engagement metrics
  likes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Person',
      required: true
    },
    likedAt: {
      type: Date,
      default: Date.now
    }
  }],
  likeCount: {
    type: Number,
    default: 0
  },
  
  // Comments/Notes
  requestNote: {
    type: String,
    trim: true,
    maxlength: [500, 'Request note cannot exceed 500 characters']
  },
  djNote: {
    type: String,
    trim: true,
    maxlength: [500, 'DJ note cannot exceed 500 characters']
  },
  
  // TimeBomb feature
  isTimeBomb: {
    type: Boolean,
    default: false
  },
  timeBombExpiresAt: {
    type: Date
  },
  timeBombAmount: {
    type: Number, // tip amount for TimeBomb
    min: [0, 'TimeBomb amount cannot be negative']
  },
  
  // Playback tracking
  playedAt: {
    type: Date
  },
  playedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Person'
  },
  playDuration: {
    type: Number, // actual play duration in seconds
    min: [0, 'Play duration cannot be negative']
  },
  
  // Rejection details
  rejectedAt: {
    type: Date
  },
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Person'
  },
  rejectionReason: {
    type: String,
    trim: true,
    maxlength: [200, 'Rejection reason cannot exceed 200 characters']
  },
  
  // Duplicate detection
  isDuplicate: {
    type: Boolean,
    default: false
  },
  originalRequest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SongRequest'
  },
  
  // Audit fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Person'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Person'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full song name
songRequestSchema.virtual('fullSongName').get(function() {
  return `${this.artist} - ${this.title}`;
});

// Virtual for TimeBomb status
songRequestSchema.virtual('isTimeBombActive').get(function() {
  if (!this.isTimeBomb || !this.timeBombExpiresAt) return false;
  return new Date() < this.timeBombExpiresAt;
});

// Virtual for time remaining on TimeBomb
songRequestSchema.virtual('timeBombTimeRemaining').get(function() {
  if (!this.isTimeBombActive) return 0;
  return Math.max(0, this.timeBombExpiresAt - new Date());
});

// Indexes for performance
songRequestSchema.index({ event: 1 });
songRequestSchema.index({ requestedBy: 1 });
songRequestSchema.index({ status: 1 });
songRequestSchema.index({ queuePosition: 1 });
songRequestSchema.index({ priority: -1 });
songRequestSchema.index({ likeCount: -1 });
songRequestSchema.index({ createdAt: -1 });
songRequestSchema.index({ isTimeBomb: 1, timeBombExpiresAt: 1 });
songRequestSchema.index({ 'likes.user': 1 });

// Compound indexes
songRequestSchema.index({ event: 1, status: 1 });
songRequestSchema.index({ event: 1, queuePosition: 1 });
songRequestSchema.index({ event: 1, priority: -1, likeCount: -1 });
songRequestSchema.index({ title: 1, artist: 1, event: 1 }); // For duplicate detection

// Text index for search
songRequestSchema.index({
  title: 'text',
  artist: 'text',
  album: 'text',
  genre: 'text'
});

// Pre-save middleware
songRequestSchema.pre('save', async function(next) {
  // Update like count
  this.likeCount = this.likes ? this.likes.length : 0;
  
  // Set TimeBomb expiration if not set
  if (this.isTimeBomb && !this.timeBombExpiresAt) {
    // Get event to determine TimeBomb duration
    const Event = mongoose.model('Event');
    const event = await Event.findById(this.event);
    if (event && event.timeBombEnabled) {
      const duration = event.timeBombDuration || 30; // default 30 minutes
      this.timeBombExpiresAt = new Date(Date.now() + duration * 60 * 1000);
    }
  }
  
  // Auto-assign queue position if not set
  if (!this.queuePosition && this.status === SongStatus.APPROVED) {
    const lastInQueue = await this.constructor.findOne({
      event: this.event,
      status: { $in: [SongStatus.APPROVED, SongStatus.PENDING] }
    }).sort({ queuePosition: -1 });
    
    this.queuePosition = lastInQueue ? lastInQueue.queuePosition + 1 : 1;
  }
  
  next();
});

// Instance methods
songRequestSchema.methods.addLike = function(userId) {
  const existingLike = this.likes.find(
    like => like.user.toString() === userId.toString()
  );
  
  if (existingLike) {
    throw new Error('User has already liked this song');
  }
  
  this.likes.push({
    user: userId,
    likedAt: new Date()
  });
  
  return this.save();
};

songRequestSchema.methods.removeLike = function(userId) {
  this.likes = this.likes.filter(
    like => like.user.toString() !== userId.toString()
  );
  
  return this.save();
};

songRequestSchema.methods.hasUserLiked = function(userId) {
  return this.likes.some(
    like => like.user.toString() === userId.toString()
  );
};

songRequestSchema.methods.approve = function(approvedBy) {
  this.status = SongStatus.APPROVED;
  this.updatedBy = approvedBy;
  return this.save();
};

songRequestSchema.methods.reject = function(rejectedBy, reason) {
  this.status = SongStatus.REJECTED;
  this.rejectedBy = rejectedBy;
  this.rejectedAt = new Date();
  this.rejectionReason = reason;
  this.updatedBy = rejectedBy;
  return this.save();
};

songRequestSchema.methods.markAsPlayed = function(playedBy, duration) {
  this.status = SongStatus.PLAYED;
  this.playedBy = playedBy;
  this.playedAt = new Date();
  this.playDuration = duration;
  this.updatedBy = playedBy;
  return this.save();
};

// Static methods
songRequestSchema.statics.findByEvent = function(eventId, status = null) {
  const query = { event: eventId };
  if (status) query.status = status;
  
  return this.find(query)
    .populate('requestedBy', 'firstName lastName')
    .sort({ priority: -1, likeCount: -1, createdAt: 1 });
};

songRequestSchema.statics.findQueue = function(eventId) {
  return this.find({
    event: eventId,
    status: SongStatus.APPROVED
  })
  .populate('requestedBy', 'firstName lastName')
  .sort({ queuePosition: 1 });
};

songRequestSchema.statics.findTimeBombs = function(eventId) {
  return this.find({
    event: eventId,
    isTimeBomb: true,
    timeBombExpiresAt: { $gt: new Date() },
    status: { $in: [SongStatus.PENDING, SongStatus.APPROVED] }
  })
  .populate('requestedBy', 'firstName lastName')
  .sort({ timeBombExpiresAt: 1 });
};

songRequestSchema.statics.findDuplicates = function(eventId, title, artist) {
  return this.find({
    event: eventId,
    title: new RegExp(title, 'i'),
    artist: new RegExp(artist, 'i'),
    status: { $ne: SongStatus.REJECTED }
  });
};

songRequestSchema.statics.getEventStats = function(eventId) {
  return this.aggregate([
    { $match: { event: mongoose.Types.ObjectId(eventId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalLikes: { $sum: '$likeCount' }
      }
    }
  ]);
};

module.exports = mongoose.model('SongRequest', songRequestSchema);
module.exports.SongStatus = SongStatus;