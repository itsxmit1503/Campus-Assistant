import { Router, Request, Response } from 'express';
import { geminiService } from '../services/geminiService.js';
import { conversationContextService } from '../services/conversationContextService.js';
import { ChatRequest } from '../types/index.js';

export const chatRouter = Router();

/**
 * POST /api/chat - Process a chat message with structured context, follow-up tracking, and persistence
 */
chatRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { message, conversationId, clientMessageId, conversationHistory, language } = req.body as ChatRequest;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      res.status(400).json({ error: 'Message text is required' });
      return;
    }

    const cleanMsg = message.trim();
    const effectiveConvId = conversationId && conversationId.trim() !== ''
      ? conversationId.trim()
      : `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // 1. Get or initialize session state
    const session = await conversationContextService.getOrCreateSession(effectiveConvId);

    // 2. Persist user message
    await conversationContextService.appendMessage(
      effectiveConvId,
      'user',
      cleanMsg,
      undefined,
      clientMessageId
    );

    // 3. Resolve context and history (using provided history or stored session messages)
    const effectiveHistory = Array.isArray(conversationHistory) && conversationHistory.length > 0
      ? conversationHistory
      : session.messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const resolvedContext = conversationContextService.resolveConversationContext(
      cleanMsg,
      effectiveHistory,
      session.activeContext
    );

    // 4. Process with Gemini & Official Verification Pipeline
    const answer = await geminiService.processChat({
      message: cleanMsg,
      conversationId: effectiveConvId,
      conversationHistory: effectiveHistory,
      language: language || 'auto'
    });

    // 5. Update session active context based on returned structured data
    if (answer.entity && answer.entity.name) {
      session.activeContext.activeEntityName = answer.entity.name;
      session.activeContext.activeEntityType = answer.entity.type as any;
      session.activeContext.lastUpdated = new Date();
    } else if (resolvedContext.effectiveContext.activeEntityName) {
      session.activeContext.activeEntityName = resolvedContext.effectiveContext.activeEntityName;
      session.activeContext.activeEntityType = resolvedContext.effectiveContext.activeEntityType;
    }

    // 6. Persist assistant message
    const assistantStoredMsg = await conversationContextService.appendMessage(
      effectiveConvId,
      'assistant',
      answer.answer,
      answer
    );

    // 7. Return complete structured response with synchronization metadata
    res.json({
      ...answer,
      conversationId: effectiveConvId,
      messageId: assistantStoredMsg.messageId,
      serverTimestamp: assistantStoredMsg.createdAt.toISOString()
    });
  } catch (error) {
    console.error('[ChatRouter] Error processing chat request:', error);
    res.status(500).json({
      error: "I couldn't reach the campus assistant right now. Please try again.",
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    });
  }
});

/**
 * GET /api/chat/history/:conversationId - Load persisted conversation history
 */
chatRouter.get('/history/:conversationId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { conversationId } = req.params;
    if (!conversationId) {
      res.status(400).json({ error: 'conversationId parameter is required' });
      return;
    }

    const session = await conversationContextService.getOrCreateSession(conversationId);
    res.json({
      conversationId: session.conversationId,
      messages: session.messages,
      activeContext: session.activeContext,
      updatedAt: session.updatedAt
    });
  } catch (error) {
    console.error('[ChatRouter] Error retrieving history:', error);
    res.status(500).json({ error: 'Failed to retrieve conversation history' });
  }
});

/**
 * DELETE /api/chat/history/:conversationId - Completely clear and reset conversation
 */
chatRouter.delete('/history/:conversationId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { conversationId } = req.params;
    if (!conversationId) {
      res.status(400).json({ error: 'conversationId parameter is required' });
      return;
    }

    await conversationContextService.clearConversation(conversationId);
    res.json({
      success: true,
      message: 'Conversation context and history cleared successfully',
      clearedConversationId: conversationId
    });
  } catch (error) {
    console.error('[ChatRouter] Error clearing conversation:', error);
    res.status(500).json({ error: 'Failed to clear conversation' });
  }
});
