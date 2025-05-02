const express = require('express');
const router = express.Router();
const {
  getProfile,
  updateProfile,
  getActiveDonations,
  getCompletedDonations,
  createDonation,
  deleteDonation,
  getStats
} = require(require('path').resolve(__dirname, '../controllers/restaurantController'));
const { protect, authorize } = require('../middleware/auth');

// Protect all routes
router.use(protect);
router.use(authorize('restaurant'));

// Profile routes
router.get('/me', getProfile);
router.put('/me', updateProfile);

// Donation routes
router.get('/donations/active', getActiveDonations);
router.get('/donations/completed', getCompletedDonations);
router.post('/donations', createDonation);
router.delete('/donations/:id', deleteDonation);

// Analytics
router.get('/stats', getStats);

module.exports = router; 