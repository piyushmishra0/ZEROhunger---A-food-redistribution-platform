const ErrorResponse = require('../utils/errorResponse');

// Verify admin role
exports.isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return next(
      new ErrorResponse(
        `User role ${req.user.role} is not authorized to access this route`, 
        403
      )
    );
  }
  next();
};

// Verify document ownership or admin
exports.isOwnerOrAdmin = async (req, res, next) => {
  // Allow admin to bypass ownership check
  if (req.user.role === 'admin') return next();

  // For NGOs/Restaurants, check if they own the resource
  const resource = await req.model.findById(req.params.id);
  
  if (!resource) {
    return next(
      new ErrorResponse(`Resource not found with id ${req.params.id}`, 404)
    );
  }

  // Check ownership (comparing ObjectId requires .toString())
  if (resource.user.toString() !== req.user.id) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to modify this resource`,
        403
      )
    );
  }

  next();
};

// Verify verification document access
exports.canViewDocument = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.id !== req.params.id) {
    return next(
      new ErrorResponse(
        'Not authorized to view this document', 
        403
      )
    );
  }
  next();
};