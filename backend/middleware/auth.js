const jwt = require('jsonwebtoken');
const ErrorResponse = require('../utils/errorResponse');
const NGO = require('../models/NGO');
const Restaurant = require('../models/Restaurant');
const Admin = require('../models/Admin');

// Protect routes with JWT
exports.protect = async (req, res, next) => {
  let token;

  // Get token from header or cookie
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return next(
      new ErrorResponse('Not authorized to access this route', 401)
    );
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user in all collections
    req.user = await NGO.findById(decoded.id).select('-password') ||
               await Restaurant.findById(decoded.id).select('-password') ||
               await Admin.findById(decoded.id).select('-password');

    if (!req.user) {
      return next(
        new ErrorResponse('No user found with this token', 404)
      );
    }

    next();
  } catch (err) {
    return next(
      new ErrorResponse('Not authorized to access this route', 401)
    );
  }
};

// Role-based authorization
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorResponse(
          `Role ${req.user.role} is not authorized for this route`,
          403
        )
      );
    }
    next();
  };
};

// Check if account is verified
exports.isVerified = (req, res, next) => {
  if (req.user.role !== 'admin' && !req.user.verified) {
    return next(
      new ErrorResponse(
        'Account not verified. Please contact admin.',
        403
      )
    );
  }
  next();
};