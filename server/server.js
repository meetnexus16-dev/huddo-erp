import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadEnv } from './utils/loadEnv.js';
import connectDB from './config/db.js';
import router from './routes/index.js';
import errorHandler from './middleware/errorHandler.js';

// Resolve directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables (.env for production, .env.development for local)
const { name: envName, path: envPath, nodeEnv } = loadEnv();

// Connect to Database
connectDB();

const app = express();

// Midlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount API routes
app.use('/api/v1', router);

// Default status healthcheck route
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'UP',
    timestamp: new Date(),
    environment: nodeEnv
  });
});

// Serve built frontend (from `npm run build` → server/frontend)
const frontendPath = path.join(__dirname, 'frontend');
app.use(express.static(frontendPath));

// SPA fallback — keep API/uploads/health from being swallowed
app.get('*', (req, res, next) => {
  if (
    req.path.startsWith('/api') ||
    req.path.startsWith('/uploads') ||
    req.path === '/health'
  ) {
    return next();
  }
  res.sendFile(path.join(frontendPath, 'index.html'), (err) => {
    if (err) next();
  });
});

// Global Error Handler (Must be registered last)
app.use(errorHandler);

// Listen to Port
const PORT = process.env.PORT || (nodeEnv === 'production' ? 8809 : 5000);
const server = app.listen(PORT, () => {
  console.log(`[Server] Using env: ${envName} (${envPath})`);
  console.log(`[Server] Running in ${nodeEnv} mode on port ${PORT}`);
});

export { app, server };
