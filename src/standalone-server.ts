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
    console.log(`   WebSocket - Real-time bundle updates`);
  });
};

// Export for use in main application
export default app; 