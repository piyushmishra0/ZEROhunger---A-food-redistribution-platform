import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Container,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  CircularProgress,
  Alert
} from '@mui/material';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
  const [pendingVerifications, setPendingVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchPendingVerifications();
  }, []);

  const fetchPendingVerifications = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('No authentication token found. Please login again.');
        return;
      }

      const res = await axios.get('/api/v1/admin/pending', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.data.success) {
        // Combine NGOs and restaurants into a single array
        const allPending = [
          ...(res.data.ngos || []).map(ngo => ({ ...ngo, type: 'ngo' })),
          ...(res.data.restaurants || []).map(restaurant => ({ ...restaurant, type: 'restaurant' }))
        ];
        setPendingVerifications(allPending);
        setError('');
      } else {
        setError('Failed to fetch pending verifications');
      }
    } catch (err) {
      console.error('Error fetching pending verifications:', err);
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
        // Optionally redirect to login
        navigate('/admin/login');
      } else {
        setError(err.response?.data?.error || 'Failed to fetch pending verifications');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (id, status) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('No authentication token found. Please login again.');
        return;
      }

      const res = await axios.put(
        `/api/v1/admin/verify/${id}`,
        { status },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (res.data.success) {
        // Refresh the list
        fetchPendingVerifications();
      } else {
        setError('Failed to update verification status');
      }
    } catch (err) {
      console.error('Error updating verification status:', err);
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
        navigate('/admin/login');
      } else {
        setError(err.response?.data?.error || 'Failed to update verification status');
      }
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Admin Dashboard
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Pending Verifications
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Registration/GST Number</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>Address</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pendingVerifications.map((entity) => (
                  <TableRow key={entity._id}>
                    <TableCell>{entity.name}</TableCell>
                    <TableCell>{entity.email}</TableCell>
                    <TableCell>{entity.type === 'restaurant' ? entity.gstNumber : entity.registrationNumber}</TableCell>
                    <TableCell>{entity.phone}</TableCell>
                    <TableCell>{entity.address}</TableCell>
                    <TableCell>
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        onClick={() => handleVerify(entity._id, 'approved')}
                        sx={{ mr: 1 }}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="contained"
                        color="error"
                        size="small"
                        onClick={() => handleVerify(entity._id, 'rejected')}
                      >
                        Reject
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Box>
    </Container>
  );
};

export default AdminDashboard; 