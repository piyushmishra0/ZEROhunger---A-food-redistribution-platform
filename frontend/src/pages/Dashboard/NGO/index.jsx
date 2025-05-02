import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  IconButton,
  Tooltip,
  Fade,
  Zoom,
  Slide
} from '@mui/material';
import {
  LocationOn,
  AccessTime,
  Restaurant,
  LocalShipping,
  CheckCircle,
  Error,
  Update,
  Info
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import UpdateProfile from '../../../components/UpdateProfile';
import { motion } from 'framer-motion';

// Haversine formula to calculate distance between two lat/lng points
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const NGODashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [donations, setDonations] = useState({
    nearby: [],
    claimed: [],
    completed: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [radiusDialog, setRadiusDialog] = useState(false);
  const [newRadius, setNewRadius] = useState('');
  const [verificationStatus, setVerificationStatus] = useState({ verified: false, message: '' });
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    checkVerificationStatus();
    fetchDonations();
    // Get user's current geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          setUserLocation(null);
        }
      );
    }
  }, [activeTab]);

  const checkVerificationStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/v1/ngo/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setVerificationStatus({
        verified: response.data.data.verified,
        message: response.data.data.verified ? 
          '' : 
          'Your account is pending verification. You will be able to view and claim donations once verified.'
      });
    } catch (err) {
      console.error('Error checking verification status:', err);
      setError(err.response?.data?.error || 'Failed to check verification status');
    }
  };

  const fetchDonations = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [nearbyRes, claimedRes, completedRes] = await Promise.all([
        axios.get('/api/v1/donations/nearby', { headers }),
        axios.get('/api/v1/ngo/donations', { headers }),
        axios.get('/api/v1/ngo/donations/completed', { headers })
      ]);

      setDonations({
        nearby: nearbyRes.data.data,
        claimed: claimedRes.data.data,
        completed: completedRes.data.data
      });
      setError('');
    } catch (err) {
      console.error('Error fetching donations:', err);
      if (err.response?.status === 403) {
        setVerificationStatus({
          verified: false,
          message: err.response.data.error || 'Your account is pending verification.'
        });
      } else if (err.response?.status === 400 && err.response.data.error.includes('Location not set')) {
        setError('Please update your profile with a valid address to see nearby donations.');
      } else {
        setError(err.response?.data?.error || 'Failed to fetch donations');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClaimDonation = async (donationId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      await axios.put(`/api/v1/donations/${donationId}/claim`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchDonations();
    } catch (err) {
      console.error('Error claiming donation:', err);
      setError(err.response?.data?.error || 'Failed to claim donation');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteDonation = async (donationId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      await axios.put(`/api/v1/donations/${donationId}/complete`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchDonations();
    } catch (err) {
      console.error('Error completing donation:', err);
      setError(err.response?.data?.error || 'Failed to complete donation');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRadius = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      await axios.put('/api/v1/ngo/radius', 
        { radius: Number(newRadius) },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      setRadiusDialog(false);
      await fetchDonations();
    } catch (err) {
      console.error('Error updating radius:', err);
      setError(err.response?.data?.error || 'Failed to update radius');
    } finally {
      setLoading(false);
    }
  };

  const DonationCard = ({ donation, type }) => {
    // Calculate distance from user's current location to donation
    let distance = null;
    if (
      userLocation &&
      donation.restaurant &&
      donation.restaurant.location &&
      Array.isArray(donation.restaurant.location.coordinates)
    ) {
      // GeoJSON: [lng, lat]
      const [donLng, donLat] = donation.restaurant.location.coordinates;
      distance = haversineDistance(
        userLocation.lat,
        userLocation.lng,
        donLat,
        donLng
      );
    }
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card 
          sx={{ 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            boxShadow: 3,
            '&:hover': {
              boxShadow: 6,
              transform: 'translateY(-4px)',
              transition: 'all 0.3s ease-in-out'
            }
          }}
        >
          <CardContent sx={{ flexGrow: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                {donation.restaurant.name}
              </Typography>
              <Chip 
                label={type === 'nearby' ? 'Available' : type === 'claimed' ? 'Claimed' : 'Completed'}
                color={type === 'nearby' ? 'success' : type === 'claimed' ? 'warning' : 'info'}
                size="small"
              />
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Restaurant sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="body2">
                {donation.foodType} - {donation.quantity}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <AccessTime sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="body2">
                Expires: {new Date(donation.expiryTime).toLocaleString()}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <LocationOn sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="body2">
                {donation.restaurant?.address ||
                  (donation.restaurant?.location?.formattedAddress ||
                  (donation.restaurant?.location?.coordinates
                    ? `(${donation.restaurant.location.coordinates[1]}, ${donation.restaurant.location.coordinates[0]})`
                    : 'No address available'))}
              </Typography>
            </Box>

            {type === 'nearby' && (
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <LocalShipping sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="body2" color="primary">
                  Distance: {distance !== null ? distance.toFixed(2) : '...'} km
                </Typography>
              </Box>
            )}
          </CardContent>

          <CardActions sx={{ justifyContent: 'flex-end', p: 2 }}>
            {type === 'nearby' && (
              <Tooltip title="Claim this donation">
                <Button 
                  variant="contained" 
                  color="primary"
                  onClick={() => handleClaimDonation(donation._id)}
                  startIcon={<CheckCircle />}
                  disabled={loading}
                >
                  Claim
                </Button>
              </Tooltip>
            )}
            {type === 'claimed' && (
              <Tooltip title="Mark as completed">
                <Button 
                  variant="contained" 
                  color="success"
                  onClick={() => handleCompleteDonation(donation._id)}
                  startIcon={<CheckCircle />}
                  disabled={loading}
                >
                  Complete
                </Button>
              </Tooltip>
            )}
          </CardActions>
        </Card>
      </motion.div>
    );
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Slide direction="down" in={true} mountOnEnter unmountOnExit>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
              NGO Dashboard
            </Typography>
            <Button 
              variant="contained" 
              onClick={() => setRadiusDialog(true)}
              disabled={!verificationStatus.verified}
              startIcon={<Update />}
            >
              Update Operating Radius
            </Button>
          </Box>
        </Slide>

        {verificationStatus.message && (
          <Fade in={true}>
            <Alert severity="warning" sx={{ mb: 2 }}>
              {verificationStatus.message}
            </Alert>
          </Fade>
        )}

        {error && (
          <Fade in={true}>
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          </Fade>
        )}

        <Paper sx={{ width: '100%', mb: 2, borderRadius: 2 }}>
          <Tabs
            value={activeTab}
            onChange={(e, newValue) => setActiveTab(newValue)}
            indicatorColor="primary"
            textColor="primary"
            variant="fullWidth"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab 
              label="Available Donations" 
              disabled={!verificationStatus.verified}
              icon={<Restaurant />}
              iconPosition="start"
            />
            <Tab 
              label="Claimed Donations" 
              disabled={!verificationStatus.verified}
              icon={<LocalShipping />}
              iconPosition="start"
            />
            <Tab 
              label="Completed Donations" 
              disabled={!verificationStatus.verified}
              icon={<CheckCircle />}
              iconPosition="start"
            />
            <Tab 
              label="Update Profile"
              icon={<Info />}
              iconPosition="start"
            />
          </Tabs>

          {loading && activeTab !== 3 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ p: 3 }}>
              {activeTab === 3 ? (
                <UpdateProfile userType="ngo" />
              ) : !verificationStatus.verified ? (
                <Box sx={{ textAlign: 'center', p: 3 }}>
                  <Typography color="text.secondary">
                    {verificationStatus.message}
                  </Typography>
                </Box>
              ) : (
                <Grid container spacing={3}>
                  {activeTab === 0 && donations.nearby.map((donation) => (
                    <Grid item xs={12} sm={6} md={4} key={donation._id}>
                      <DonationCard donation={donation} type="nearby" />
                    </Grid>
                  ))}
                  {activeTab === 1 && donations.claimed.map((donation) => (
                    <Grid item xs={12} sm={6} md={4} key={donation._id}>
                      <DonationCard donation={donation} type="claimed" />
                    </Grid>
                  ))}
                  {activeTab === 2 && donations.completed.map((donation) => (
                    <Grid item xs={12} sm={6} md={4} key={donation._id}>
                      <DonationCard donation={donation} type="completed" />
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>
          )}
        </Paper>
      </Box>

      <Dialog 
        open={radiusDialog} 
        onClose={() => setRadiusDialog(false)}
        TransitionComponent={Zoom}
      >
        <DialogTitle>Update Operating Radius</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Radius (in km)"
            type="number"
            fullWidth
            value={newRadius}
            onChange={(e) => setNewRadius(e.target.value)}
            inputProps={{ min: 1 }}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRadiusDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleUpdateRadius} 
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default NGODashboard; 