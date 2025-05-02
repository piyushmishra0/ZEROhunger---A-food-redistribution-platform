const express = require('express');
const router = express.Router();
const {
  createDonation,
  getDonations,
  getNearbyDonations,
  getPublicDonations,
  claimDonation,
  updateDonation,
  deleteDonation,
  getDonationHistory,
  completeDonation
} = require('../controllers/donationController');
const { protect, authorize } = require('../middleware/auth');

// Public routes
router.get('/public', getPublicDonations);

// Protected routes
router.use(protect);

// Restaurant-specific routes
router.post('/', 
  authorize('restaurant'), 
  createDonation
);

router.get('/restaurant', 
  authorize('restaurant'), 
  getDonationHistory
);

// NGO-specific routes
router.get('/nearby', 
  authorize('ngo'), 
  getNearbyDonations
);

router.put('/:id/claim', 
  authorize('ngo'), 
  claimDonation
);

router.put('/:id/complete', 
  authorize('ngo'), 
  completeDonation
);

// Shared routes
router.get('/', getDonations);
router.put('/:id', updateDonation);
router.delete('/:id', deleteDonation);

module.exports = router;