import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import transactionRoutes from './routes/transaction';
import registerRoutes from './routes/register';
import getUserRoutes from './routes/getUser';
import tokensRoutes from './routes/tokens';
import configRoutes from './routes/config';
import deleteUserRoutes from './routes/deleteUser';
import authRoutes from './routes/auth';
import agentsRoutes from './routes/agents';
import marketplaceRoutes from './routes/marketplace';
import sdkRoutes from './routes/sdk';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

// Middleware
app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/transaction', transactionRoutes);
app.use('/api/register', registerRoutes);
app.use('/api/getUser', getUserRoutes);
app.use('/api/tokens', tokensRoutes);
app.use('/api/config', configRoutes);
app.use('/api/deleteUser', deleteUserRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/agents', agentsRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/sdk', sdkRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[api.error]', {
    method: req.method,
    path: req.originalUrl,
    message: err?.message ?? 'Unknown error',
    stack: err?.stack,
    error: err,
  });
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// Only start the server if this file is run directly (not imported)
// This allows the app to be exported for Vercel serverless functions
if (typeof require !== 'undefined' && require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`CORS enabled for origin: ${CORS_ORIGIN}`);
  });
}

// Export the app for Vercel serverless functions
export default app;
// Also export as CommonJS for compatibility
module.exports = app;
