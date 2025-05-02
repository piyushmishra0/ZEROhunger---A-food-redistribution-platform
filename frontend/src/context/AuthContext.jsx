import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Configure axios defaults
  axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  axios.defaults.withCredentials = true;

  useEffect(() => {
    checkUser();
  }, []);

  // Check if user is logged in
  const checkUser = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      const res = await axios.get('/api/v1/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.data.data) {
        setUser(res.data.data);
        setError(null);
      } else {
        setUser(null);
        localStorage.removeItem('token');
      }
    } catch (err) {
      console.error('Check user error:', err);
      setUser(null);
      localStorage.removeItem('token');
      setError(err.response?.data?.error || 'Failed to get user info');
    } finally {
      setLoading(false);
    }
  };

  // Login user
  const login = async (email, password) => {
    try {
      const res = await axios.post('/api/v1/auth/login', {
        email,
        password
      });

      if (res.data.token) {
        localStorage.setItem('token', res.data.token);
        const userRes = await axios.get('/api/v1/auth/me', {
          headers: {
            Authorization: `Bearer ${res.data.token}`
          }
        });
        setUser(userRes.data.data);
        setError(null);
        return userRes.data.data;
      }
    } catch (err) {
      console.error('Login error:', err.response?.data || err.message);
      setError(err.response?.data?.error || 'Login failed');
      throw err;
    }
  };

  // Register NGO
  const registerNGO = async (formData) => {
    try {
      const res = await axios.post('/api/v1/auth/register/ngo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setError(null);
      return res.data;
    } catch (err) {
      setError(err.response?.data?.error || 'NGO registration failed');
      throw err;
    }
  };

  // Register Restaurant
  const registerRestaurant = async (formData) => {
    try {
      // Log FormData contents
      console.log('FormData entries:');
      for (let [key, value] of formData.entries()) {
        console.log(`${key}:`, value);
      }

      const res = await axios.post('/api/v1/auth/register/restaurant', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        withCredentials: true
      });
      
      console.log('Registration response:', res);
      
      if (res.data.success) {
        setError(null);
        localStorage.setItem('token', res.data.token);
        return res;
      } else {
        setError('Registration failed');
        return null;
      }
    } catch (err) {
      console.error('Registration error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      
      setError(err.response?.data?.error || 'Restaurant registration failed');
      return null;
    }
  };

  // Logout user
  const logout = async () => {
    try {
      await axios.get('/api/v1/auth/logout');
      setUser(null);
      setError(null);
      localStorage.removeItem('token');
    } catch (err) {
      console.error('Logout error:', err);
      setError(err.response?.data?.error || 'Logout failed');
    }
  };

  // Update user profile
  const updateProfile = async (data) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put('/api/v1/auth/updatedetails', data, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setUser(res.data.data);
      setError(null);
      return res.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Profile update failed');
      throw err;
    }
  };

  // Update password
  const updatePassword = async (currentPassword, newPassword) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put('/api/v1/auth/updatepassword', 
        { currentPassword, newPassword },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Password update failed');
      throw err;
    }
  };

  const value = {
    user,
    loading,
    error,
    login,
    registerNGO,
    registerRestaurant,
    logout,
    updateProfile,
    updatePassword
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;

// Axios interceptor for adding token to requests
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
); 