import { Router, Request, Response } from 'express';
import { config } from '../config/env.js';
import { isDbConnected } from '../db/connection.js';

export const healthRouter = Router();

healthRouter.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    university: 'Dr. Harisingh Gour Vishwavidyalaya, Sagar (DHSGSU)',
    service: 'Campus Assistant API',
    version: '1.0.0 (Phase 1 Production)',
    database: isDbConnected() ? 'MongoDB Atlas (Connected)' : 'Local Verified Knowledge Base (Active)',
    aiEngine: config.geminiApiKey ? 'Gemini 1.5 Flash (Hybrid Intelligence Active)' : 'Deterministic Knowledge Solver (Active)',
    timestamp: new Date().toISOString()
  });
});
