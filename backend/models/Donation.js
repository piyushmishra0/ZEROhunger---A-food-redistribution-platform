const mongoose = require('mongoose');
const geocoder = require('../utils/geocoder');

const DonationSchema = new mongoose.Schema({
  restaurant: {
    type: mongoose.Schema.ObjectId,
    ref: 'Restaurant',
    required: true
  },
  ngo: {
    type: mongoose.Schema.ObjectId,
    ref: 'NGO',
    default: null
  },
  claimedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'NGO',
    default: null
  },
  foodType: {
    type: String,
    required: [true, 'Please specify the type of food']
  },
  quantity: {
    type: String,
    required: [true, 'Please specify the quantity']
  },
  address: {
    type: String,
    required: [true, 'Please add pickup address']
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
  expiryTime: {
    type: Date,
    required: [true, 'Please add food expiry time']
  },
  status: {
    type: String,
    enum: ['available', 'claimed', 'delivered', 'cancelled'],
    default: 'available'
  },
  claimedAt: {
    type: Date,
    default: null
  },
  deliveredAt: {
    type: Date,
    default: null
  },
  cancelledBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'Admin',
    default: null
  },
  cancellationReason: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create 2dsphere index for location
DonationSchema.index({ location: '2dsphere' });

// Geocode & create location field
DonationSchema.pre('save', async function(next) {
  if (!this.isModified('address')) {
    next();
  }

  try {
    const loc = await geocoder.geocode(this.address);
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
  } catch (err) {
    console.error('Geocoding failed:', err);
  }

  next();
});

module.exports = mongoose.model('Donation', DonationSchema); 