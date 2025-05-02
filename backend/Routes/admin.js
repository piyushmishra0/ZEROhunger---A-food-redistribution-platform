const express = require('express');
const router = express.Router();
const {
  getPendingVerifications,
  verifyEntity,
  getSystemStats,
  cancelDonation,
  viewDocument,
  getAllNGOs,
  getAllRestaurants,
  getAllDonations,
  toggleNGOStatus,
  toggleRestaurantStatus,
  deleteNGO,
  deleteRestaurant
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../utils/upload');

// Admin-protected routes
router.use(protect);
router.use(authorize('admin'));

// User management
router.get('/ngos', getAllNGOs);
router.get('/restaurants', getAllRestaurants);
router.put('/ngos/:id/toggle-status', toggleNGOStatus);
router.put('/restaurants/:id/toggle-status', toggleRestaurantStatus);
router.delete('/ngos/:id', deleteNGO);
router.delete('/restaurants/:id', deleteRestaurant);

// Verification management
router.get('/pending', getPendingVerifications);
router.put('/verify/:id', verifyEntity);

// Document access
router.get('/documents/:id', viewDocument);

// Donation management
router.get('/donations', getAllDonations);
router.put('/donations/cancel/:id', cancelDonation);

// Analytics
router.get('/stats', getSystemStats);

module.exports = router;