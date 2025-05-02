const NGO = require('../models/NGO');
const Restaurant = require('../models/Restaurant');
const Admin = require('../models/Admin');
const ErrorResponse = require('../utils/errorResponse');
const sendEmail = require('../utils/emailService');
const crypto = require('crypto');
const geocoder = require('../utils/geocoder');

// @desc    Register NGO
// @route   POST /api/auth/register/ngo
exports.registerNGO = async (req, res, next) => {
  const { name, email, password, ngoId, phone, address } = req.body;

  try {
    // Check if NGO ID exists
    const existingNGO = await NGO.findOne({ ngoId });
    if (existingNGO) {
      return next(new ErrorResponse('NGO ID already registered', 400));
    }

    // Geocode address before creating NGO
    let location;
    try {
      const loc = await geocoder.geocode(address);
      if (!loc || loc.length === 0) {
        return next(new ErrorResponse('Could not geocode address. Please check the address and try again.', 400));
      }

      location = {
        type: 'Point',
        coordinates: [loc[0].longitude, loc[0].latitude],
        formattedAddress: loc[0].formattedAddress,
        street: loc[0].streetName,
        city: loc[0].city,
        state: loc[0].stateCode,
        zipcode: loc[0].zipcode,
        country: loc[0].countryCode
      };
    } catch (err) {
      console.error('Geocoding error:', err);
      return next(new ErrorResponse('Failed to geocode address. Please check the address and try again.', 400));
    }

    // Create NGO with location
    const ngo = await NGO.create({
      name,
      email,
      password,
      ngoId,
      phone,
      address,
      location,
      document: req.file.path
    });

    sendTokenResponse(ngo, 201, res);
  } catch (err) {
    console.error('Registration error:', err);
    next(new ErrorResponse('Failed to register NGO', 500));
  }
};

// @desc    Register Restaurant
// @route   POST /api/auth/register/restaurant
exports.registerRestaurant = async (req, res, next) => {
  try {
    console.log('Registration request body:', req.body);
    console.log('File:', req.file);
    
    const { name, email, password, gstNumber, phone, address } = req.body;

    // Validate GST number format
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!gstRegex.test(gstNumber)) {
      console.log('Invalid GST format:', gstNumber);
      return next(new ErrorResponse('Invalid GST number format', 400));
    }

    // Check if GST exists
    const existingRestaurant = await Restaurant.findOne({ gstNumber });
    if (existingRestaurant) {
      console.log('GST already exists:', gstNumber);
      return next(new ErrorResponse('GST number already registered', 400));
    }

    // Create Restaurant with only the required fields
    const restaurantData = {
      name,
      email,
      password,
      gstNumber,
      phone,
      address
    };

    if (req.file) {
      restaurantData.document = req.file.path;
    } else {
      console.log('No document file provided');
      return next(new ErrorResponse('Please upload your FSSAI license', 400));
    }

    console.log('Creating restaurant with data:', restaurantData);
    const restaurant = await Restaurant.create(restaurantData);

    sendTokenResponse(restaurant, 201, res);
  } catch (err) {
    console.error('Registration error:', err);
    next(err);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
exports.login = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new ErrorResponse('Please provide email and password', 400));
  }

  try {
    // Check in all collections
    let user = await Admin.findOne({ email }).select('+password') ||
               await NGO.findOne({ email }).select('+password') || 
               await Restaurant.findOne({ email }).select('+password');

    if (!user) {
      return next(new ErrorResponse('Invalid credentials', 401));
    }

    // Check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return next(new ErrorResponse('Invalid credentials', 401));
    }

    // Check if account is verified (except for admin)
    if (!user.verified && user.role !== 'admin') {
      return next(new ErrorResponse('Account not verified yet', 403));
    }

    sendTokenResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
exports.getMe = async (req, res, next) => {
  try {
    let user;
    if (req.user.role === 'ngo') {
      user = await NGO.findById(req.user.id).select('-password');
    } else if (req.user.role === 'restaurant') {
      user = await Restaurant.findById(req.user.id).select('-password');
    } else if (req.user.role === 'admin') {
      user = await Admin.findById(req.user.id).select('-password');
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Logout user
// @route   GET /api/auth/logout
exports.logout = (req, res, next) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  res.status(200).json({
    success: true,
    data: {}
  });
};

// @desc    Forgot password
// @route   POST /api/auth/forgotpassword
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    // Find user
    const user = await NGO.findOne({ email }) || await Restaurant.findOne({ email });
    if (!user) {
      return next(new ErrorResponse('No user found with that email', 404));
    }

    // Get reset token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash token and set to resetPasswordToken field
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Set expire
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

    await user.save({ validateBeforeSave: false });

    // Create reset url
    const resetUrl = `${req.protocol}://${req.get('host')}/api/auth/resetpassword/${resetToken}`;

    const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please make a PUT request to: \n\n ${resetUrl}`;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Password reset token',
        message
      });

      res.status(200).json({ success: true, data: 'Email sent' });
    } catch (err) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;

      await user.save({ validateBeforeSave: false });

      return next(new ErrorResponse('Email could not be sent', 500));
    }
  } catch (err) {
    next(err);
  }
};

// @desc    Reset password
// @route   PUT /api/auth/resetpassword/:resettoken
exports.resetPassword = async (req, res, next) => {
  try {
    // Get hashed token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.resettoken)
      .digest('hex');

    // Find user
    const user = await NGO.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    }) || await Restaurant.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return next(new ErrorResponse('Invalid token', 400));
    }

    // Set new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// @desc    Update user details
// @route   PUT /api/auth/updatedetails
exports.updateDetails = async (req, res, next) => {
  try {
    const fieldsToUpdate = {
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone
    };

    let user;
    if (req.user.role === 'ngo') {
      user = await NGO.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
        new: true,
        runValidators: true
      });
    } else if (req.user.role === 'restaurant') {
      user = await Restaurant.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
        new: true,
        runValidators: true
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update password
// @route   PUT /api/auth/updatepassword
exports.updatePassword = async (req, res, next) => {
  try {
    let user;
    if (req.user.role === 'ngo') {
      user = await NGO.findById(req.user.id).select('+password');
    } else if (req.user.role === 'restaurant') {
      user = await Restaurant.findById(req.user.id).select('+password');
    }

    // Check current password
    if (!(await user.matchPassword(req.body.currentPassword))) {
      return next(new ErrorResponse('Password is incorrect', 401));
    }

    user.password = req.body.newPassword;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// Helper function for token response
const sendTokenResponse = (user, statusCode, res) => {
  const token = user.getSignedJwtToken();

  const options = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  };

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token,
      role: user.role
    });
};