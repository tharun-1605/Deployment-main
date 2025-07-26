import express from 'express';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get grow together items
// @route   GET /api/grow-together
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        items: [],
        message: 'Grow Together API - Coming Soon'
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