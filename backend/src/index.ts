import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import { chatRouter } from './routes/chat.js';
import { directoryRouter } from './routes/directory.js';
import { healthRouter } from './routes/health.js';

const app = express();

// Middlewares
app.use(cors({
  origin: '*', // Allows local dev and deployed frontend origin
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '1mb' }));

// Routes
app.use('/api/health', healthRouter);
app.use('/api/chat', chatRouter);
app.use('/api/directory', directoryRouter);

// Root route
app.get('/', (_req, res) => {
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
});
