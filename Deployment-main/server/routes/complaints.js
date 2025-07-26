import express from 'express';
import { body, validationResult, query } from 'express-validator';
import Complaint from '../models/Complaint.js';
import User from '../models/User.js';
import { protect, isStudent, isStaff } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get all complaints (filtered by user role)
// @route   GET /api/complaints
// @access  Private
router.get('/', [
  protect,
  query('status').optional().isIn(['pending', 'in-progress', 'resolved', 'rejected', 'closed']),
  query('category').optional().isIn(['hostel', 'academic', 'infrastructure', 'security', 'food', 'transport', 'other']),
  query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 })
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: { message: errors.array()[0].msg }
      });
    }

    const {
      status,
      category,
      priority,
      page = 1,
      limit = 10
    } = req.query;

    // Build query
    const query = {};

    // Filter by user role
    if (req.user.userType === 'student') {
      query.complainant = req.user._id;
    } else if (req.user.userType === 'staff') {
      // Staff can see complaints assigned to them or all complaints if they're admin/HOD
      if (['HOD', 'Admin'].includes(req.user.designation)) {
        // Can see all complaints
      } else {
        query.$or = [
          { assignedTo: req.user._id },
          { assignedTo: { $exists: false } }
        ];
      }
    }

    // Add filters
    if (status) query.status = status;
    if (category) query.category = category;
    if (priority) query.priority = priority;

    const skip = (page - 1) * limit;
    const complaints = await Complaint.find(query)
      .populate('complainant', 'firstName lastName email userType rollNo employeeId')
      .populate('assignedTo', 'firstName lastName email userType designation')
      .populate('responses.responder', 'firstName lastName email userType')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Complaint.countDocuments(query);

    res.json({
      success: true,
      data: {
        complaints,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get complaints error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error' }
    });
  }
});

// @desc    Get single complaint
// @route   GET /api/complaints/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('complainant', 'firstName lastName email userType rollNo employeeId department')
      .populate('assignedTo', 'firstName lastName email userType designation')
      .populate('responses.responder', 'firstName lastName email userType')
      .populate('resolution.completedBy', 'firstName lastName email userType');

    if (!complaint) {
      return res.status(404).json({
        success: false,
        error: { message: 'Complaint not found' }
      });
    }

    // Check access permissions
    if (req.user.userType === 'student' && complaint.complainant._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: { message: 'Access denied' }
      });
    }

    res.json({
      success: true,
      data: { complaint }
    });
  } catch (error) {
    console.error('Get complaint error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error' }
    });
  }
});

// @desc    Submit complaint
// @route   POST /api/complaints
// @access  Private (Students only)
router.post('/', [
  protect,
  isStudent,
  body('category')
    .isIn(['hostel', 'academic', 'infrastructure', 'security', 'food', 'transport', 'other'])
    .withMessage('Please select a valid category'),
  body('subCategory')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Sub-category must be between 2 and 50 characters'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Please select a valid priority'),
  body('subject')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Subject must be between 5 and 200 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),
  body('location')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Location must be between 2 and 100 characters'),
  body('isAnonymous')
    .optional()
    .isBoolean()
    .withMessage('isAnonymous must be a boolean')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: { message: errors.array()[0].msg }
      });
    }

    const {
      category,
      subCategory,
      priority = 'medium',
      subject,
      description,
      location,
      attachments = [],
      tags = [],
      isAnonymous = false
    } = req.body;

    const complaint = await Complaint.create({
      complainant: req.user._id,
      category,
      subCategory,
      priority,
      subject,
      description,
      location,
      attachments,
      tags,
      isAnonymous
    });

    const populatedComplaint = await Complaint.findById(complaint._id)
      .populate('complainant', 'firstName lastName email userType rollNo employeeId');

    res.status(201).json({
      success: true,
      data: { complaint: populatedComplaint },
      message: 'Complaint submitted successfully'
    });
  } catch (error) {
    console.error('Submit complaint error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error' }
    });
  }
});

