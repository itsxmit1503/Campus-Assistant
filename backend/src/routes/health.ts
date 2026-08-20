import { Router, Request, Response } from 'express';
import { config } from '../config/env.js';

export const healthRouter = Router();

healthRouter.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    university: 'Dr. Harisingh Gour Vishwavidyalaya, Sagar (DHSGSU)',
    service: 'Campus Assistant API',
    version: '1.0.0 (Phase 1)',
    aiEngine: config.geminiApiKey ? 'Gemini 1.5 Flash (Active)' : 'Deterministic Knowledge Solver (Fallback Active)',
    timestamp: new Date().toISOString()
  });
});
