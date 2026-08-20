import { StructuredAnswer } from '../types/index.js';
import { conversationEngine, detectLanguage } from './conversationEngine.js';

export { detectLanguage };

export type RouteType = 
  | 'GREETING'
  | 'CASUAL_SOCIAL'
  | 'CASUAL_CHAT'
  | 'TESTING'
  | 'ACKNOWLEDGEMENT'
  | 'THANKS'
  | 'FAREWELL'
  | 'CAPABILITIES'
  | 'UNIVERSITY_QUERY';

export interface RouteDecision {
  route: RouteType;
  requiresGemini: boolean;
  requiresWebSearch: boolean;
  deterministicResponse?: StructuredAnswer;
}

export function routeQuery(
  query: string,
  lang = 'auto',
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
): RouteDecision {
  // 1. Check if the message is purely social/conversational without an information request
  const conversationalResponse = conversationEngine.resolvePurelyConversational(query, conversationHistory);
  if (conversationalResponse) {
    return {
      route: 'CASUAL_SOCIAL',
      requiresGemini: false,
      requiresWebSearch: false,
      deterministicResponse: conversationalResponse
    };
  }

  // 2. All actual university queries (departments, locations, HOD, courses, scholarships, exams, follow-ups, admissions) -> Gemini with MongoDB context!
  return {
    route: 'UNIVERSITY_QUERY',
    requiresGemini: true,
    requiresWebSearch: false
  };
}
