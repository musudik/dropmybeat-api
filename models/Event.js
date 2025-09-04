const mongoose = require('mongoose');

// Define enums
const EventType = {
  WEDDING: 'Wedding',
  BIRTHDAY: 'Birthday',
  CORPORATE: 'Corporate',
  CLUB: 'Club',
  FESTIVAL: 'Festival',
  PRIVATE: 'Private',
  OTHER: 'Other'
};

const EventStatus = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  ACTIVE: 'Active',
  PAUSED: 'Paused',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled'
};

const eventSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Event name is required'],
    trim: true,
    maxlength: [100, 'Event name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  eventType: {
    type: String,
    enum: Object.values(EventType),
    required: [true, 'Event type is required']
  },
  status: {
    type: String,
    enum: Object.values(EventStatus),
    default: EventStatus.DRAFT,
    required: true
  },
  // Event timing
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required']
  },
  // Location details
  venue: {
    name: {
      type: String,
      required: [true, 'Venue name is required'],
      trim: true,
      maxlength: [100, 'Venue name cannot exceed 100 characters']
    },
    address: {
      type: String,
      required: [true, 'Venue address is required'],
      trim: true,
      maxlength: [200, 'Address cannot exceed 200 characters']
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
      maxlength: [50, 'City cannot exceed 50 characters']
    },
    state: {
      type: String,
      trim: true,
      maxlength: [50, 'State cannot exceed 50 characters']
    },
    zipCode: {
      type: String,
      trim: true,
      maxlength: [10, 'Zip code cannot exceed 10 characters']
    },
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  // Event management
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Person',
    required: [true, 'Event manager is required']
  },
  // Event settings
  maxMembers: {
    type: Number,
    min: [1, 'Maximum Members must be at least 1'],
    max: [10000, 'Maximum Members cannot exceed 10000']
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  requiresApproval: {
    type: Boolean,
    default: false
  },
  // Song request settings
  maxSongsPerUser: {
    type: Number,
    default: 5,
    min: [1, 'Max songs per user must be at least 1'],
    max: [50, 'Max songs per user cannot exceed 50']
  },
  allowDuplicates: {
    type: Boolean,
    default: false
  },
  // TimeBomb feature settings
  timeBombEnabled: {
    type: Boolean,
    default: false
  },
  timeBombDuration: {
    type: Number, // in minutes
    default: 30,
    min: [5, 'TimeBomb duration must be at least 5 minutes'],
    max: [180, 'TimeBomb duration cannot exceed 180 minutes']
  },
  // Media
  logo: {
    type: mongoose.Schema.Types.ObjectId, // GridFS file ID
    default: null
  },
  bannerImage: {
    type: mongoose.Schema.Types.ObjectId, // GridFS file ID
    default: null
  },
  // Access control
  accessCode: {
    type: String,
    trim: true,
    minlength: [4, 'Access code must be at least 4 characters'],
    maxlength: [20, 'Access code cannot exceed 20 characters']
  },
  // Members
  Members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Person',
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    isApproved: {
      type: Boolean,
      default: true
    }
  }],
  // Statistics
  totalSongRequests: {
    type: Number,
    default: 0
  },
  totalLikes: {
    type: Number,
    default: 0
  },
  // Audit fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Person',
    required: true
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

// Virtual for Member count
eventSchema.virtual('MemberCount').get(function() {
  return this.Members ? this.Members.length : 0;
});

// Virtual for active status (temporary - for testing only)
eventSchema.virtual('isActive').get(function() {
  // For testing: only check status, ignore dates
  return this.status === EventStatus.ACTIVE;
  
  // Original logic (uncomment when ready):
  // const now = new Date();
  // return this.status === EventStatus.ACTIVE && 
  //        this.startDate <= now && 
  //        this.endDate >= now;
});

// Indexes for performance
eventSchema.index({ manager: 1 });
eventSchema.index({ status: 1 });
eventSchema.index({ startDate: 1 });
eventSchema.index({ endDate: 1 });
eventSchema.index({ eventType: 1 });
eventSchema.index({ isPublic: 1 });
eventSchema.index({ 'Members.user': 1 });
eventSchema.index({ createdAt: -1 });

// Compound indexes
eventSchema.index({ status: 1, startDate: 1 });
eventSchema.index({ manager: 1, status: 1 });

// Pre-save validation
eventSchema.pre('save', function(next) {
  // Validate date range
  if (this.startDate >= this.endDate) {
    return next(new Error('End date must be after start date'));
  }
  
  // Validate TimeBomb settings
  if (this.timeBombEnabled && !this.timeBombDuration) {
    return next(new Error('TimeBomb duration is required when TimeBomb is enabled'));
  }
  
  next();
});

// Instance methods
eventSchema.methods.addMember = function(userId, isApproved = true) {
  const existingMember = this.Members.find(
    p => p.user.toString() === userId.toString()
  );
  
  if (existingMember) {
    throw new Error('User is already a Member');
  }
  
  this.Members.push({
    user: userId,
    isApproved,
    joinedAt: new Date()
  });
  
  return this.save();
};

eventSchema.methods.removeMember = function(userId) {
  this.Members = this.Members.filter(
    p => p.user.toString() !== userId.toString()
  );
  
  return this.save();
};

eventSchema.methods.isMember = function(userId) {
  return this.Members.some(
    p => p.user.toString() === userId.toString() && p.isApproved
  );
};

// Static methods
eventSchema.statics.findActiveEvents = function() {
  const now = new Date();
  return this.find({
    status: EventStatus.ACTIVE,
    startDate: { $lte: now },
    endDate: { $gte: now }
  });
};

eventSchema.statics.findByManager = function(managerId) {
  return this.find({ manager: managerId }).sort({ createdAt: -1 });
};

eventSchema.statics.findPublicEvents = function() {
  return this.find({ 
    isPublic: true, 
    status: { $in: [EventStatus.PUBLISHED, EventStatus.ACTIVE] }
  }).sort({ startDate: 1 });
};

module.exports = mongoose.model('Event', eventSchema);
module.exports.EventType = EventType;
module.exports.EventStatus = EventStatus;