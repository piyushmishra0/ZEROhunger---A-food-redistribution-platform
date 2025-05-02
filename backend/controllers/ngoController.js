const NGO = require('../models/NGO');
const Donation = require('../models/Donation');
const ErrorResponse = require('../utils/errorResponse');
const geocoder = require('../utils/geocoder');

// @desc    Get NGO profile
// @route   GET /api/ngo/me
exports.getProfile = async (req, res, next) => {
  try {
    const ngo = await NGO.findById(req.user.id).select('-password');

    res.status(200).json({
      success: true,
      data: ngo
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update NGO profile
// @route   PUT /api/ngo/me
exports.updateProfile = async (req, res, next) => {
  try {
    // Remove restricted fields
    const { ngoId, verified, ...updateData } = req.body;

    // If address is being updated, geocode it
    if (updateData.address) {
      try {
        console.log('Geocoding address:', updateData.address);
        const loc = await geocoder.geocode(updateData.address);
        if (!loc || loc.length === 0) {
          console.error('No location data returned from geocoding');
          return next(new ErrorResponse('Could not geocode address. Please check the address and try again.', 400));
        }

        console.log('Geocoding result:', loc[0]);
        updateData.location = {
          type: 'Point',
          coordinates: [loc[0].longitude, loc[0].latitude],
          formattedAddress: loc[0].formattedAddress,
          street: loc[0].streetName,
          city: loc[0].city,
          state: loc[0].stateCode,
          zipcode: loc[0].zipcode,
          country: loc[0].countryCode
        };

        // Verify the coordinates are valid numbers
        if (isNaN(updateData.location.coordinates[0]) || isNaN(updateData.location.coordinates[1])) {
          console.error('Invalid coordinates:', updateData.location.coordinates);
          return next(new ErrorResponse('Invalid coordinates received from geocoding service', 400));
        }

        console.log('Updated location:', updateData.location);
      } catch (err) {
        console.error('Geocoding error:', err);
        return next(new ErrorResponse('Failed to geocode address. Please check the address and try again.', 400));
      }
    }

    const ngo = await NGO.findByIdAndUpdate(req.user.id, updateData, {
      new: true,
      runValidators: true
    }).select('-password');

    if (!ngo) {
      return next(new ErrorResponse('NGO not found', 404));
    }

    // Verify the location was saved correctly
    if (ngo.location && ngo.location.coordinates) {
      console.log('NGO location after update:', ngo.location);
    } else {
      console.warn('NGO location not set after update');
    }

    res.status(200).json({
      success: true,
      data: ngo
    });
  } catch (err) {
    console.error('Update profile error:', err);
    next(new ErrorResponse('Failed to update profile', 500));
  }
};

// @desc    Get NGO's claimed donations
// @route   GET /api/ngo/donations
exports.getMyDonations = async (req, res, next) => {
  try {
    const donations = await Donation.find({ ngo: req.user.id })
      .sort('-claimedAt')
      .populate('restaurant', 'name location');

    res.status(200).json({
      success: true,
      count: donations.length,
      data: donations
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update operating radius
// @route   PUT /api/ngo/radius
exports.updateOperatingRadius = async (req, res, next) => {
  try {
    const { radius } = req.body;

    if (!radius || radius < 1 || radius > 100) {
      return next(new ErrorResponse('Please provide radius between 1-100 km', 400));
    }

    const ngo = await NGO.findByIdAndUpdate(
      req.user.id,
      { operatingRadius: radius },
      { new: true }
    ).select('-password');

    res.status(200).json({
      success: true,
      data: ngo
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get NGO's completed donations
// @route   GET /api/ngo/donations/completed
exports.getCompletedDonations = async (req, res, next) => {
  try {
    const donations = await Donation.find({
      ngo: req.user.id,
      status: 'delivered'
    })
      .sort('-deliveredAt')
      .populate('restaurant', 'name location');

    res.status(200).json({
      success: true,
      count: donations.length,
      data: donations
    });
  } catch (err) {
    next(err);
  }
};