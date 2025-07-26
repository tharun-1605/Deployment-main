import mongoose from 'mongoose';

const complaintSchema = new mongoose.Schema({
  complainant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    enum: ['hostel', 'academic', 'infrastructure', 'security', 'food', 'transport', 'other'],
    required: true
  },
  subCategory: {
    type: String,
    trim: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  subject: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
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
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'resolved', 'rejected', 'closed'],
    default: 'pending'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedAt: {
    type: Date
  },
  estimatedResolutionTime: {
    type: Date
  },
  actualResolutionTime: {
    type: Date
  },
  responses: [{
    responder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    message: {
      type: String,
      required: true,
      maxlength: 1000
    },
    isInternal: {
      type: Boolean,
      default: false
    },
    attachments: [{
      name: String,
      url: String,
      type: String,
      size: Number
    }],
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  resolution: {
    description: String,
    actionTaken: String,
    cost: Number,
    materialsUsed: [String],
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    completedAt: Date
  },
  rating: {
    score: {
      type: Number,
      min: 1,
      max: 5
    },
    feedback: {
      type: String,
      maxlength: 500
    },
    ratedAt: {
      type: Date
    }
  },
  tags: [{
    type: String,
    trim: true
  }],
  isAnonymous: {
    type: Boolean,
    default: false
  },
  isUrgent: {
    type: Boolean,
    default: false
  },
  escalationLevel: {
    type: Number,
    default: 0,
    min: 0,
    max: 3
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for formatted submission date
complaintSchema.virtual('formattedSubmissionDate').get(function() {
  return this.createdAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
});

// Virtual for time since submission
complaintSchema.virtual('timeSinceSubmission').get(function() {
  const now = new Date();
  const diffInHours = Math.floor((now - this.createdAt) / (1000 * 60 * 60));
  
  if (diffInHours < 1) return 'Less than 1 hour';
  if (diffInHours < 24) return `${diffInHours} hours`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays} days`;
  return `${Math.floor(diffInDays / 7)} weeks`;
});

// Virtual for response count
complaintSchema.virtual('responseCount').get(function() {
  return this.responses.length;
});

// Virtual for is overdue
complaintSchema.virtual('isOverdue').get(function() {
  if (this.estimatedResolutionTime) {
    return new Date() > this.estimatedResolutionTime && this.status !== 'resolved';
  }
  return false;
});

// Virtual for status color
complaintSchema.virtual('statusColor').get(function() {
  const colors = {
    'pending': 'yellow',
    'in-progress': 'blue',
    'resolved': 'green',
    'rejected': 'red',
    'closed': 'gray'
  };
  return colors[this.status] || 'gray';
});

// Indexes for better query performance
complaintSchema.index({ complainant: 1 });
complaintSchema.index({ status: 1 });
complaintSchema.index({ category: 1 });
complaintSchema.index({ priority: 1 });
complaintSchema.index({ assignedTo: 1 });
complaintSchema.index({ createdAt: -1 });
complaintSchema.index({ isUrgent: -1, createdAt: -1 });
complaintSchema.index({ escalationLevel: -1 });

// Pre-save middleware to update lastUpdated
complaintSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

// Static method to find complaints by status
complaintSchema.statics.findByStatus = function(status) {
  return this.find({ status }).populate('complainant', 'firstName lastName email userType');
};

// Static method to find urgent complaints
complaintSchema.statics.findUrgent = function() {
  return this.find({ 
    $or: [
      { priority: { $in: ['high', 'urgent'] } },
      { isUrgent: true }
    ]
  });
};

// Static method to find complaints by category
complaintSchema.statics.findByCategory = function(category) {
  return this.find({ category });
};

// Method to add response
complaintSchema.methods.addResponse = function(responseData) {
  this.responses.push(responseData);
  this.lastUpdated = new Date();
  return this.save();
};

// Method to update status
complaintSchema.methods.updateStatus = function(newStatus, userId = null) {
  this.status = newStatus;
  this.lastUpdated = new Date();
  
  if (newStatus === 'in-progress' && !this.assignedTo && userId) {
    this.assignedTo = userId;
    this.assignedAt = new Date();
  }
  
  if (newStatus === 'resolved') {
    this.actualResolutionTime = new Date();
  }
  
  return this.save();
};

// Method to escalate complaint
complaintSchema.methods.escalate = function() {
  if (this.escalationLevel < 3) {
    this.escalationLevel += 1;
    this.isUrgent = true;
    this.lastUpdated = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to add rating
complaintSchema.methods.addRating = function(score, feedback = '') {
  this.rating = {
    score,
    feedback,
    ratedAt: new Date()
  };
  return this.save();
};

const Complaint = mongoose.model('Complaint', complaintSchema);

export default Complaint; 