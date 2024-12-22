// Example configuration file - rename to config.js and add your API key
const LOCAL_API_KEY = 'YOUR_API_KEY_HERE';

// Check if we're on Netlify
const isNetlify = window.location.hostname.includes('netlify.app');

// Get the API key based on environment
export const API_KEY = isNetlify && import.meta.env?.VITE_YOUTUBE_API_KEY 
    ? import.meta.env.VITE_YOUTUBE_API_KEY 
    : LOCAL_API_KEY; 