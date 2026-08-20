import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/env.js';
import { StructuredAnswer, ChatRequest } from '../types/index.js';
import { knowledgeService } from './knowledgeService.js';
import { routeQuery } from './queryRouter.js';

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

    // 2. Query Router: check if this can be solved deterministically with 0 API calls
    const decision = routeQuery(cleanMsg, language, conversationHistory);
    if (!decision.requiresGemini && decision.deterministicResponse) {
      return decision.deterministicResponse;
    }

    // 3. If no Gemini client is available, fallback to deterministic knowledge response
    if (!this.genAI) {
      return decision.deterministicResponse || this.buildSafeFallback(cleanMsg);
    }

    // 4. Compact Context & Bounded History for Gemini API invocation
    try {
      const model = this.genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: {
          temperature: 0.25,
          maxOutputTokens: 600,
          responseMimeType: 'application/json'
        }
      });

      // Retrieve only targeted relevant knowledge slice (saves ~80% prompt tokens)
      const targetedContext = knowledgeService.getCompactContextForQuery(cleanMsg);

      // Keep bounded history: last 4 messages only
      const boundedHistory = conversationHistory.slice(-4);
      const historySummary = boundedHistory.map(h => `${h.role === 'user' ? 'Student' : 'Assistant'}: ${h.content}`).join('\n');

      const systemPrompt = `
You are the friendly, knowledgeable digital campus guide for Dr. Harisingh Gour Vishwavidyalaya (DHSGSU), Sagar (MP).
You are having a natural human-like conversation with a student.

NON-NEGOTIABLE CONVERSATIONAL RULES:
1. Answer the student's ACTUAL CURRENT MESSAGE directly.
2. NEVER repeatedly introduce yourself with "I am your DHSGSU Campus Assistant" if the conversation is ongoing.
3. NEVER list your capabilities ("I can help with scholarships, marksheets, hostels...") unless the student explicitly asks "What can you do?".
4. For casual chat or testing ("kuch nahi", "bas dekh raha hu", "okay", "thanks"), respond naturally and briefly in 1 line. Set ALL display flags to FALSE.
5. If the student describes a problem (e.g. scholarship or marksheet), clarify the issue first instead of dumping office/location cards immediately.
6. Display flags ("display.location", "display.contact", "display.documents", "display.sources") must be TRUE ONLY when explicitly requested or required for the immediate step.
7. Tone: warm, natural, senior-student-like, concise. Match the user's language (English, Hindi, Hinglish, etc.) naturally.

TARGETED DHSGSU CAMPUS CONTEXT:
${targetedContext}

Respond strictly in JSON format:
{
  "answer": "Concise natural response in student's language and style.",
  "language": "Detected language",
  "intent": "Intent code",
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

${historySummary ? `Previous Context:\n${historySummary}\n` : ''}
Student's Message: "${cleanMsg}"
`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();

      try {
        const parsed = JSON.parse(text) as StructuredAnswer;
        if (parsed && parsed.answer) {
          // Cache successful responses for 5 minutes
          this.responseCache.set(cacheKey, {
            answer: parsed,
            expiry: Date.now() + 5 * 60 * 1000
          });
          return parsed;
        }
      } catch (parseError) {
        console.warn('[GeminiService] JSON parse error, falling back to router response');
      }

      return decision.deterministicResponse || this.buildSafeFallback(cleanMsg);
    } catch (apiError) {
      console.warn('[GeminiService] API rate-limit/network error, gracefully falling back:', apiError);
      return decision.deterministicResponse || this.buildSafeFallback(cleanMsg);
    }
  }

  private buildSafeFallback(query: string): StructuredAnswer {
    const isHindi = /[\u0900-\u097F]/.test(query) || /\b(kaha|kya|hai|kare|nahi|batao)\b/i.test(query);

    return {
      answer: isHindi
        ? `Haan, main DHSGSU campus ke baare mein aapki madad kar sakta hoon. Aapko kis cheez mein help chahiye?`
        : `I can help you around DHSGSU campus. Let me know what you'd like to know!`,
      language: isHindi ? 'Hinglish' : 'English',
      intent: 'general_fallback',
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
