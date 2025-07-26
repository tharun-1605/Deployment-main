import express from 'express';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get feedback and polls
// @route   GET /api/feedback
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        feedback: [],
        polls: [],
        message: 'Feedback & Polls API - Coming Soon'
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