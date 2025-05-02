const Donation = require('../models/Donation');
const NGO = require('../models/NGO');
const Restaurant = require('../models/Restaurant');
const ErrorResponse = require('../utils/errorResponse');
const geocoder = require('../utils/geocoder');
const EmailService = require('../utils/emailService');

// Create email service instance
const emailService = new EmailService();

// @desc    Create donation
// @route   POST /api/donations
exports.createDonation = async (req, res, next) => {
  try {
    // Add restaurant to body
    req.body.restaurant = req.user.id;

    // Geocode address
    const loc = await geocoder.geocode(req.body.address);
    req.body.location = {
      type: 'Point',
      coordinates: [loc[0].longitude, loc[0].latitude],
      formattedAddress: loc[0].formattedAddress
    };

    const donation = await Donation.create(req.body);

    // Find nearby NGOs
    const ngos = await NGO.find({
      location: {
        $nearSphere: {
          $geometry: {
            type: 'Point',
            coordinates: donation.location.coordinates
          },
          $maxDistance: 10000 // 10km radius
        }
      },
      verified: true
    }).select('email');

    // Send notifications (in background)
    if (ngos.length > 0) {
      const emails = ngos.map(ngo => ngo.email);
      emailService.sendBulkNotification(emails, donation);
    }

    res.status(201).json({
      success: true,
      data: donation
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get nearby donations
// @route   GET /api/donations/nearby
exports.getNearbyDonations = async (req, res, next) => {
  try {
    // Get NGO's location
    const ngo = await NGO.findById(req.user.id);
    if (!ngo) {
      return next(new ErrorResponse('NGO not found', 404));
    }

    // Check if NGO is verified
    if (!ngo.verified) {
      return next(new ErrorResponse('Your account is not verified yet. Please wait for admin verification.', 403));
    }

    // Check if NGO has location set
    if (!ngo.location || !ngo.location.coordinates) {
      console.error('NGO location not set:', ngo._id);
      return next(new ErrorResponse('Location not set. Please update your profile with a valid address.', 400));
    }

    console.log('NGO location:', ngo.location);

    const donations = await Donation.find({
      status: 'available',
      location: {
        $nearSphere: {
          $geometry: {
            type: 'Point',
            coordinates: ngo.location.coordinates
          },
          $maxDistance: ngo.operatingRadius * 1000 // Convert km to meters
        }
      }
    })
    .populate({
      path: 'restaurant',
      select: 'name address phone location'
    })
    .sort('-createdAt');

    console.log(`Found ${donations.length} nearby donations`);

    // Calculate distance for each donation
    const donationsWithDistance = donations.map(donation => {
      const doc = donation.toObject();
      if (donation.location && donation.location.coordinates) {
        // Calculate distance in kilometers
        const [ngoLng, ngoLat] = ngo.location.coordinates;
        const [donLng, donLat] = donation.location.coordinates;
        
        console.log('Calculating distance between:', {
          ngo: { lat: ngoLat, lng: ngoLng },
          donation: { lat: donLat, lng: donLng }
        });

        const R = 6371; // Earth's radius in km
        const dLat = (donLat - ngoLat) * Math.PI / 180;
        const dLon = (donLng - ngoLng) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                 Math.cos(ngoLat * Math.PI / 180) * Math.cos(donLat * Math.PI / 180) *
                 Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        doc.distance = R * c;

        console.log('Calculated distance:', doc.distance, 'km');
      } else {
        console.warn('Donation missing location:', donation._id);
        doc.distance = null;
      }
      return doc;
    });

    res.status(200).json({
      success: true,
      count: donations.length,
      data: donationsWithDistance
    });
  } catch (err) {
    console.error('Error in getNearbyDonations:', err);
    next(err);
  }
};

// @desc    Claim donation
// @route   PUT /api/donations/:id/claim
exports.claimDonation = async (req, res, next) => {
  try {
    let donation = await Donation.findById(req.params.id);

    if (!donation) {
      return next(new ErrorResponse('Donation not found', 404));
    }

    // Check if already claimed
    if (donation.status !== 'available') {
      return next(new ErrorResponse('Donation already claimed', 400));
    }

    // Update donation
    donation = await Donation.findByIdAndUpdate(
      req.params.id,
      {
        status: 'claimed',
        ngo: req.user.id,
        claimedAt: Date.now()
      },
      { new: true }
    ).populate('restaurant ngo', 'name email phone');

    // Notify restaurant
    await emailService.sendEmail({
      email: donation.restaurant.email,
      subject: 'Donation Claimed',
      message: `Your donation (${donation.foodType}) has been claimed by ${donation.ngo.name}. Contact: ${donation.ngo.phone}`
    });

    res.status(200).json({
      success: true,
      data: donation
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all donations
// @route   GET /api/donations
exports.getDonations = async (req, res, next) => {
  try {
    let query;

    // If restaurant, only show their donations
    if (req.user.role === 'restaurant') {
      query = Donation.find({ restaurant: req.user.id });
    } 
    // If NGO, show claimed donations
    else if (req.user.role === 'ngo') {
      query = Donation.find({ ngo: req.user.id });
    }
    // If admin, show all donations
    else {
      query = Donation.find();
    }

    const donations = await query
      .populate('restaurant ngo', 'name')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: donations.length,
      data: donations
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update donation
// @route   PUT /api/donations/:id
exports.updateDonation = async (req, res, next) => {
  try {
    let donation = await Donation.findById(req.params.id);

    if (!donation) {
      return next(new ErrorResponse('Donation not found', 404));
    }

    // Make sure user is donation owner
    if (donation.restaurant.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to update this donation', 401));
    }

    // Don't allow updating if already claimed
    if (donation.status !== 'available' && req.user.role !== 'admin') {
      return next(new ErrorResponse('Cannot update claimed donation', 400));
    }

    donation = await Donation.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: donation
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete donation
// @route   DELETE /api/donations/:id
exports.deleteDonation = async (req, res, next) => {
  try {
    const donation = await Donation.findById(req.params.id);

    if (!donation) {
      return next(new ErrorResponse('Donation not found', 404));
    }

    // Make sure user is donation owner
    if (donation.restaurant.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to delete this donation', 401));
    }

    // Don't allow deleting if already claimed
    if (donation.status !== 'available' && req.user.role !== 'admin') {
      return next(new ErrorResponse('Cannot delete claimed donation', 400));
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

// @desc    Get donation history for restaurant
// @route   GET /api/donations/restaurant
exports.getDonationHistory = async (req, res, next) => {
  try {
    const donations = await Donation.find({ restaurant: req.user.id })
      .populate('ngo', 'name')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: donations.length,
      data: donations
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Complete donation delivery
// @route   PUT /api/donations/:id/complete
exports.completeDonation = async (req, res, next) => {
  try {
    let donation = await Donation.findById(req.params.id);

    if (!donation) {
      return next(new ErrorResponse('Donation not found', 404));
    }

    // Check if claimed by this NGO
    if (donation.ngo.toString() !== req.user.id) {
      return next(new ErrorResponse('Not authorized to complete this donation', 401));
    }

    // Check if in claimed status
    if (donation.status !== 'claimed') {
      return next(new ErrorResponse('Donation must be claimed before completion', 400));
    }

    donation = await Donation.findByIdAndUpdate(
      req.params.id,
      {
        status: 'delivered',
        deliveredAt: Date.now()
      },
      { new: true }
    ).populate('restaurant ngo', 'name email');

    // Notify restaurant
    await emailService.sendEmail({
      email: donation.restaurant.email,
      subject: 'Donation Delivered',
      message: `Your donation (${donation.foodType}) has been successfully delivered to ${donation.ngo.name}.`
    });

    res.status(200).json({
      success: true,
      data: donation
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get public available donations
// @route   GET /api/v1/donations/public
exports.getPublicDonations = async (req, res, next) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radius = parseFloat(req.query.radius) || 5;

    if (isNaN(lat) || isNaN(lng)) {
      return next(new ErrorResponse('Please provide valid latitude and longitude', 400));
    }

    const donations = await Donation.find({
      status: 'available',
      location: {
        $nearSphere: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat]
          },
          $maxDistance: radius * 1000 // Convert km to meters
        }
      }
    })
    .populate('restaurant', 'name location')
    .select('foodType quantity location expiryTime');

    res.status(200).json({
      success: true,
      count: donations.length,
      data: donations
    });
  } catch (err) {
    next(err);
  }
};