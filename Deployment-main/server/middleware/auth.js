import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Protect routes
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from token
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return res.status(401).json({
          success: false,
          error: { message: 'User not found' }
        });
      }

      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          error: { message: 'User account is deactivated' }
        });
      }

      // Check if password was changed after token was issued
      if (user.changedPasswordAfter(decoded.iat)) {
        return res.status(401).json({
          success: false,
          error: { message: 'User recently changed password! Please log in again' }
        });
      }

      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: { message: 'Not authorized to access this route' }
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: { message: 'Not authorized to access this route' }
    });
  }
};

// Grant access to specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.userType)) {
      return res.status(403).json({
        success: false,
        error: { 
          message: `User role '${req.user.userType}' is not authorized to access this route` 
        }
      });
    }
    next();
  };
};

// Optional auth - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      
      if (user && user.isActive) {
        req.user = user;
      }
    } catch (error) {
      // Token is invalid but we don't fail the request
      console.log('Optional auth failed:', error.message);
    }
  }

  next();
};

// Check if user is student
const isStudent = (req, res, next) => {
  if (req.user.userType !== 'student') {
    return res.status(403).json({
      success: false,
      error: { message: 'Access denied. Students only.' }
    });
  }
  next();
};

// Check if user is staff
const isStaff = (req, res, next) => {
  if (req.user.userType !== 'staff') {
    return res.status(403).json({
      success: false,
      error: { message: 'Access denied. Staff only.' }
    });
  }
  next();
};

// Check if user is admin or HOD
const isAdminOrHOD = (req, res, next) => {
  if (req.user.userType !== 'staff' || 
      !['HOD', 'Admin'].includes(req.user.designation)) {
    return res.status(403).json({
      success: false,
      error: { message: 'Access denied. Admin/HOD only.' }
    });
  }
  next();
};

export { protect, authorize, optionalAuth, isStudent, isStaff, isAdminOrHOD }; 