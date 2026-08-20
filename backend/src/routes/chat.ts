import { Router, Request, Response } from 'express';
import { geminiService } from '../services/geminiService.js';
import { ChatRequest } from '../types/index.js';

export const chatRouter = Router();

chatRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { message, conversationHistory, language } = req.body as ChatRequest;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      res.status(400).json({ error: 'Message text is required' });
      return;
    }

    const response = await geminiService.processChat({
      message: message.trim(),
      conversationHistory: Array.isArray(conversationHistory) ? conversationHistory : [],
      language: language || 'auto'
    });

    res.json(response);
  } catch (error) {
    console.error('[ChatRouter] Error processing chat request:', error);
    res.status(500).json({
      error: "I couldn't reach the campus assistant right now. Please try again.",
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    });
  }
});