// @desc    Update complaint status
// @route   PUT /api/complaints/:id/status
// @access  Private (Staff only)
router.put('/:id/status', [
  protect,
  isStaff,
  body('status')
    .isIn(['pending', 'in-progress', 'resolved', 'rejected', 'closed'])
    .withMessage('Please select a valid status'),
  body('estimatedResolutionTime')
    .optional()
    .isISO8601()
    .withMessage('Invalid estimated resolution time')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: { message: errors.array()[0].msg }
      });
    }

    const { status, estimatedResolutionTime } = req.body;

    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        error: { message: 'Complaint not found' }
      });
    }

    // Update status
    await complaint.updateStatus(status, req.user._id);

    // Update estimated resolution time if provided
    if (estimatedResolutionTime) {
      complaint.estimatedResolutionTime = new Date(estimatedResolutionTime);
      await complaint.save();
    }

    const updatedComplaint = await Complaint.findById(req.params.id)
      .populate('complainant', 'firstName lastName email userType rollNo employeeId')
      .populate('assignedTo', 'firstName lastName email userType designation')
      .populate('responses.responder', 'firstName lastName email userType');

    res.json({
      success: true,
      data: { complaint: updatedComplaint },
      message: 'Complaint status updated successfully'
    });
  } catch (error) {
    console.error('Update complaint status error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error' }
    });
  }
});

// @desc    Add response to complaint
// @route   POST /api/complaints/:id/responses
// @access  Private
router.post('/:id/responses', [
  protect,
  body('message')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message must be between 1 and 1000 characters'),
  body('isInternal')
    .optional()
    .isBoolean()
    .withMessage('isInternal must be a boolean'),
  body('attachments')
    .optional()
    .isArray()
    .withMessage('Attachments must be an array')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: { message: errors.array()[0].msg }
      });
    }

    const { message, isInternal = false, attachments = [] } = req.body;

    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        error: { message: 'Complaint not found' }
      });
    }

    // Check access permissions
    if (req.user.userType === 'student' && complaint.complainant.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: { message: 'Access denied' }
      });
    }

    // Add response
    const responseData = {
      responder: req.user._id,
      message,
      isInternal,
      attachments
    };

    await complaint.addResponse(responseData);

    const updatedComplaint = await Complaint.findById(req.params.id)
      .populate('complainant', 'firstName lastName email userType rollNo employeeId')
      .populate('assignedTo', 'firstName lastName email userType designation')
      .populate('responses.responder', 'firstName lastName email userType');

    res.json({
      success: true,
      data: { complaint: updatedComplaint },
      message: 'Response added successfully'
    });
  } catch (error) {
    console.error('Add response error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error' }
    });
  }
});

// @desc    Rate complaint resolution
// @route   POST /api/complaints/:id/rate
// @access  Private (Students only)
router.post('/:id/rate', [
  protect,
  isStudent,
  body('score')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating score must be between 1 and 5'),
  body('feedback')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Feedback must be less than 500 characters')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: { message: errors.array()[0].msg }
      });
    }

    const { score, feedback = '' } = req.body;

    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        error: { message: 'Complaint not found' }
      });
    }

    // Check if user is the complainant
    if (complaint.complainant.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: { message: 'Only the complainant can rate this complaint' }
      });
    }

    // Check if complaint is resolved
    if (complaint.status !== 'resolved') {
      return res.status(400).json({
        success: false,
        error: { message: 'Can only rate resolved complaints' }
      });
    }

    // Add rating
    await complaint.addRating(score, feedback);

    res.json({
      success: true,
      message: 'Rating submitted successfully'
    });
  } catch (error) {
    console.error('Rate complaint error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error' }
    });
  }
});

// @desc    Get complaint statistics
// @route   GET /api/complaints/stats/overview
// @access  Private (Staff only)
router.get('/stats/overview', protect, isStaff, async (req, res) => {
  try {
    const stats = await Complaint.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const categoryStats = await Complaint.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      }
    ]);

    const priorityStats = await Complaint.aggregate([
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);

    // Convert to object format
    const statusStats = stats.reduce((acc, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {});

    const categoryStatsObj = categoryStats.reduce((acc, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {});

    const priorityStatsObj = priorityStats.reduce((acc, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        statusStats,
        categoryStats: categoryStatsObj,
        priorityStats: priorityStatsObj
      }
    });
  } catch (error) {
    console.error('Get complaint stats error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error' }
    });
  }
});

export default router; 