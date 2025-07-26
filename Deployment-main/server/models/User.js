import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  // Basic Information
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@sece\.ac\.in$/, 'Email must end with @sece.ac.in']
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  userType: {
    type: String,
    enum: ['student', 'staff'],
    required: true
  },
  prefix: {
    type: String,
    enum: ['Mr', 'Mrs', 'Ms', 'Dr'],
    required: true
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  department: {
    type: String,
    required: true,
    trim: true
  },

  // Student-specific fields
  rollNo: {
    type: String,
    sparse: true, // Allows null/undefined for staff
    trim: true
  },
  year: {
    type: String,
    enum: ['1st Year', '2nd Year', '3rd Year', '4th Year']
  },
  section: {
    type: String,
    enum: ['A', 'B', 'C', 'D']
  },
  accommodation: {
    type: String,
    enum: ['Hostel', 'Day Scholar']
  },
  block: {
    type: String,
    trim: true
  },
  roomNo: {
    type: String,
    trim: true
  },

  // Staff-specific fields
  employeeId: {
    type: String,
    sparse: true, // Allows null/undefined for students
    trim: true
  },
  designation: {
    type: String,
    enum: ['HOD', 'Associate Professor', 'Assistant Professor', 'Lecturer', 'Technician', 'Staff', 'Admin']
  },

  // Authentication & Security
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  passwordChangedAt: {
    type: Date
  },
  passwordResetToken: String,
  passwordResetExpires: Date,
  refreshToken: String,

  // Profile & Preferences
  profilePicture: {
    type: String,
    default: null
  },
  bio: {
    type: String,
    maxlength: 500
  },
  preferences: {
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      sms: { type: Boolean, default: false }
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'light'
    },
    language: {
      type: String,
      enum: ['en', 'ta', 'hi'],
      default: 'en'
    }
  },

  // Statistics
  stats: {
    loginCount: { type: Number, default: 0 },
    announcementsRead: { type: Number, default: 0 },
    complaintsSubmitted: { type: Number, default: 0 },
    eventsAttended: { type: Number, default: 0 }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.prefix} ${this.firstName} ${this.lastName}`.trim();
});

// Virtual for display name
userSchema.virtual('displayName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Indexes for better query performance
userSchema.index({ email: 1 });
userSchema.index({ userType: 1 });
userSchema.index({ department: 1 });
userSchema.index({ rollNo: 1 });
userSchema.index({ employeeId: 1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 12);
    this.password = await bcrypt.hash(this.password, salt);
    this.passwordChangedAt = Date.now() - 1000; // Ensure token is created after password change
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to check if password was changed after token was issued
userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

// Method to get public profile (without sensitive data)
userSchema.methods.getPublicProfile = function() {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.refreshToken;
  delete userObject.passwordResetToken;
  delete userObject.passwordResetExpires;
  return userObject;
};

// Static method to find by email
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Static method to find active users
userSchema.statics.findActive = function() {
  return this.find({ isActive: true });
};

const User = mongoose.model('User', userSchema);

export default User; 