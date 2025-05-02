const express = require('express');
const router = express.Router();
const {
  getProfile,
  updateProfile,
  getMyDonations,
  updateOperatingRadius,
  getCompletedDonations
} = require('../controllers/ngoController');
const { protect, authorize } = require('../middleware/auth');

// Protect all routes
router.use(protect);
router.use(authorize('ngo'));

// Profile routes
router.get('/me', getProfile);
router.put('/me', updateProfile);

// Donation routes
router.get('/donations/completed', getCompletedDonations);
router.get('/donations', getMyDonations);

// Settings
router.put('/radius', updateOperatingRadius);

module.exports = router;