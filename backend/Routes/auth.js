const express = require('express');
const router = express.Router();
const {
  registerNGO,
  registerRestaurant,
  login,
  getMe,
  logout,
  forgotPassword,
  resetPassword,
  updateDetails,
  updatePassword
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { upload, attachFileUrl } = require('../utils/upload');

// Public routes
router.post('/register/ngo', upload.single('document'), attachFileUrl, registerNGO);
router.post('/register/restaurant', upload.single('document'), attachFileUrl, registerRestaurant);
router.post('/login', login);
router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:resettoken', resetPassword);

// Protected routes
router.use(protect);

router.get('/me', getMe);
router.get('/logout', logout);
router.put('/updatedetails', updateDetails);
router.put('/updatepassword', updatePassword);

module.exports = router;