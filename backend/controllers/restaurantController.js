const Restaurant = require('../models/Restaurant');
const Donation = require('../models/Donation');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get restaurant profile
// @route   GET /api/restaurant/me
exports.getProfile = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findById(req.user.id).select('-password');

    res.status(200).json({
      success: true,
      data: restaurant
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update restaurant profile
// @route   PUT /api/restaurant/me
exports.updateProfile = async (req, res, next) => {
  try {
    // Remove restricted fields
    const { gstNumber, verified, ...updateData } = req.body;

    const restaurant = await Restaurant.findByIdAndUpdate(req.user.id, updateData, {
      new: true,
      runValidators: true
    }).select('-password');

    res.status(200).json({
      success: true,
      data: restaurant
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get restaurant's active donations
// @route   GET /api/restaurant/donations/active
exports.getActiveDonations = async (req, res, next) => {
  try {
    const donations = await Donation.find({ 
      restaurant: req.user.id,
      status: { $in: ['available', 'claimed'] }
    })
    .populate('claimedBy', 'name')
    .sort('-createdAt');

    res.status(200).json({
      success: true,
      data: donations
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get restaurant's completed donations
// @route   GET /api/restaurant/donations/completed
exports.getCompletedDonations = async (req, res, next) => {
  try {
    const donations = await Donation.find({ 
      restaurant: req.user.id,
      status: 'completed'
    })
    .populate('claimedBy', 'name')
    .sort('-completedAt');

    res.status(200).json({
      success: true,
      data: donations
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create a new donation
// @route   POST /api/restaurant/donations
exports.createDonation = async (req, res, next) => {
  try {
    const { description, quantity, foodType, address, expiryTime } = req.body;

    const donation = await Donation.create({
      description,
      quantity,
      foodType,
      address,
      expiryTime,
      restaurant: req.user.id
    });

    res.status(201).json({
      success: true,
      data: donation
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete a donation
// @route   DELETE /api/restaurant/donations/:id
exports.deleteDonation = async (req, res, next) => {
  try {
    const donation = await Donation.findById(req.params.id);

    if (!donation) {
      return next(new ErrorResponse('Donation not found', 404));
    }

    // Make sure user owns the donation
    if (donation.restaurant.toString() !== req.user.id) {
      return next(new ErrorResponse('Not authorized to delete this donation', 401));
    }

    // Only allow deletion of available donations
    if (donation.status !== 'available') {
      return next(new ErrorResponse('Can only delete available donations', 400));
    }

    await donation.remove();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get restaurant statistics
// @route   GET /api/restaurant/stats
exports.getStats = async (req, res, next) => {
  try {
    const [
      totalDonations,
      claimedDonations,
      completedDonations,
      uniqueNGOs
    ] = await Promise.all([
      Donation.countDocuments({ restaurant: req.user.id }),
      Donation.countDocuments({ restaurant: req.user.id, status: 'claimed' }),
      Donation.countDocuments({ restaurant: req.user.id, status: 'completed' }),
      Donation.distinct('claimedBy', { 
        restaurant: req.user.id,
        status: { $in: ['claimed', 'completed'] }
      }).then(ngos => ngos.length)
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalDonations,
        claimedDonations,
        completedDonations,
        uniqueNGOsHelped: uniqueNGOs,
        fulfillmentRate: totalDonations > 0 
          ? Math.round(((claimedDonations + completedDonations) / totalDonations) * 100)
          : 0
      }
    });
  } catch (err) {
    next(err);
  }
}; 