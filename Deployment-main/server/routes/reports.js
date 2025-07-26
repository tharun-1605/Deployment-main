import express from 'express';
import { protect, isStaff } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get reports
// @route   GET /api/reports
// @access  Private (Staff only)
router.get('/', protect, isStaff, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        reports: [],
        message: 'Reports API - Coming Soon'
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