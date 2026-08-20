import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/env.js';
import { StructuredAnswer, ChatRequest } from '../types/index.js';
import { knowledgeService } from './knowledgeService.js';
import { routeQuery, detectLanguage } from './queryRouter.js';

export class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;
  private responseCache = new Map<string, { answer: StructuredAnswer; expiry: number }>();

  constructor() {
    if (config.geminiApiKey && config.geminiApiKey.trim() !== '' && config.geminiApiKey !== 'your_gemini_api_key_here') {
      try {
        this.genAI = new GoogleGenerativeAI(config.geminiApiKey);
      } catch (err) {
        console.warn('[GeminiService] Failed to initialize GoogleGenerativeAI:', err);
      }
    }
  }

  async processChat(request: ChatRequest): Promise<StructuredAnswer> {
    const { message, conversationHistory = [], language = 'auto' } = request;
    const cleanMsg = message.trim();
    const cacheKey = `${cleanMsg.toLowerCase()}_${language}`;

    // 1. Check local in-memory cache (TTL: 5 minutes)
    const cached = this.responseCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.answer;
    }

    // 2. Query Router: Check if this can be solved deterministically (0 Gemini API calls)
    const decision = routeQuery(cleanMsg, language, conversationHistory);
    if (!decision.requiresGemini && decision.deterministicResponse) {
      return decision.deterministicResponse;
    }

    // 3. Fallback if no Gemini client available
    if (!this.genAI) {
      return decision.deterministicResponse || this.buildSafeFallback(cleanMsg, conversationHistory);
    }

    // 4. Compact Context & Bounded History for Gemini API
    try {
      const model = this.genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: {
          temperature: 0.35,
          maxOutputTokens: 400,
          responseMimeType: 'application/json'
        }
      });

      const targetedContext = knowledgeService.getCompactContextForQuery(cleanMsg);
      const boundedHistory = conversationHistory.slice(-4);
      const historySummary = boundedHistory.map(h => `${h.role === 'user' ? 'Student' : 'Assistant'}: ${h.content}`).join('\n');
      const userLang = detectLanguage(cleanMsg, conversationHistory);

      const systemPrompt = `
You are a real, friendly, knowledgeable person sitting at the Dr. Harisingh Gour Vishwavidyalaya (DHSGSU, Sagar) campus help desk.
A student is having a natural conversation with you.

FUNDAMENTAL HELP-DESK RULES:
1. DO NOT TRY TO BE HELPFUL WHEN HELP IS NOT NEEDED.
   - If the student is making casual chat, joking, or saying "hmm", "hello bol", "kuch nahi", respond naturally in 1 short line (e.g. "Hello 😄", "Haan bolo 😄").
   - NEVER say "I can help you around DHSGSU. What would you like to know?" or list your capabilities unless explicitly asked "What can you do?".
   - NEVER re-introduce yourself in ongoing chat.
2. STRICT LANGUAGE MATCHING:
   - Match the student's language and style (Hinglish, Hindi, Bengali, Marathi, Tamil, Telugu, English, etc.).
   - NEVER default or translate to English when the student speaks Hinglish or an Indian language.
3. PROGRESSIVE DISCLOSURE:
   - All display flags ("display.location", "display.contact", "display.documents", "display.sources") must be FALSE unless the student explicitly asks for that specific piece of information.
   - If the student has a problem, ask 1 natural clarifying question before suggesting offices.

TARGETED DHSGSU CONTEXT:
${targetedContext}

Detected Language Mode: ${userLang}

Respond strictly in JSON:
{
  "answer": "Concise natural conversational response in student's language and tone.",
  "language": "${userLang}",
  "intent": "intent_code",
  "intentCategory": "GREETING | CASUAL_CONVERSATION | INFORMATION | LOCATION | CONTACT | PROCESS | PROBLEM_SOLVING | CURRENT_INFORMATION | EXPLORATION",
  "display": {
    "responsibleUnit": false,
    "location": false,
    "contact": false,
    "documents": false,
    "nextSteps": false,
    "sources": false,
    "relatedTopics": false
  },
  "followUpQuestion": "Optional short follow-up or null",
  "responsibleUnit": { "name": "Office name or null", "type": "office | department", "location": "Location or null" },
  "location": { "name": "Building name or null", "building": "Building or null", "landmark": "Landmark or null", "mapLink": "Maps URL or null" },
  "contact": { "phone": "Phone or null", "helpline": "Helpline or null", "email": "Email or null" },
  "requiredDocuments": ["List of docs or null"],
  "nextSteps": ["List of steps or null"],
  "sources": [{ "title": "Source title", "url": "URL", "sourceType": "official", "verified": true }],
  "relatedTopics": ["Topic 1", "Topic 2"]
}
      `.trim();

      const prompt = `
${systemPrompt}

${historySummary ? `Recent Conversation:\n${historySummary}\n` : ''}
Current Student Message: "${cleanMsg}"
`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();

      try {
        const parsed = JSON.parse(text) as StructuredAnswer;
        if (parsed && parsed.answer) {
          this.responseCache.set(cacheKey, {
            answer: parsed,
            expiry: Date.now() + 5 * 60 * 1000
          });
          return parsed;
        }
      } catch (parseError) {
        console.warn('[GeminiService] JSON parse error, falling back to router response');
      }

      return decision.deterministicResponse || this.buildSafeFallback(cleanMsg, conversationHistory);
    } catch (apiError) {
      console.warn('[GeminiService] API error, falling back safely:', apiError);
      return decision.deterministicResponse || this.buildSafeFallback(cleanMsg, conversationHistory);
    }
  }

  private buildSafeFallback(query: string, history: Array<{ role: 'user' | 'assistant'; content: string }> = []): StructuredAnswer {
    const lang = detectLanguage(query, history);

    let answer = `Haan bolo 😄`;
    if (lang === 'english') {
      answer = `Sure, go ahead 😄`;
    } else if (lang === 'hindi') {
      answer = `हाँ बताइए 😄`;
    } else if (lang === 'bengali') {
      answer = `হ্যাঁ বলুন 😄`;
    } else if (lang === 'marathi') {
      answer = `हो सांगा 😄`;
    } else if (lang === 'tamil') {
      answer = `சொல்லுங்கள் 😄`;
    }

    return {
      answer,
      language: lang,
      intent: 'casual_chat',
      intentCategory: 'CASUAL_CONVERSATION',
      display: {
        responsibleUnit: false,
        location: false,
        contact: false,
        documents: false,
        nextSteps: false,
        sources: false,
        relatedTopics: false
      }
    };
  }
}

export const geminiService = new GeminiService();
