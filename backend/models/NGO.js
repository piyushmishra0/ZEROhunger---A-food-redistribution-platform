const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const geocoder = require('../utils/geocoder');

const NGOSchema = new mongoose.Schema({
  ngoId: {
    type: String,
    required: [true, 'Please add an NGO registration ID'],
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false
  },
  phone: {
    type: String,
    required: [true, 'Please add a phone number']
  },
  address: {
    type: String,
    required: [true, 'Please add an address']
  },
  location: {
    type: {
      type: String,
      enum: ['Point']
    },
    coordinates: {
      type: [Number],
      index: '2dsphere'
    },
    formattedAddress: String,
    street: String,
    city: String,
    state: String,
    zipcode: String,
    country: String
  },
  operatingRadius: {
    type: Number,
    required: [true, 'Please add operating radius in kilometers'],
    default: 5
  },
  document: {
    type: String,
    required: [true, 'Please upload registration document']
  },
  verified: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    default: 'ngo'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Encrypt password using bcrypt
NGOSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Geocode & create location field
NGOSchema.pre('save', async function(next) {
  if (!this.isModified('address')) {
    next();
    return;
  }

  try {
    const loc = await geocoder.geocode(this.address);
    if (!loc || loc.length === 0) {
      throw new Error('Could not geocode address');
    }

    this.location = {
      type: 'Point',
      coordinates: [loc[0].longitude, loc[0].latitude],
      formattedAddress: loc[0].formattedAddress,
      street: loc[0].streetName,
      city: loc[0].city,
      state: loc[0].stateCode,
      zipcode: loc[0].zipcode,
      country: loc[0].countryCode
    };
    next();
  } catch (err) {
    console.error('Geocoding error:', err);
    next(new Error('Failed to geocode address. Please check the address and try again.'));
  }
});

// Sign JWT and return
NGOSchema.methods.getSignedJwtToken = function() {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// Match user entered password to hashed password in database
NGOSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('NGO', NGOSchema); 