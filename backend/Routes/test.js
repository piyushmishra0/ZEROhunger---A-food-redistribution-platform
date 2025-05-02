const express = require('express');
const router = express.Router();
require('dotenv').config({ path: '../.env' });
const geocoder = require('../utils/geocoder');

// Test forward geocoding
router.get('/geocode', async (req, res) => {
  try {
    const { address } = req.query;
    if (!address) {
      return res.status(400).json({
        success: false,
        error: 'Please provide an address'
      });
    }

    console.log('Environment variables:', {
      OPENCAGE_API_KEY: process.env.OPENCAGE_API_KEY,
      NODE_ENV: process.env.NODE_ENV
    });

    const results = await geocoder.geocode(address);
    res.status(200).json({
      success: true,
      data: results
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Test reverse geocoding
router.get('/reverse-geocode', async (req, res) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        error: 'Please provide latitude and longitude'
      });
    }

    const result = await geocoder.reverseGeocode(parseFloat(lat), parseFloat(lng));
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

module.exports = router; 