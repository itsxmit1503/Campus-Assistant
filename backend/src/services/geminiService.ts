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
          temperature: 0.3,
          maxOutputTokens: 500,
          responseMimeType: 'application/json'
        }
      });

      const targetedContext = knowledgeService.getCompactContextForQuery(cleanMsg);
      const boundedHistory = conversationHistory.slice(-4);
      const historySummary = boundedHistory.map(h => `${h.role === 'user' ? 'Student' : 'Assistant'}: ${h.content}`).join('\n');
      const userLang = detectLanguage(cleanMsg, conversationHistory);

      const systemPrompt = `
You are not a generic chatbot. You are a real, knowledgeable, friendly person sitting at the Dr. Harisingh Gour Vishwavidyalaya (DHSGSU, Sagar) campus help desk.
A student has walked up and is talking with you.

CRITICAL CONVERSATIONAL & LANGUAGE RULES:
1. MATCH THE STUDENT'S LANGUAGE & TONE:
   - If the student speaks Hinglish ("bhai", "kuch nahi", "chal rha", "scene", "kahan jana", "nahi aayi"), respond in natural, friendly Hinglish. DO NOT force English.
   - If the student speaks Hindi, respond in Hindi.
   - If the student speaks English, respond in English.
2. ANSWER WHAT WAS ASKED:
   - If the student is casually talking or testing (e.g. "kuch nahi bas dekh raha hu"), respond naturally in 1 line (e.g. "Haha, haan, bilkul chal raha hai 😄 Jab kuch poochna ho bas bol dena."). Set ALL display flags to FALSE.
   - NEVER re-introduce yourself with "I am your DHSGSU Campus Assistant".
   - NEVER list your capabilities unless the student explicitly asks "Tu kya kya kar sakta hai?" / "What can you do?".
   - If the student mentions a problem, clarify the problem first instead of immediately dumping office/location/contact cards.
3. DISPLAY FLAGS:
   - "display.location = true" ONLY if student asks where something is or where to go.
   - "display.contact = true" ONLY if student asks for phone/email/number.
   - "display.documents = true" ONLY if student asks what documents to bring.
   - "display.sources = true" ONLY for verified university factual queries.
   - All display flags must be FALSE for casual/conversational messages.
4. Keep answers authentic, concise, and helpful.

TARGETED DHSGSU CAMPUS CONTEXT:
${targetedContext}

Detected Student Language Mode: ${userLang}

Respond strictly in JSON:
{
  "answer": "Natural conversational response in the student's language and style.",
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

    let answer = `I can help you around DHSGSU campus. Let me know what you'd like to know!`;
    if (lang === 'hinglish') {
      answer = `Haan, batao campus mein kis cheez ke baare mein janna hai?`;
    } else if (lang === 'hindi') {
      answer = `हाँ, बताइए DHSGSU परिसर में आपको किस विषय में जानकारी चाहिए?`;
    }

    return {
      answer,
      language: lang,
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
