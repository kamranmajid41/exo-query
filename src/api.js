import axios from 'axios';

const API_URL = 'https://api.le-systeme-solaire.net/rest/bodies/'; // Placeholder URL, replace with actual

// Function to fetch exoplanets data
export const getExoplanets = async () => {
    try {
        const response = await axios.get(API_URL); // Replace with actual NASA Exoplanet API URL
        return response.data; // Structure your API response data here
    } catch (error) {
        console.error("Error fetching exoplanet data:", error);
        return [];
    }
};
