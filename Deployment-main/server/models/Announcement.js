import mongoose from 'mongoose';

const announcementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true,
    maxlength: 5000
  },
  category: {
    type: String,
    enum: ['academic', 'hostel', 'events', 'general', 'urgent', 'sports', 'cultural', 'technical'],
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  department: {
    type: String,
    required: true,
    trim: true
  },
  targetAudience: [{
    type: String,
    enum: ['all', 'students', 'staff', 'hostel', 'day-scholar', '1st-year', '2nd-year', '3rd-year', '4th-year', 'cse', 'ece', 'eee', 'mech', 'civil']
  }],
  attachments: [{
    name: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    },
    type: {
      type: String,
      required: true
    },
    size: {
      type: Number
    }
  }],
  isPublished: {
    type: Boolean,
    default: false
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  publishDate: {
    type: Date,
    default: Date.now
  },
  expiryDate: {
    type: Date
  },
  views: {
    type: Number,
    default: 0
  },
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  bookmarkedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  tags: [{
    type: String,
    trim: true
  }],
  location: {
    type: String,
    trim: true
  },
  contactInfo: {
    name: String,
    email: String,
    phone: String
  },
  relatedLinks: [{
    title: String,
    url: String
  }],
  status: {
    type: String,
    enum: ['draft', 'published', 'archived', 'expired'],
    default: 'draft'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for formatted date
announcementSchema.virtual('formattedDate').get(function() {
  return this.publishDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

// Virtual for time ago
announcementSchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const diffInSeconds = Math.floor((now - this.publishDate) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
});

// Virtual for is expired
announcementSchema.virtual('isExpired').get(function() {
  if (!this.expiryDate) return false;
  return new Date() > this.expiryDate;
});

// Virtual for read count
announcementSchema.virtual('readCount').get(function() {
  return this.readBy.length;
});

// Virtual for bookmark count
announcementSchema.virtual('bookmarkCount').get(function() {
  return this.bookmarkedBy.length;
});

// Indexes for better query performance
announcementSchema.index({ category: 1, priority: 1 });
announcementSchema.index({ publishDate: -1 });
announcementSchema.index({ author: 1 });
announcementSchema.index({ department: 1 });
announcementSchema.index({ targetAudience: 1 });
announcementSchema.index({ isPublished: 1, status: 1 });
announcementSchema.index({ expiryDate: 1 });
announcementSchema.index({ isPinned: -1, publishDate: -1 });

// Pre-save middleware to update status based on expiry
announcementSchema.pre('save', function(next) {
  if (this.expiryDate && new Date() > this.expiryDate) {
    this.status = 'expired';
  }
  next();
});

// Static method to find published announcements
announcementSchema.statics.findPublished = function() {
  return this.find({ 
    isPublished: true, 
    status: { $ne: 'expired' },
    $or: [
      { expiryDate: { $exists: false } },
      { expiryDate: { $gt: new Date() } }
    ]
  });
};

// Static method to find announcements by category
announcementSchema.statics.findByCategory = function(category) {
  return this.find({ 
    category, 
    isPublished: true,
    status: { $ne: 'expired' }
  });
};

// Static method to find urgent announcements
announcementSchema.statics.findUrgent = function() {
  return this.find({ 
    priority: { $in: ['high', 'critical'] },
    isPublished: true,
    status: { $ne: 'expired' }
  });
};

// Method to mark as read by user
announcementSchema.methods.markAsRead = function(userId) {
  const existingRead = this.readBy.find(read => read.user.toString() === userId.toString());
  if (!existingRead) {
    this.readBy.push({ user: userId });
    this.views += 1;
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to toggle bookmark
announcementSchema.methods.toggleBookmark = function(userId) {
  const bookmarkIndex = this.bookmarkedBy.findIndex(id => id.toString() === userId.toString());
  if (bookmarkIndex > -1) {
    this.bookmarkedBy.splice(bookmarkIndex, 1);
  } else {
    this.bookmarkedBy.push(userId);
  }
  return this.save();
};

// Method to check if user has read
announcementSchema.methods.hasUserRead = function(userId) {
  return this.readBy.some(read => read.user.toString() === userId.toString());
};

// Method to check if user has bookmarked
announcementSchema.methods.hasUserBookmarked = function(userId) {
  return this.bookmarkedBy.some(id => id.toString() === userId.toString());
};

const Announcement = mongoose.model('Announcement', announcementSchema);

export default Announcement; 