import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/env.js';
import { StructuredAnswer, ChatRequest } from '../types/index.js';
import { knowledgeService } from './knowledgeService.js';
import { classifyAndSolveDeterministic } from './intentClassifier.js';

export class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;

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

    // 1. Check if we have deterministic high-confidence match
    const deterministicMatch = classifyAndSolveDeterministic(message, language, conversationHistory);

    // If no Gemini API key is configured or available, return deterministic solution or fallback
    if (!this.genAI) {
      if (deterministicMatch) {
        return deterministicMatch;
      }
      return this.buildGenericConversationalFallback(message, language);
    }

    try {
      const model = this.genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json'
        }
      });

      const knowledgePrompt = knowledgeService.getStructuredKnowledgePrompt();

      const systemPrompt = `
You are the DHSGSU Campus Assistant for Dr. Harisingh Gour Vishwavidyalaya, Sagar (MP).
Behave like a knowledgeable, friendly university campus guide having a natural human conversation with a student.

CRITICAL CONVERSATIONAL RULES (PROGRESSIVE DISCLOSURE):
1. Answer the user's actual question first. Do NOT dump all available university information into every response.
2. For casual greetings (e.g. "Hey", "Hello", "Hi"): respond warmly and briefly in 1-2 lines (e.g. "Hey! 👋 How can I help you around DHSGSU?"). ALL display flags must be FALSE.
3. If the user describes a problem (e.g. "Meri scholarship nahi aayi", "Marksheet mein correction karwana hai"): First understand/clarify the problem. Ask a short, natural follow-up question. Do NOT immediately dump office/location/contact cards.
4. Only set display flags to TRUE when that specific piece of information is directly asked for or genuinely needed for the immediate step:
   - "display.location = true" ONLY if user asks where something is or asks where to go.
   - "display.contact = true" ONLY if user asks for phone/email/number or who to contact.
   - "display.documents = true" ONLY if user asks what documents to bring or what is required.
   - "display.sources = true" ONLY for verified factual university/policy answers.
   - "display.relatedTopics = true" ONLY for broad campus exploration queries (maximum 2-3 topics).
5. NEVER invent or hallucinate room numbers, phone numbers, or unverified policies.
6. Preserve important official university terminology in English/Roman script (e.g. "Examination Cell", "DSW Office", "Pariksha Bhawan", "Tagore Hostel") so physical signs on campus match.

${knowledgePrompt}

Respond strictly in JSON format matching this schema:
{
  "answer": "Concise, natural conversational answer in user's language and script.",
  "language": "Detected language (e.g. English, Hindi, Hinglish, Bengali, etc.)",
  "intent": "Short intent code (e.g. greeting, scholarship_triage, library_location, etc.)",
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
  "followUpQuestion": "Optional short clarification question or null",
  "responsibleUnit": {
    "name": "Official office/department name or null",
    "type": "office | department | cell",
    "location": "Location string or null",
    "contact": "Contact string or null",
    "officeHours": "Office hours or null"
  },
  "location": {
    "name": "Building name or null",
    "building": "Building name or null",
    "floor": "Floor or null",
    "landmark": "Landmark or null",
    "mapLink": "Google Maps link or null"
  },
  "contact": {
    "phone": "Phone number or null",
    "email": "Email or null",
    "helpline": "Helpline or null",
    "officialWebsite": "Official URL or null"
  },
  "requiredDocuments": ["Array of documents or null"],
  "nextSteps": ["Array of steps or null"],
  "sources": [
    {
      "title": "Source title",
      "url": "https://dhsgsu.edu.in/...",
      "sourceType": "official | circular | map | web",
      "verified": true
    }
  ],
  "relatedTopics": ["Topic 1", "Topic 2"],
  "confidence": "verified_official | general_guidance"
}
      `.trim();

      const chatHistoryText = conversationHistory.length > 0
        ? conversationHistory.map(h => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`).join('\n')
        : '';

      const prompt = `
${systemPrompt}

${chatHistoryText ? `Recent Conversation Context:\n${chatHistoryText}\n` : ''}
Current User Message: "${message}"
User Preferred Language: "${language}"
`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();

      try {
        const parsed = JSON.parse(text) as StructuredAnswer;
        if (parsed && parsed.answer) {
          // Extra safety guard: if greeting, ensure display flags are strictly false
          if (parsed.intentCategory === 'GREETING' || /^(hey|hello|hi)(\s|!|\.|\?)*$/i.test(message.trim())) {
            parsed.display = {
              responsibleUnit: false,
              location: false,
              contact: false,
              documents: false,
              nextSteps: false,
              sources: false,
              relatedTopics: false
            };
          }
          return parsed;
        }
      } catch (parseError) {
        console.warn('[GeminiService] JSON parse error, falling back to deterministic response');
      }

      if (deterministicMatch) {
        return deterministicMatch;
      }
      return this.buildGenericConversationalFallback(message, language);
    } catch (apiError) {
      console.error('[GeminiService] API error:', apiError);
      if (deterministicMatch) {
        return deterministicMatch;
      }
      return this.buildGenericConversationalFallback(message, language);
    }
  }

  private buildGenericConversationalFallback(query: string, lang = 'auto'): StructuredAnswer {
    const isHindi = /[\u0900-\u097F]/.test(query) || query.toLowerCase().includes('kaha') || query.toLowerCase().includes('kya');
    const isGreeting = /^(hey|hello|hi)(\s|!|\.|\?)*$/i.test(query.trim());

    if (isGreeting) {
      return {
        answer: isHindi ? `नमस्ते! 👋 DHSGSU कैंपस में आपकी क्या सहायता कर सकता हूँ?` : `Hey! 👋 How can I help you around DHSGSU campus?`,
        language: isHindi ? 'Hindi' : 'English',
        intent: 'greeting',
        intentCategory: 'GREETING',
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

    return {
      answer: isHindi
        ? `मैं डॉ. हरीसिंह गौर विश्वविद्यालय (DHSGSU) का कैंपस सहायक हूँ। आप छात्रवृत्ति, अंकसूची सुधार, परीक्षा फॉर्म, हॉस्टल, लाइब्रेरी या किसी भी विभाग से जुड़ी समस्या पूछ सकते हैं।`
        : `I am your DHSGSU Campus Assistant. Tell me what issue you're facing (scholarship, marksheet, exam form, hostel, or finding a department), and I'll help you solve it.`,
      language: isHindi ? 'Hindi' : 'English',
      intent: 'general_assistance',
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
