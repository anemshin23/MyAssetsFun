import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { 
  getCompletedBundles, 
  getCompletedBundlesByUsername, 
  getCompletedBundlesByCashtag, 
  getCompletedBundlesStats 
} from './index';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.BUNDLEHUB_PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../dist/frontend')));

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`🔌 BundleHub client connected: ${socket.id}`);
  
  // Send initial data to new connections
  socket.emit('bundles-updated', {
    bundles: getCompletedBundles(),
    stats: getCompletedBundlesStats()
  });
  
  socket.on('disconnect', () => {
    console.log(`BundleHub client disconnected: ${socket.id}`);
  });
});

// Function to broadcast bundle updates to all connected clients
export const broadcastBundleUpdate = () => {
  const bundles = getCompletedBundles();
  const stats = getCompletedBundlesStats();
  
  io.emit('bundles-updated', { bundles, stats });
  console.log(`Broadcasted bundle update to ${io.engine.clientsCount} BundleHub clients`);
};

// Serve the main HTML page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/frontend/standalone.html'));
});

// API Routes
app.get('/api/bundles', (req, res) => {
  try {
    const bundles = getCompletedBundles();
    res.json({
      success: true,
      data: bundles,
      count: bundles.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bundles'
    });
  }
});

app.get('/api/bundles/user/:username', (req, res) => {
  try {
    const { username } = req.params;
    const bundles = getCompletedBundlesByUsername(username);
    res.json({
      success: true,
      data: bundles,
      count: bundles.length,
      username
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bundles for user'
    });
  }
});

app.get('/api/bundles/cashtag/:cashtag', (req, res) => {
  try {
    const { cashtag } = req.params;
    const bundles = getCompletedBundlesByCashtag(cashtag);
    res.json({
      success: true,
      data: bundles,
      count: bundles.length,
      cashtag
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bundles for cashtag'
    });
  }
});

app.get('/api/stats', (req, res) => {
  try {
    const stats = getCompletedBundlesStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stats'
    });
  }
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'BundleHub server is running',
    timestamp: new Date().toISOString(),
    connectedClients: io.engine.clientsCount
  });
});

// Kodiak API proxy endpoints to handle CORS
app.post('/api/kodiak/quote', async (req, res) => {
  try {
    const { tokenIn, tokenOut, amountIn, slippageTolerance, chainId = 80069 } = req.body;
    
    // Convert token addresses to Kodiak format
    const tokenInAddress = tokenIn === '0x0000000000000000000000000000000000000000' ? 'BERA' : tokenIn;
    const tokenOutAddress = tokenOut;
    
    // Build query parameters
    const params = new URLSearchParams({
      tokenInAddress,
      tokenInChainId: chainId.toString(),
      tokenOutAddress,
      tokenOutChainId: chainId.toString(),
      amount: amountIn,
      type: 'exactIn'
    });

    // Add slippage if provided (convert from basis points to percentage)
    if (slippageTolerance) {
      params.append('slippageTolerance', (slippageTolerance / 100).toString());
    }
    
    // Make request to correct Kodiak API endpoint
    const response = await fetch(`https://backend.kodiak.finance/quote?${params}`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Kodiak API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json() as any; // Kodiak API response structure
    
    // Transform the response to match our expected format
    const transformedData = {
      amountOut: data.quote || data.quoteDecimals || '0',
      route: data.otherQuote?.route || [],
      priceImpact: data.priceImpact || '0',
      fee: data.refFee || '0',
      gasEstimate: data.gasUseEstimate || '0',
      provider: data.provider || 'Unknown',
      exchangeRate: data.tokenOutPriceUSD || '0',
      // Include raw data for debugging
      raw: data
    };
    
    res.json({
      success: true,
      data: transformedData
    });
  } catch (error) {
    console.error('Kodiak quote proxy error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get swap quote from Kodiak',
      details: error.message
    });
  }
});

app.post('/api/kodiak/swap-data', async (req, res) => {
  try {
    const { tokenIn, tokenOut, amountIn, amountOutMin, recipient, deadline } = req.body;
    
    // For now, return the swap data structure that the frontend expects
    // In a full implementation, you might want to call additional Kodiak endpoints
    res.json({
      success: true,
      data: {
        tokenIn,
        tokenOut,
        amountIn,
        amountOutMin,
        recipient,
        deadline,
        // This would be the actual swap calldata from Kodiak
        calldata: '0x' // Placeholder - would need actual Kodiak swap router integration
      }
    });
  } catch (error) {
    console.error('Kodiak swap data proxy error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get swap data from Kodiak'
    });
  }
});

app.post('/api/rpc-proxy', async (req, res) => {
  try {
    const response = await fetch('https://bepolia.beratrail.io/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`RPC proxy error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('RPC proxy error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to proxy RPC request',
      details: error.message,
    });
  }
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('BundleHub Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start server
export const startBundleHubServer = () => {
  server.listen(PORT, () => {
    console.log(` BundleHub website running on port ${PORT}`);
    console.log(` Access at: http://localhost:${PORT}`);
    console.log(` WebSocket server ready for real-time updates`);
    console.log(` Available endpoints:`);
    console.log(`   GET / - BundleHub website`);
    console.log(`   GET /api/bundles - Get all completed bundles`);
    console.log(`   GET /api/bundles/user/:username - Get bundles by username`);
    console.log(`   GET /api/bundles/cashtag/:cashtag - Get bundles by cashtag`);
    console.log(`   GET /api/stats - Get bundle statistics`);
    console.log(`   GET /api/health - Health check`);
    console.log(`   POST /api/kodiak/quote - Kodiak DEX quote proxy`);
    console.log(`   POST /api/kodiak/swap-data - Kodiak DEX swap data proxy`);
    console.log(`   WebSocket - Real-time bundle updates`);
  });
};

// Export for use in main application
export default app; 