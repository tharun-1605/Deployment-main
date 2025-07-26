import express from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import { protect, isStaff } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
router.get('/profile', protect, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        user: req.user.getPublicProfile()
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error' }
    });
  }
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
router.put('/profile', [
  protect,
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('First name must be at least 2 characters long'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Last name must be at least 2 characters long'),
  body('phone')
    .optional()
    .trim()
    .isLength({ min: 10 })
    .withMessage('Please provide a valid phone number'),
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio must be less than 500 characters'),
  body('preferences')
    .optional()
    .isObject()
    .withMessage('Preferences must be an object')
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

    const { firstName, lastName, phone, bio, preferences } = req.body;

    // Update allowed fields
    if (firstName) req.user.firstName = firstName;
    if (lastName) req.user.lastName = lastName;
    if (phone) req.user.phone = phone;
    if (bio !== undefined) req.user.bio = bio;
    if (preferences) {
      req.user.preferences = {
        ...req.user.preferences,
        ...preferences
      };
    }

    await req.user.save();

    res.json({
      success: true,
      data: {
        user: req.user.getPublicProfile()
      },
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error' }
    });
  }
});

// @desc    Upload profile picture
// @route   POST /api/users/profile-picture
// @access  Private
router.post('/profile-picture', protect, async (req, res) => {
  try {
    // This would typically handle file upload
    // For now, we'll just update the profile picture URL
    const { profilePictureUrl } = req.body;

    if (!profilePictureUrl) {
      return res.status(400).json({
        success: false,
        error: { message: 'Profile picture URL is required' }
      });
    }

    req.user.profilePicture = profilePictureUrl;
    await req.user.save();

    res.json({
      success: true,
      data: {
        user: req.user.getPublicProfile()
      },
      message: 'Profile picture updated successfully'
    });
  } catch (error) {
    console.error('Upload profile picture error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error' }
    });
  }
});

// @desc    Get all users (Staff only)
// @route   GET /api/users
// @access  Private (Staff only)
router.get('/', [
  protect,
  isStaff
], async (req, res) => {
  try {
    const { userType, department, page = 1, limit = 20 } = req.query;

    const query = {};

    if (userType) query.userType = userType;
    if (department) query.department = department;

    const skip = (page - 1) * limit;
    const users = await User.find(query)
      .select('-password -refreshToken -passwordResetToken -passwordResetExpires')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error' }
    });
  }
});

// @desc    Get user by ID (Staff only)
// @route   GET /api/users/:id
// @access  Private (Staff only)
router.get('/:id', [
  protect,
  isStaff
], async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -refreshToken -passwordResetToken -passwordResetExpires');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found' }
      });
    }

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error' }
    });
  }
});

// @desc    Update user (Staff only)
// @route   PUT /api/users/:id
// @access  Private (Staff only)
router.put('/:id', [
  protect,
  isStaff,
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  body('department')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Department must be at least 2 characters long')
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

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found' }
      });
    }

    // Update allowed fields
    const { isActive, department, designation, year, section } = req.body;

    if (isActive !== undefined) user.isActive = isActive;
    if (department) user.department = department;
    if (designation) user.designation = designation;
    if (year) user.year = year;
    if (section) user.section = section;

    await user.save();

    res.json({
      success: true,
      data: {
        user: user.getPublicProfile()
      },
      message: 'User updated successfully'
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error' }
    });
  }
});

// @desc    Get user statistics
// @route   GET /api/users/stats
// @access  Private (Staff only)
router.get('/stats', protect, isStaff, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalStudents = await User.countDocuments({ userType: 'student' });
    const totalStaff = await User.countDocuments({ userType: 'staff' });
    const activeUsers = await User.countDocuments({ isActive: true });

    const departmentStats = await User.aggregate([
      {
        $group: {
          _id: '$department',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const yearStats = await User.aggregate([
      {
        $match: { userType: 'student' }
      },
      {
        $group: {
          _id: '$year',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        totalStudents,
        totalStaff,
        activeUsers,
        departmentStats,
        yearStats
      }
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error' }
    });
  }
});

export default router; 