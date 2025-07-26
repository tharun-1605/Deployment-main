import express from 'express';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get events
// @route   GET /api/events
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        events: [],
        message: 'Events API - Coming Soon'
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