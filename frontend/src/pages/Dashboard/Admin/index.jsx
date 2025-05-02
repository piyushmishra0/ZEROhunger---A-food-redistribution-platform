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
  DialogContentText,
  DialogActions,
} from '@mui/material';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    totalNGOs: 0,
    verifiedNGOs: 0,
    totalRestaurants: 0,
    verifiedRestaurants: 0,
    totalDonations: 0,
    completedDonations: 0
  });
  const [pendingUsers, setPendingUsers] = useState({
    ngos: [],
    restaurants: []
  });
  const [selectedUser, setSelectedUser] = useState(null);
  const [viewDocumentDialog, setViewDocumentDialog] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchPendingUsers();
    const interval = setInterval(fetchStats, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, [activeTab]);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get('/api/v1/admin/stats', { headers });
      setStats(response.data.data);
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError(err.response?.data?.error || 'Failed to fetch statistics');
    }
  };

  const fetchPendingUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const response = await axios.get('/api/v1/admin/pending', { headers });

      setPendingUsers({
        ngos: response.data.ngos || [],
        restaurants: response.data.restaurants || []
      });
      setError('');
    } catch (err) {
      console.error('Error fetching pending users:', err);
      setError(err.response?.data?.error || 'Failed to fetch pending users');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (userId, userType, verified) => {
    try {
      const token = localStorage.getItem('token');
      const endpoint = `/api/v1/admin/verify/${userId}`;
      
      await axios.put(endpoint, { 
        status: verified ? 'approved' : 'rejected',
        reason: verified ? 'Document verified' : 'Document verification failed'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      fetchPendingUsers();
      fetchStats();
    } catch (err) {
      console.error('Error updating verification status:', err);
      setError(err.response?.data?.error || 'Failed to update verification status');
    }
  };

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

  const UserCard = ({ user, type }) => (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography variant="h6" gutterBottom>
          {user.name}
        </Typography>
        <Typography variant="body2">
          Email: {user.email}
        </Typography>
        <Typography variant="body2">
          Phone: {user.phone}
        </Typography>
        <Typography variant="body2">
          Address: {user.address}
        </Typography>
        {type === 'ngo' && (
          <Typography variant="body2">
            Operating Radius: {user.operatingRadius} km
          </Typography>
        )}
      </CardContent>
      <CardActions>
        {user.document && (
          <Button 
            size="small" 
            color="primary"
            onClick={() => {
              setSelectedUser(user);
              setViewDocumentDialog(true);
            }}
          >
            View Document
          </Button>
        )}
        <Button 
          size="small" 
          color="success"
          onClick={() => handleVerify(user._id, type, true)}
        >
          Verify
        </Button>
        <Button 
          size="small" 
          color="error"
          onClick={() => handleVerify(user._id, type, false)}
        >
          Reject
        </Button>
      </CardActions>
    </Card>
  );

  return (
    <Container>
      <Box sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h4" component="h1">
              Admin Dashboard
            </Typography>
            <Typography variant="subtitle1" color="textSecondary">
              Welcome back, {user?.name}!
            </Typography>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={4}>
            <StatCard title="Total NGOs" value={stats.totalNGOs} />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <StatCard title="Verified NGOs" value={stats.verifiedNGOs} />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <StatCard title="Total Restaurants" value={stats.totalRestaurants} />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <StatCard title="Verified Restaurants" value={stats.verifiedRestaurants} />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <StatCard title="Total Donations" value={stats.totalDonations} />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <StatCard title="Completed Donations" value={stats.completedDonations} />
          </Grid>
        </Grid>

        <Paper sx={{ width: '100%', mb: 2 }}>
          <Tabs
            value={activeTab}
            onChange={(e, newValue) => setActiveTab(newValue)}
            indicatorColor="primary"
            textColor="primary"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label="Pending NGOs" />
            <Tab label="Pending Restaurants" />
          </Tabs>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ p: 2 }}>
              <Grid container spacing={3}>
                {activeTab === 0 && pendingUsers.ngos.map((ngo) => (
                  <Grid item xs={12} sm={6} md={4} key={ngo._id}>
                    <UserCard user={ngo} type="ngo" />
                  </Grid>
                ))}
                {activeTab === 1 && pendingUsers.restaurants.map((restaurant) => (
                  <Grid item xs={12} sm={6} md={4} key={restaurant._id}>
                    <UserCard user={restaurant} type="restaurant" />
                  </Grid>
                ))}
                {activeTab === 0 && pendingUsers.ngos.length === 0 && (
                  <Grid item xs={12}>
                    <Typography variant="body1" color="textSecondary" align="center">
                      No pending NGO verifications.
                    </Typography>
                  </Grid>
                )}
                {activeTab === 1 && pendingUsers.restaurants.length === 0 && (
                  <Grid item xs={12}>
                    <Typography variant="body1" color="textSecondary" align="center">
                      No pending restaurant verifications.
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </Paper>
      </Box>

      <Dialog 
        open={viewDocumentDialog} 
        onClose={() => setViewDocumentDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>View Document</DialogTitle>
        <DialogContent>
          {selectedUser?.document && (
            <Box sx={{ mt: 2 }}>
              <img 
                src={selectedUser.document} 
                alt="Verification Document" 
                style={{ width: '100%', height: 'auto' }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDocumentDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminDashboard; 