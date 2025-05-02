const NGO = require('../models/NGO');
const Restaurant = require('../models/Restaurant');
const Donation = require('../models/Donation');
const ErrorResponse = require('../utils/errorResponse');
const sendEmail = require('../utils/emailService');
const path = require('path');
const fs = require('fs');

// @desc    Get all pending verifications
// @route   GET /api/admin/pending
exports.getPendingVerifications = async (req, res, next) => {
  try {
    const [ngos, restaurants] = await Promise.all([
      NGO.find({ verified: false })
        .select('-password')
        .sort({ createdAt: -1 }),
      Restaurant.find({ verified: false })
        .select('-password')
        .sort({ createdAt: -1 })
    ]);

    res.status(200).json({
      success: true,
      count: ngos.length + restaurants.length,
      ngos,
      restaurants
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Verify/Reject NGO or Restaurant
// @route   PUT /api/admin/verify/:id
exports.verifyEntity = async (req, res, next) => {
  try {
    const { status, reason } = req.body;
    const { id } = req.params;

    let entity = await NGO.findById(id) || await Restaurant.findById(id);
    
    if (!entity) {
      return next(new ErrorResponse('Entity not found', 404));
    }

    // Update verification status
    entity.verified = status === 'approved';
    await entity.save();

    // Send notification email
    const emailSubject = status === 'approved' 
      ? 'Your ZeroHunger! Account Has Been Verified' 
      : 'Account Verification Rejected';

    const emailText = status === 'approved'
      ? `Congratulations! Your ${entity.role} account has been verified. You can now access all features.`
      : `Your verification was rejected. Reason: ${reason || 'Not specified'}\n\nPlease contact support for more information.`;

    try {
      await sendEmail({
        email: entity.email,
        subject: emailSubject,
        message: emailText
      });
    } catch (emailErr) {
      console.error('Email could not be sent:', emailErr.message);
    }

    res.status(200).json({
      success: true,
      data: {
        id: entity._id,
        name: entity.name,
        email: entity.email,
        role: entity.role,
        verified: entity.verified
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get system statistics
// @route   GET /api/admin/stats
exports.getSystemStats = async (req, res, next) => {
  try {
    const [
      totalDonations,
      availableDonations,
      claimedDonations,
      deliveredDonations,
      totalNGOs,
      totalRestaurants
    ] = await Promise.all([
      Donation.countDocuments(),
      Donation.countDocuments({ status: 'available' }),
      Donation.countDocuments({ status: 'claimed' }),
      Donation.countDocuments({ status: 'delivered' }),
      NGO.countDocuments({ verified: true }),
      Restaurant.countDocuments({ verified: true })
    ]);

    res.status(200).json({
      success: true,
      data: {
        donations: {
          total: totalDonations,
          available: availableDonations,
          claimed: claimedDonations,
          delivered: deliveredDonations,
          fulfillmentRate: totalDonations > 0 
            ? Math.round(((claimedDonations + deliveredDonations) / totalDonations) * 100)
            : 0
        },
        users: {
          ngos: totalNGOs,
          restaurants: totalRestaurants
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Force cancel a donation
// @route   PUT /api/admin/donations/cancel/:id
exports.cancelDonation = async (req, res, next) => {
  try {
    const donation = await Donation.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'cancelled',
        cancellationReason: req.body.reason || 'Admin cancelled',
        cancelledBy: req.user.id
      },
      { new: true }
    ).populate('restaurant ngo', 'name email');

    if (!donation) {
      return next(new ErrorResponse('Donation not found', 404));
    }

    // Notify involved parties
    if (donation.ngo) {
      await sendEmail({
        email: donation.ngo.email,
        subject: 'Donation Cancellation',
        message: `Donation ${donation._id} has been cancelled by admin. Reason: ${donation.cancellationReason}`
      });
    }

    if (donation.restaurant) {
      await sendEmail({
        email: donation.restaurant.email,
        subject: 'Donation Cancellation',
        message: `Your donation ${donation._id} has been cancelled by admin. Reason: ${donation.cancellationReason}`
      });
    }

    res.status(200).json({
      success: true,
      data: donation
    });
  } catch (err) {
    next(err);
  }
};

// @desc    View verification document
// @route   GET /api/admin/documents/:id
exports.viewDocument = async (req, res, next) => {
  try {
    const entity = await NGO.findById(req.params.id) || await Restaurant.findById(req.params.id);
    
    if (!entity) {
      return next(new ErrorResponse('Entity not found', 404));
    }

    if (!entity.document) {
      return next(new ErrorResponse('No document found', 404));
    }

    // Construct absolute path to document
    const documentPath = path.join(__dirname, '..', entity.document);

    // Check if file exists
    if (!fs.existsSync(documentPath)) {
      return next(new ErrorResponse('Document file not found', 404));
    }

    // Get file extension
    const ext = path.extname(documentPath).toLowerCase();
    
    // Set appropriate content type
    const contentType = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.pdf': 'application/pdf'
    }[ext] || 'application/octet-stream';

    // Set content type header
    res.setHeader('Content-Type', contentType);
    
    // Send file
    res.sendFile(documentPath);
  } catch (err) {
    next(err);
  }
};

// @desc    Get all NGOs
// @route   GET /api/v1/admin/ngos
exports.getAllNGOs = async (req, res, next) => {
  try {
    const ngos = await NGO.find()
      .select('-password')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: ngos.length,
      data: ngos
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all restaurants
// @route   GET /api/v1/admin/restaurants
exports.getAllRestaurants = async (req, res, next) => {
  try {
    const restaurants = await Restaurant.find()
      .select('-password')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: restaurants.length,
      data: restaurants
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all donations
// @route   GET /api/v1/admin/donations
exports.getAllDonations = async (req, res, next) => {
  try {
    const donations = await Donation.find()
      .populate('restaurant', 'name email')
      .populate('ngo', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: donations.length,
      data: donations
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Toggle NGO status (active/inactive)
// @route   PUT /api/v1/admin/ngos/:id/toggle-status
exports.toggleNGOStatus = async (req, res, next) => {
  try {
    const ngo = await NGO.findById(req.params.id);
    if (!ngo) {
      return next(new ErrorResponse('NGO not found', 404));
    }

    ngo.isActive = !ngo.isActive;
    await ngo.save();

    res.status(200).json({
      success: true,
      data: ngo
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Toggle Restaurant status (active/inactive)
// @route   PUT /api/v1/admin/restaurants/:id/toggle-status
exports.toggleRestaurantStatus = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return next(new ErrorResponse('Restaurant not found', 404));
    }

    restaurant.isActive = !restaurant.isActive;
    await restaurant.save();

    res.status(200).json({
      success: true,
      data: restaurant
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete NGO
// @route   DELETE /api/v1/admin/ngos/:id
exports.deleteNGO = async (req, res, next) => {
  try {
    const ngo = await NGO.findById(req.params.id);
    if (!ngo) {
      return next(new ErrorResponse('NGO not found', 404));
    }

    await ngo.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete Restaurant
// @route   DELETE /api/v1/admin/restaurants/:id
exports.deleteRestaurant = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return next(new ErrorResponse('Restaurant not found', 404));
    }

    await restaurant.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};