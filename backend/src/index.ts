import express, { Request, Response } from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import { connectDB } from './db/connection.js';
import { chatRouter } from './routes/chat.js';
import { directoryRouter } from './routes/directory.js';
import { healthRouter } from './routes/health.js';

const app = express();

// Middlewares
app.use(cors({
  origin: config.nodeEnv === 'production' && config.frontendUrl !== 'http://localhost:3000'
    ? [config.frontendUrl, 'http://localhost:3000']
    : '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '1mb' }));

// Initialize MongoDB connection safely in background
connectDB().catch(err => {
  console.warn('[Server] Initial MongoDB connection attempt logged:', err);
});

// Routes
app.use('/api/health', healthRouter);
app.use('/api/chat', chatRouter);
app.use('/api/directory', directoryRouter);

// Root route
app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'DHSGSU Sagar Campus Assistant Backend API is running.',
    healthEndpoint: '/api/health',
    chatEndpoint: '/api/chat',
    directoryEndpoint: '/api/directory/university'
  });
});

app.listen(config.port, () => {
  console.log(`[DHSGSU Assistant Backend] Server running on http://localhost:${config.port}`);
  console.log(`[DHSGSU Assistant Backend] AI status: ${config.geminiApiKey ? 'Gemini configured' : 'Using deterministic fallback'}`);
  console.log(`[DHSGSU Assistant Backend] MongoDB: ${config.mongodbUri ? 'Configured' : 'Using verified local knowledge'}`);
});
