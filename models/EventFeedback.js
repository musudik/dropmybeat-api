const mongoose = require('mongoose');

const EventFeedbackSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: [true, 'Event is required']
  },
  firstName: {
    type: String,
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1 star'],
    max: [5, 'Rating cannot exceed 5 stars']
  },
  comment: {
    type: String,
    required: [true, 'Comment is required'],
    trim: true,
    minlength: [10, 'Comment must be at least 10 characters'],
    maxlength: [1000, 'Comment cannot exceed 1000 characters']
  },
  isApproved: {
    type: Boolean,
    default: true
  },
  ipAddress: {
    type: String,
    required: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
EventFeedbackSchema.index({ event: 1 });
EventFeedbackSchema.index({ rating: 1 });
EventFeedbackSchema.index({ createdAt: -1 });
EventFeedbackSchema.index({ event: 1, createdAt: -1 });

// Removed the rate limiting index that prevented multiple feedback per event per day
// Users can now submit multiple feedback for the same event

// Virtual for anonymous display name
EventFeedbackSchema.virtual('displayName').get(function() {
  return this.firstName || 'Anonymous';
});

// Static methods
EventFeedbackSchema.statics.getEventStats = function(eventId) {
  return this.aggregate([
    { $match: { event: new mongoose.Types.ObjectId(eventId), isApproved: true } },
    {
      $group: {
        _id: null,
        totalFeedback: { $sum: 1 },
        averageRating: { $avg: '$rating' },
        ratingDistribution: {
          $push: '$rating'
        }
      }
    },
    {
      $project: {
        _id: 0,
        totalFeedback: 1,
        averageRating: { $round: ['$averageRating', 1] },
        ratingDistribution: {
          1: { $size: { $filter: { input: '$ratingDistribution', cond: { $eq: ['$$this', 1] } } } },
          2: { $size: { $filter: { input: '$ratingDistribution', cond: { $eq: ['$$this', 2] } } } },
          3: { $size: { $filter: { input: '$ratingDistribution', cond: { $eq: ['$$this', 3] } } } },
          4: { $size: { $filter: { input: '$ratingDistribution', cond: { $eq: ['$$this', 4] } } } },
          5: { $size: { $filter: { input: '$ratingDistribution', cond: { $eq: ['$$this', 5] } } } }
        }
      }
    }
  ]);
};

EventFeedbackSchema.statics.findByEvent = function(eventId, options = {}) {
  const { page = 1, limit = 10, approved = true } = options;
  const skip = (page - 1) * limit;
  
  return this.find({ 
    event: eventId, 
    isApproved: approved 
  })
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limit)
  .populate('event', 'name');
};

module.exports = mongoose.model('EventFeedback', EventFeedbackSchema);