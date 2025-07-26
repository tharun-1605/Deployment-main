import express from 'express';
import { body, validationResult, query } from 'express-validator';
import Announcement from '../models/Announcement.js';
import User from '../models/User.js';
import { protect, authorize, isStaff } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get all announcements
// @route   GET /api/announcements
// @access  Private
router.get('/', [
  protect,
  query('category').optional().isIn(['academic', 'hostel', 'events', 'general', 'urgent', 'sports', 'cultural', 'technical']),
  query('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
  query('search').optional().trim(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('sort').optional().isIn(['newest', 'oldest', 'priority', 'views'])
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
      priority,
      search,
      page = 1,
      limit = 10,
      sort = 'newest'
    } = req.query;

    // Build query
    const query = {
      isPublished: true,
      status: { $ne: 'expired' },
      $or: [
        { expiryDate: { $exists: false } },
        { expiryDate: { $gt: new Date() } }
      ]
    };

    // Add filters
    if (category) query.category = category;
    if (priority) query.priority = priority;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Add audience filter based on user type
    if (req.user.userType === 'student') {
      query.targetAudience = {
        $in: ['all', 'students', req.user.year?.toLowerCase(), req.user.department?.toLowerCase()]
      };
    }

    // Build sort object
    let sortObj = {};
    switch (sort) {
      case 'newest':
        sortObj = { publishDate: -1 };
        break;
      case 'oldest':
        sortObj = { publishDate: 1 };
        break;
      case 'priority':
        sortObj = { priority: -1, publishDate: -1 };
        break;
      case 'views':
        sortObj = { views: -1, publishDate: -1 };
        break;
    }

    // Add pinned announcements first
    sortObj = { isPinned: -1, ...sortObj };

    // Execute query
    const skip = (page - 1) * limit;
    const announcements = await Announcement.find(query)
      .populate('author', 'firstName lastName email userType')
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const total = await Announcement.countDocuments(query);

    // Mark announcements as read by current user
    for (const announcement of announcements) {
      await announcement.markAsRead(req.user._id);
    }

    res.json({
      success: true,
      data: {
        announcements,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get announcements error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error' }
    });
  }
});

// @desc    Get single announcement
// @route   GET /api/announcements/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id)
      .populate('author', 'firstName lastName email userType department')
      .populate('readBy.user', 'firstName lastName email')
      .populate('bookmarkedBy', 'firstName lastName email');

    if (!announcement) {
      return res.status(404).json({
        success: false,
        error: { message: 'Announcement not found' }
      });
    }

    // Check if user has access to this announcement
    if (req.user.userType === 'student') {
      const hasAccess = announcement.targetAudience.some(audience => 
        ['all', 'students'].includes(audience) ||
        audience === req.user.year?.toLowerCase() ||
        audience === req.user.department?.toLowerCase()
      );
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: { message: 'Access denied to this announcement' }
        });
      }
    }

    // Mark as read
    await announcement.markAsRead(req.user._id);

    res.json({
      success: true,
      data: { announcement }
    });
  } catch (error) {
    console.error('Get announcement error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error' }
    });
  }
});

// @desc    Create announcement
// @route   POST /api/announcements
// @access  Private (Staff only)
router.post('/', [
  protect,
  isStaff,
  body('title')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Title must be between 5 and 200 characters'),
  body('content')
    .trim()
    .isLength({ min: 10, max: 5000 })
    .withMessage('Content must be between 10 and 5000 characters'),
  body('category')
    .isIn(['academic', 'hostel', 'events', 'general', 'urgent', 'sports', 'cultural', 'technical'])
    .withMessage('Please select a valid category'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Please select a valid priority'),
  body('targetAudience')
    .isArray({ min: 1 })
    .withMessage('At least one target audience is required'),
  body('targetAudience.*')
    .isIn(['all', 'students', 'staff', 'hostel', 'day-scholar', '1st-year', '2nd-year', '3rd-year', '4th-year', 'cse', 'ece', 'eee', 'mech', 'civil'])
    .withMessage('Invalid target audience'),
  body('publishDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid publish date'),
  body('expiryDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid expiry date')
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
      title,
      content,
      category,
      priority = 'medium',
      targetAudience,
      attachments = [],
      tags = [],
      location,
      contactInfo,
      relatedLinks = [],
      publishDate,
      expiryDate,
      isPinned = false
    } = req.body;

    const announcement = await Announcement.create({
      title,
      content,
      category,
      priority,
      author: req.user._id,
      department: req.user.department,
      targetAudience,
      attachments,
      tags,
      location,
      contactInfo,
      relatedLinks,
      publishDate: publishDate || new Date(),
      expiryDate,
      isPinned,
      isPublished: true,
      status: 'published'
    });

    const populatedAnnouncement = await Announcement.findById(announcement._id)
      .populate('author', 'firstName lastName email userType');

    res.status(201).json({
      success: true,
      data: { announcement: populatedAnnouncement },
      message: 'Announcement created successfully'
    });
  } catch (error) {
    console.error('Create announcement error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error' }
    });
  }
});

