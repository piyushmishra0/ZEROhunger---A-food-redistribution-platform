import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Paper,
} from '@mui/material';
import { useAuth } from '../context/AuthContext';

const Home = () => {
  const { user } = useAuth();

  return (
    <Container>
      <Box sx={{ mt: 4, mb: 8 }}>
        <Typography
          variant="h2"
          component="h1"
          gutterBottom
          align="center"
          sx={{ fontWeight: 'bold', mb: 4 }}
        >
          Welcome to ZEROhunger
        </Typography>
        <Typography
          variant="h5"
          component="h2"
          align="center"
          color="text.secondary"
          paragraph
        >
          Connecting restaurants with NGOs to reduce food waste and fight hunger.
        </Typography>

        {!user && (
          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center', gap: 2 }}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              component={RouterLink}
              to="/register/restaurant"
            >
              Register as Restaurant
            </Button>
            <Button
              variant="outlined"
              color="primary"
              size="large"
              component={RouterLink}
              to="/register/ngo"
            >
              Register as NGO
            </Button>
          </Box>
        )}

        <Grid container spacing={4} sx={{ mt: 6 }}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h5" component="h3" gutterBottom>
                For Restaurants
              </Typography>
              <Typography>
                Reduce food waste and make a positive impact in your community by donating excess food to those in need.
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h5" component="h3" gutterBottom>
                For NGOs
              </Typography>
              <Typography>
                Connect with local restaurants and receive food donations to support your community service initiatives.
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h5" component="h3" gutterBottom>
                Our Impact
              </Typography>
              <Typography>
                Join our mission to create a hunger-free world while reducing food waste and environmental impact.
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default Home; 