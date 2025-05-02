import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Container,
  Alert,
  CircularProgress
} from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';

const RegisterRestaurant = () => {
  const navigate = useNavigate();
  const { registerRestaurant } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    gstNumber: '',
    phone: '',
    address: '',
    document: null
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    setFormData(prev => ({
      ...prev,
      document: e.target.files[0]
    }));
  };

  const validateGST = (gst) => {
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return gstRegex.test(gst);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!validateGST(formData.gstNumber)) {
      setError('Invalid GST number format. Please use format: 22AAAAA0000A1Z5');
      return;
    }

    if (!formData.document) {
      setError('Please upload your FSSAI license');
      return;
    }

    setLoading(true);

    try {
      console.log('Preparing form data:', formData);
      const submitData = new FormData();
      
      // Add each field with proper validation
      const fields = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        gstNumber: formData.gstNumber.toUpperCase(), // Convert GST to uppercase
        phone: formData.phone,
        address: formData.address,
        document: formData.document
      };

      // Add fields to FormData
      Object.entries(fields).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          submitData.append(key, value);
          console.log(`Added ${key} to form data:`, value);
        }
      });

      console.log('Submitting registration request...');
      const response = await registerRestaurant(submitData);
      console.log('Registration response:', response);

      if (response && response.data.success) {
        // Registration successful
        toast.success('Registration successful! Please wait for admin verification.');
        navigate('/login');
      } else {
        setError('Registration failed. Please try again.');
      }
    } catch (err) {
      console.error('Registration error:', err);
      const errorMessage = err.response?.data?.error || err.message;
      if (errorMessage.includes('GST number already registered')) {
        setError('This GST number is already registered. Please use a different GST number or contact support.');
      } else if (errorMessage.includes('Network Error')) {
        setError('Network error occurred. Please check your internet connection and try again.');
      } else {
        setError(errorMessage || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography component="h1" variant="h5" gutterBottom align="center">
            Register as Restaurant
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              margin="normal"
              required
              fullWidth
              label="Restaurant Name"
              name="name"
              autoFocus
              value={formData.name}
              onChange={handleChange}
              disabled={loading}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              label="GST Number"
              name="gstNumber"
              value={formData.gstNumber}
              onChange={handleChange}
              disabled={loading}
              helperText="Format: 22AAAAA0000A1Z5"
            />
            <TextField
              margin="normal"
              required
              fullWidth
              label="Email Address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              disabled={loading}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              label="Phone Number"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              disabled={loading}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              label="Address"
              name="address"
              multiline
              rows={3}
              value={formData.address}
              onChange={handleChange}
              disabled={loading}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              disabled={loading}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="confirmPassword"
              label="Confirm Password"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              disabled={loading}
            />
            <Button
              variant="contained"
              component="label"
              fullWidth
              sx={{ mt: 2 }}
              disabled={loading}
            >
              Upload FSSAI License
              <input
                type="file"
                hidden
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={handleFileChange}
              />
            </Button>
            {formData.document && (
              <Typography variant="body2" sx={{ mt: 1, color: 'success.main' }}>
                Document uploaded: {formData.document.name}
              </Typography>
            )}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Register'}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default RegisterRestaurant; 