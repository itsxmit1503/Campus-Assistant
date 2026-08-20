import { StructuredAnswer } from '../types/index.js';
import { conversationEngine, detectLanguage } from './conversationEngine.js';

export { detectLanguage };

export type RouteType =
  | 'LOCAL_TRIVIAL'
  | 'GEMINI';

export interface RouteDecision {
  route: RouteType;
  requiresGemini: boolean;
  requiresWebSearch: boolean;
  deterministicResponse?: StructuredAnswer;
}

/**
 * routeQuery — Decides whether to handle a message locally or route to Gemini.
 *
 * Policy:
 *   LOCAL_TRIVIAL  → pure thanks / pure farewell / pure emoji (no Gemini call needed)
 *   GEMINI         → EVERYTHING else, including:
 *                     - greetings
 *                     - casual conversation
 *                     - capability questions
 *                     - all university questions (departments, locations, HOD, contacts, etc.)
 *                     - follow-up questions
 *                     - multilingual messages
 *                     - Hinglish / mixed-language messages
 *                     - short messages
 *                     - unclear / ambiguous messages
 *
 * NEVER add language-based routing here.
 * NEVER add keyword-based conversational routing here.
 * Gemini is the conversational intelligence — let it handle the message.
 */
export function routeQuery(
  query: string,
  lang = 'auto',
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
): RouteDecision {
  // Check if the message is a truly trivial local response (thanks / bye / emoji only)
  const trivialResponse = conversationEngine.resolvePurelyConversational(query, conversationHistory);

  if (trivialResponse) {
    return {
      route: 'LOCAL_TRIVIAL',
      requiresGemini: false,
      requiresWebSearch: false,
      deterministicResponse: trivialResponse
    };
  }

  // ALL other messages → Gemini
  return {
    route: 'GEMINI',
    requiresGemini: true,
    requiresWebSearch: false
  };
}
