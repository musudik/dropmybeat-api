const mongoose = require('mongoose');

const eventParticipantSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: [true, 'Event is required']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  isApproved: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Create compound unique index for email and lastName per event
eventParticipantSchema.index({ event: 1, email: 1, lastName: 1 }, { unique: true });

// Additional indexes for performance
eventParticipantSchema.index({ event: 1 });
eventParticipantSchema.index({ email: 1 });
eventParticipantSchema.index({ createdAt: -1 });

// Virtual for full name
eventParticipantSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Static method to find participants by event
eventParticipantSchema.statics.findByEvent = function(eventId) {
  return this.find({ event: eventId }).populate('event', 'name startDate endDate');
};

// Static method to check if participant already exists
eventParticipantSchema.statics.participantExists = function(eventId, email, lastName) {
  return this.findOne({ 
    event: eventId, 
    email: email.toLowerCase(), 
    lastName: lastName 
  });
};

module.exports = mongoose.model('EventParticipant', eventParticipantSchema);