// @desc    Update announcement
// @route   PUT /api/announcements/:id
// @access  Private (Staff only)
router.put('/:id', [
  protect,
  isStaff,
  body('title')
    .optional()
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Title must be between 5 and 200 characters'),
  body('content')
    .optional()
    .trim()
    .isLength({ min: 10, max: 5000 })
    .withMessage('Content must be between 10 and 5000 characters'),
  body('category')
    .optional()
    .isIn(['academic', 'hostel', 'events', 'general', 'urgent', 'sports', 'cultural', 'technical'])
    .withMessage('Please select a valid category'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Please select a valid priority')
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

    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({
        success: false,
        error: { message: 'Announcement not found' }
      });
    }

    // Check if user is the author or has admin privileges
    if (announcement.author.toString() !== req.user._id.toString() && 
        !['HOD', 'Admin'].includes(req.user.designation)) {
      return res.status(403).json({
        success: false,
        error: { message: 'Not authorized to update this announcement' }
      });
    }

    const updatedAnnouncement = await Announcement.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('author', 'firstName lastName email userType');

    res.json({
      success: true,
      data: { announcement: updatedAnnouncement },
      message: 'Announcement updated successfully'
    });
  } catch (error) {
    console.error('Update announcement error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error' }
    });
  }
});

// @desc    Delete announcement
// @route   DELETE /api/announcements/:id
// @access  Private (Staff only)
router.delete('/:id', protect, isStaff, async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({
        success: false,
        error: { message: 'Announcement not found' }
      });
    }

    // Check if user is the author or has admin privileges
    if (announcement.author.toString() !== req.user._id.toString() && 
        !['HOD', 'Admin'].includes(req.user.designation)) {
      return res.status(403).json({
        success: false,
        error: { message: 'Not authorized to delete this announcement' }
      });
    }

    await Announcement.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Announcement deleted successfully'
    });
  } catch (error) {
    console.error('Delete announcement error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error' }
    });
  }
});

// @desc    Toggle bookmark
// @route   POST /api/announcements/:id/bookmark
// @access  Private
router.post('/:id/bookmark', protect, async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({
        success: false,
        error: { message: 'Announcement not found' }
      });
    }

    await announcement.toggleBookmark(req.user._id);

    res.json({
      success: true,
      data: {
        isBookmarked: announcement.hasUserBookmarked(req.user._id),
        bookmarkCount: announcement.bookmarkCount
      },
      message: announcement.hasUserBookmarked(req.user._id) 
        ? 'Announcement bookmarked' 
        : 'Bookmark removed'
    });
  } catch (error) {
    console.error('Toggle bookmark error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error' }
    });
  }
});

// @desc    Get user's bookmarked announcements
// @route   GET /api/announcements/bookmarks
// @access  Private
router.get('/bookmarks', protect, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const announcements = await Announcement.find({
      bookmarkedBy: req.user._id,
      isPublished: true,
      status: { $ne: 'expired' }
    })
      .populate('author', 'firstName lastName email userType')
      .sort({ publishDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Announcement.countDocuments({
      bookmarkedBy: req.user._id,
      isPublished: true,
      status: { $ne: 'expired' }
    });

    res.json({
      success: true,
      data: {
        announcements,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get bookmarks error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error' }
    });
  }
});

export default router; 