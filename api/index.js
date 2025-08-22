import { startBundleHubServer } from '../dist/standalone-server.js';

// Cache the server instance
let serverInstance = null;

export default async function handler(req, res) {
  try {
    if (!serverInstance) {
      console.log('Starting BundleHub server...');
      serverInstance = await startBundleHubServer();
    }
    
    // Forward the request to your server
    // This is a simple proxy - you might need to adjust based on your server setup
    res.status(200).json({ message: 'BundleHub server is running' });
  } catch (error) {
    console.error('Error starting server:', error);
    res.status(500).json({ error: error.message });
  }
}