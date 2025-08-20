import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRoot } from 'react-dom/client';
import './index.css';
import React from 'react';
import BundlesDisplay from './bundles-display';

const queryClient = new QueryClient();

/**
 * Standalone BundleHub component - no ElizaOS dependencies
 */
function StandaloneBundleHub() {
  return (
    <QueryClientProvider client={queryClient}>
      <BundlesDisplay />
    </QueryClientProvider>
  );
}

// Initialize the standalone application
const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(<StandaloneBundleHub />);
} 