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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider
} from '@mui/material';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import UpdateProfile from '../../../components/UpdateProfile';

const RestaurantDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [donations, setDonations] = useState({
    active: [],
    completed: []
  });
  const [stats, setStats] = useState({
    totalDonations: 0,
    claimedDonations: 0,
    completedDonations: 0,
    uniqueNGOsHelped: 0,
    fulfillmentRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [donationDialog, setDonationDialog] = useState(false);
  const [newDonation, setNewDonation] = useState({
    description: '',
    quantity: '',
    foodType: 'cooked',
    expiryHours: '2',
    address: ''
  });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    if (activeTab !== 2) { // Don't fetch if on profile tab
      fetchDonations();
      fetchStats();
    }
  }, [activeTab]);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get('/api/v1/restaurant/stats', { headers });
      setStats(response.data.data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchDonations = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [activeRes, completedRes] = await Promise.all([
        axios.get('/api/v1/restaurant/donations/active', { headers }),
        axios.get('/api/v1/restaurant/donations/completed', { headers })
      ]);

      setDonations({
        active: activeRes.data.data,
        completed: completedRes.data.data
      });
      setError('');
    } catch (err) {
      console.error('Error fetching donations:', err);
      setError(err.response?.data?.error || 'Failed to fetch donations');
    } finally {
      setLoading(false);
    }
  };

  const validateDonationForm = () => {
    const errors = {};
    if (!newDonation.description.trim()) {
      errors.description = 'Description is required';
    }
    if (!newDonation.quantity.trim()) {
      errors.quantity = 'Quantity is required';
    }
    if (!newDonation.foodType) {
      errors.foodType = 'Type is required';
    }
    if (!newDonation.address?.trim()) {
      errors.address = 'Address is required';
    }
    if (!newDonation.expiryHours || Number(newDonation.expiryHours) < 1) {
      errors.expiryHours = 'Expiry hours must be at least 1';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateDonation = async () => {
    if (!validateDonationForm()) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/v1/restaurant/donations', 
        {
          foodType: newDonation.foodType,
          quantity: newDonation.quantity,
          description: newDonation.description,
          address: newDonation.address || 'Default address',
          expiryTime: new Date(Date.now() + Number(newDonation.expiryHours) * 60 * 60 * 1000).toISOString()
        },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      setDonationDialog(false);
      setNewDonation({
        description: '',
        quantity: '',
        foodType: 'cooked',
        expiryHours: '2',
        address: ''
      });
      setFormErrors({});
      fetchDonations();
      fetchStats();
    } catch (err) {
      console.error('Error creating donation:', err);
      setError(err.response?.data?.error || 'Failed to create donation');
    }
  };

  const handleCancelDonation = async (donationId) => {
    if (!window.confirm('Are you sure you want to cancel this donation?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/v1/restaurant/donations/${donationId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchDonations();
      fetchStats();
    } catch (err) {
      console.error('Error canceling donation:', err);
      setError(err.response?.data?.error || 'Failed to cancel donation');
    }
  };

  const DonationCard = ({ donation }) => (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography variant="h6" gutterBottom>
          {donation.description}
        </Typography>
        <Typography variant="body2">
          Quantity: {donation.quantity}
        </Typography>
        <Typography variant="body2">
          Type: {donation.foodType}
        </Typography>
        <Typography variant="body2">
          Expires: {new Date(donation.expiryTime).toLocaleString()}
        </Typography>
        {donation.claimedBy && (
          <Typography variant="body2" color="primary">
            Claimed by: {donation.claimedBy.name}
          </Typography>
        )}
        {donation.status === 'completed' && (
          <Typography variant="body2" color="success.main">
            Completed on: {new Date(donation.completedAt).toLocaleString()}
          </Typography>
        )}
      </CardContent>
      {donation.status === 'available' && (
        <CardActions>
          <Button 
            size="small" 
            color="error"
            onClick={() => handleCancelDonation(donation._id)}
          >
            Cancel Donation
          </Button>
        </CardActions>
      )}
    </Card>
  );

  const StatCard = ({ title, value }) => (
    <Card>
      <CardContent>
        <Typography color="textSecondary" gutterBottom>
          {title}
        </Typography>
        <Typography variant="h5">
          {value}
        </Typography>
      </CardContent>
    </Card>
  );

  return (
    <Container>
      <Box sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h4" component="h1">
              Restaurant Dashboard
            </Typography>
            <Typography variant="subtitle1" color="textSecondary">
              Welcome back, {user?.name}!
            </Typography>
          </Box>
          {activeTab === 0 && (
            <Button 
              variant="contained" 
              onClick={() => setDonationDialog(true)}
              disabled={!user?.verified}
            >
              Create New Donation
            </Button>
          )}
        </Box>

        {!user?.verified && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Your account is pending verification. You will be able to create donations once verified.
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {activeTab !== 2 && (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard title="Total Donations" value={stats.totalDonations} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard title="Claimed Donations" value={stats.claimedDonations} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard title="Completed Donations" value={stats.completedDonations} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard title="NGOs Helped" value={stats.uniqueNGOsHelped} />
            </Grid>
          </Grid>
        )}

        <Paper sx={{ width: '100%', mb: 2 }}>
          <Tabs
            value={activeTab}
            onChange={(e, newValue) => setActiveTab(newValue)}
            indicatorColor="primary"
            textColor="primary"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label="Active Donations" />
            <Tab label="Completed Donations" />
            <Tab label="Update Profile" />
          </Tabs>

          {loading && activeTab !== 2 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ p: 2 }}>
              {activeTab === 2 ? (
                <UpdateProfile userType="restaurant" />
              ) : (
                <Grid container spacing={3}>
                  {activeTab === 0 && donations.active.map((donation) => (
                    <Grid item xs={12} sm={6} md={4} key={donation._id}>
                      <DonationCard donation={donation} />
                    </Grid>
                  ))}
                  {activeTab === 1 && donations.completed.map((donation) => (
                    <Grid item xs={12} sm={6} md={4} key={donation._id}>
                      <DonationCard donation={donation} />
                    </Grid>
                  ))}
                  {activeTab === 0 && donations.active.length === 0 && (
                    <Grid item xs={12}>
                      <Typography variant="body1" color="textSecondary" align="center">
                        No active donations found.
                      </Typography>
                    </Grid>
                  )}
                  {activeTab === 1 && donations.completed.length === 0 && (
                    <Grid item xs={12}>
                      <Typography variant="body1" color="textSecondary" align="center">
                        No completed donations found.
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              )}
            </Box>
          )}
        </Paper>
      </Box>

      <Dialog open={donationDialog} onClose={() => setDonationDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Donation</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Description"
              value={newDonation.description}
              onChange={(e) => setNewDonation({ ...newDonation, description: e.target.value })}
              error={!!formErrors.description}
              helperText={formErrors.description}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Address"
              value={newDonation.address}
              onChange={(e) => setNewDonation({ ...newDonation, address: e.target.value })}
              error={!!formErrors.address}
              helperText={formErrors.address}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Quantity"
              value={newDonation.quantity}
              onChange={(e) => setNewDonation({ ...newDonation, quantity: e.target.value })}
              error={!!formErrors.quantity}
              helperText={formErrors.quantity}
              margin="normal"
            />
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Type</InputLabel>
              <Select
                value={newDonation.foodType}
                label="Type"
                onChange={(e) => setNewDonation({ ...newDonation, foodType: e.target.value })}
                error={!!formErrors.foodType}
              >
                <MenuItem value="cooked">Cooked Food</MenuItem>
                <MenuItem value="raw">Raw Food</MenuItem>
                <MenuItem value="packaged">Packaged Food</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              type="number"
              label="Expiry Hours"
              value={newDonation.expiryHours}
              onChange={(e) => setNewDonation({ ...newDonation, expiryHours: e.target.value })}
              error={!!formErrors.expiryHours}
              helperText={formErrors.expiryHours}
              inputProps={{ min: 1, max: 72 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDonationDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateDonation} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default RestaurantDashboard; 