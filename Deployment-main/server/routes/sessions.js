import express from 'express';
import { protect, isStaff } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get session bookings
// @route   GET /api/sessions
// @access  Private (Staff only)
router.get('/', protect, isStaff, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        sessions: [],
        message: 'Session Bookings API - Coming Soon'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: 'Server error' }
    });
  }
});

export default router; 