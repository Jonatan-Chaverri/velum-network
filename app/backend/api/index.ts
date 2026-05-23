// Vercel serverless function entry point
// This file is used by Vercel to handle all requests
import app from '../src/index';

// Export for Vercel serverless functions
export default app;
module.exports = app;

