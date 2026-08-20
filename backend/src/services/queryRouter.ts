import { StructuredAnswer } from '../types/index.js';
import { conversationEngine, detectLanguage } from './conversationEngine.js';
import { universityKnowledgeEngine } from './universityKnowledgeEngine.js';

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
  | 'DEPARTMENT_INFO'
  | 'OFFICE_INFO'
  | 'LOCATION'
  | 'CONTACT'
  | 'DOCUMENTS'
  | 'PROBLEM_TRIAGE'
  | 'FOLLOW_UP'
  | 'CURRENT_WEB_QUERY'
  | 'COMPLEX_REASONING';

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
  const q = query.toLowerCase().trim();

  // -------------------------------------------------------------
  // STAGE 1: UNIVERSITY KNOWLEDGE ENGINE (Entity & Intent Check)
  // Ensures ANY question about a department, office, location,
  // or university topic is answered directly from verified data!
  // -------------------------------------------------------------
  const knowledgeMatch = universityKnowledgeEngine.findEntityAndIntent(q);
  if (knowledgeMatch) {
    const knowledgeResponse = universityKnowledgeEngine.resolveKnowledgeQuery(knowledgeMatch, query, lang);
    return {
      route: knowledgeResponse.intentCategory === 'LOCATION' ? 'LOCATION' : 'DEPARTMENT_INFO',
      requiresGemini: false,
      requiresWebSearch: false,
      deterministicResponse: knowledgeResponse
    };
  }

  // -------------------------------------------------------------
  // STAGE 2: CONVERSATION ENGINE (Pure Social & Casual Interactions)
  // Handles greetings, acknowledgements, thanks, small talk.
  // -------------------------------------------------------------
  const conversationalResponse = conversationEngine.resolvePurelyConversational(query, conversationHistory);
  if (conversationalResponse) {
    return {
      route: 'CASUAL_SOCIAL',
      requiresGemini: false,
      requiresWebSearch: false,
      deterministicResponse: conversationalResponse
    };
  }

  // -------------------------------------------------------------
  // STAGE 3: CURRENT TIME-SENSITIVE QUERIES -> Gemini + Web Search
  // -------------------------------------------------------------
  if (
    /\b(latest|current|deadline|last date|aaj ka|circular|new notice|notification|kya date hai|update)\b/i.test(q) ||
    q.includes('admission last date') || q.includes('exam date')
  ) {
    return {
      route: 'CURRENT_WEB_QUERY',
      requiresGemini: true,
      requiresWebSearch: true
    };
  }

  // -------------------------------------------------------------
  // STAGE 4: COMPLEX REASONING -> Gemini (with Targeted Context)
  // -------------------------------------------------------------
  return {
    route: 'COMPLEX_REASONING',
    requiresGemini: true,
    requiresWebSearch: false
  };
}
