const axios = require('axios');
const ErrorResponse = require('./errorResponse');
const config = require('../config/config');

// OpenCage API configuration
const OPENCAGE_API_KEY = config.opencageApiKey;
const OPENCAGE_BASE_URL = 'https://api.opencagedata.com/geocode/v1/json';

// Enhanced geocoding with error handling
module.exports = {
  geocode: async (address) => {
    try {
      console.log('Geocoding address:', address);
      console.log('Environment:', config.env);
      
      const params = {
        q: address,
        key: OPENCAGE_API_KEY,
        no_annotations: 1,
        limit: 1,
        pretty: 1
      };

      console.log('Request params:', params);
      
      const response = await axios.get(OPENCAGE_BASE_URL, {
        params,
        headers: {
          'Accept': 'application/json'
        }
      });

      console.log('Geocoding response status:', response.status);
      console.log('Geocoding response data:', response.data);

      if (!response.data || !response.data.results || response.data.results.length === 0) {
        throw new ErrorResponse('No location found for the specified address', 404);
      }

      // Transform OpenCage response to match the expected format
      const result = response.data.results[0];
      const components = result.components;
      
      return [{
        formattedAddress: result.formatted,
        latitude: result.geometry.lat,
        longitude: result.geometry.lng,
        streetName: components.road,
        city: components.city || components.town || components.village,
        stateCode: components.state_code,
        zipcode: components.postcode,
        countryCode: components.country_code
      }];
    } catch (err) {
      console.error('Geocoding error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        statusText: err.response?.statusText,
        headers: err.response?.headers
      });
      throw new ErrorResponse('Geocoding failed. Please try again', 500);
    }
  },

  reverseGeocode: async (lat, lng) => {
    try {
      const response = await axios.get(OPENCAGE_BASE_URL, {
        params: {
          q: `${lat},${lng}`,
          key: OPENCAGE_API_KEY,
          no_annotations: 1
        }
      });

      if (!response.data || !response.data.results || response.data.results.length === 0) {
        throw new ErrorResponse('No address found for the specified coordinates', 404);
      }

      // Transform OpenCage response to match the expected format
      const result = response.data.results[0];
      const components = result.components;

      return {
        formattedAddress: result.formatted,
        streetName: components.road,
        city: components.city || components.town || components.village,
        stateCode: components.state_code,
        zipcode: components.postcode,
        countryCode: components.country_code
      };
    } catch (err) {
      console.error('Reverse geocoding error:', err);
      throw new ErrorResponse('Reverse geocoding failed', 500);
    }
  },

  calculateDistance: (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in km
  }
};