#!/usr/bin/env node

// Simple script to start just the BundleHub website
import { startBundleHubServer } from './dist/standalone-server.js';

console.log('Starting BundleHub website...');
console.log('This will start the standalone BundleHub server on port 3002');
console.log('You can access it at: http://localhost:3002');
console.log('');

startBundleHubServer(); 