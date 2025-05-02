import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, CssBaseline, ThemeProvider, createTheme, CircularProgress } from '@mui/material';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Layout/Navbar.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Auth/Login.jsx';
import RegisterNGO from './pages/Auth/RegisterNGO.jsx';
import RegisterRestaurant from './pages/Auth/RegisterRestaurant.jsx';
import NGODashboard from './pages/Dashboard/NGO/index.jsx';
import RestaurantDashboard from './pages/Dashboard/Restaurant/index.jsx';
import AdminDashboard from './pages/Dashboard/Admin/index.jsx';
import AdminLogin from './pages/Auth/AdminLogin';
import { useAuth } from './context/AuthContext.jsx';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5'
    }
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 500
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 500
    }
  }
});

// Protected Route Component
const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" />;
  }

  return children;
};

// Auth Route Component (redirects if already logged in)
const AuthRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (user) {
    if (user.role === 'admin') {
      return <Navigate to="/dashboard/admin" />;
    } else if (user.role === 'ngo') {
      return <Navigate to="/dashboard/ngo" />;
    } else if (user.role === 'restaurant') {
      return <Navigate to="/dashboard/restaurant" />;
    }
  }

  return children;
};

const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Navbar />
        <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8 }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route 
              path="/login" 
              element={
                <AuthRoute>
                  <Login />
                </AuthRoute>
              } 
            />
            <Route 
              path="/register/ngo" 
              element={
                <AuthRoute>
                  <RegisterNGO />
                </AuthRoute>
              } 
            />
            <Route 
              path="/register/restaurant" 
              element={
                <AuthRoute>
                  <RegisterRestaurant />
                </AuthRoute>
              } 
            />
            <Route
              path="/dashboard/ngo"
              element={
                <ProtectedRoute roles={['ngo']}>
                  <NGODashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/restaurant"
              element={
                <ProtectedRoute roles={['restaurant']}>
                  <RestaurantDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/admin"
              element={
                <ProtectedRoute roles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
          </Routes>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default App; 