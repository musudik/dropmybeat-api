const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Define enums
const Role = {
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  PARTICIPANT: 'Participant'
};

const personSchema = new mongoose.Schema({
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
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },
  role: {
    type: String,
    enum: Object.values(Role),
    default: Role.PARTICIPANT,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  profilePicture: {
    type: String,
    default: null
  },
  phoneNumber: {
    type: String,
    trim: true,
    match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number']
  },
  dateOfBirth: {
    type: Date
  },
  // Manager-specific fields
  organizationName: {
    type: String,
    trim: true,
    maxlength: [100, 'Organization name cannot exceed 100 characters']
  },
  // Participant-specific fields
  favoriteGenres: [{
    type: String,
    trim: true
  }],
  // Tracking fields
  lastLogin: {
    type: Date
  },
  loginCount: {
    type: Number,
    default: 0
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

// Virtual for full name
personSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Indexes for performance
// Remove this line (line 100) as it duplicates the unique: true in the schema
// personSchema.index({ email: 1 }); // DELETE THIS LINE
personSchema.index({ role: 1 });
personSchema.index({ isActive: 1 });
personSchema.index({ createdAt: -1 });

// Pre-save middleware to hash password
personSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  
  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to check password
personSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Instance method to get public profile
personSchema.methods.getPublicProfile = function() {
  const person = this.toObject();
  delete person.password;
  return person;
};

// Static method to find active users
personSchema.statics.findActive = function() {
  return this.find({ isActive: true });
};

// Static method to find by role
personSchema.statics.findByRole = function(role) {
  return this.find({ role, isActive: true });
};

module.exports = mongoose.model('Person', personSchema);
module.exports.Role = Role;