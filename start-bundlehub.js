// #!/usr/bin/env node

// // Simple script to start just the BundleHub website
// import { startBundleHubServer } from './dist/standalone-server.js';

// console.log('Starting BundleHub website...');
// console.log('This will start the standalone BundleHub server on port 3002');
// console.log('You can access it at: http://localhost:3002');
// console.log('');

// startBundleHubServer(); 

// #!/usr/bin/env node

import { startBundleHubServer } from './dist/standalone-server.js';

// For Vercel serverless functions
export default async function handler(req, res) {
  try {
    // If this is a serverless environment, handle the request directly
    if (process.env.VERCEL) {
      res.status(200).json({ 
        message: 'BundleHub is running',
        url: req.url,
        method: req.method
      });
      return;
    }
    
    // Local development
    console.log('Starting BundleHub website...');
    console.log('This will start the standalone BundleHub server on port 3002');
    console.log('You can access it at: http://localhost:3002');
    
    startBundleHubServer();
  } catch (error) {
    if (process.env.VERCEL) {
      res.status(500).json({ error: error.message });
    } else {
      console.error('Error:', error);
    }
  }
}

// If running locally (not in Vercel)
if (!process.env.VERCEL) {
  console.log('Starting BundleHub website...');
  console.log('This will start the standalone BundleHub server on port 3002');
  console.log('You can access it at: http://localhost:3002');
  startBundleHubServer();
}