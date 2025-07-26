import express from 'express';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get educational exchange items
// @route   GET /api/edu-exchange
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        items: [],
        message: 'Educational Exchange API - Coming Soon'
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