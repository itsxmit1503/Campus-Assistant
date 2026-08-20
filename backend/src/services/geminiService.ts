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

    // 1. Check if we have deterministic high-confidence match from seed knowledge
    const deterministicMatch = classifyAndSolveDeterministic(message, language);

    // If no Gemini API key is configured or available, return deterministic solution or fallback
    if (!this.genAI) {
      if (deterministicMatch) {
        return deterministicMatch;
      }
      return this.buildGenericKnowledgeFallback(message, language);
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
You are the official, helpful, authentic digital Campus Assistant for Dr. Harisingh Gour Vishwavidyalaya (DHSGSU), Sagar (Madhya Pradesh).
Your core philosophy is:
Student Explains Problem -> Understand Intent -> Identify Service -> Responsible Unit / Office -> Campus Location -> Next Steps & Required Documents -> Official DHSGSU Source.

NEVER invent, hallucinate or fabricate:
- Room numbers, office timings, HOD names, phone numbers, fees, deadlines, or official policies that are not verified in the knowledge base.
- If information is not in the knowledge base, state clearly: "I couldn't verify this specific detail from an official DHSGSU university source."

MULTILINGUAL RULES:
- Detect the user's language (English, Hindi, Hinglish, Bengali, Marathi, Gujarati, Tamil, Telugu, etc.) or respect code-switching.
- Always preserve official university entity names in English/standard Roman script (e.g. "Examination Cell", "DSW Office", "Pariksha Bhawan", "Tagore Hostel") so students can identify physical signs on campus.
- Tone: Friendly, concise, supportive, respectful, authentic university digital guide. No generic robot talk.

${knowledgePrompt}

Respond strictly in JSON format matching this schema:
{
  "answer": "Concise, highly actionable answer in user's language and script. Explain what to do clearly.",
  "language": "Detected language (e.g. Hindi, Hinglish, English, Bengali, etc.)",
  "intent": "Short intent code (e.g. scholarship_query, marksheet_correction, exam_issue, department_location, etc.)",
  "service": {
    "id": "service id if applicable or null",
    "name": "Service name or null",
    "category": "Category name or null"
  },
  "responsibleUnit": {
    "name": "Exact official office/department name or null",
    "type": "office | department | cell | committee",
    "location": "Verified location or null",
    "contact": "Verified contact email/phone or null",
    "officeHours": "Verified office hours or null"
  },
  "location": {
    "name": "Campus building/place name or null",
    "building": "Building name or null",
    "floor": "Floor info or null",
    "landmark": "Campus landmark or null",
    "mapLink": "Google Maps link or null"
  },
  "contact": {
    "email": "Official email or null",
    "phone": "Official phone or null",
    "helpline": "Official helpline or null",
    "officialWebsite": "https://dhsgsu.edu.in/index.php/en/"
  },
  "requiredDocuments": ["Array of required documents or null"],
  "nextSteps": ["Array of sequential actionable steps for the student or null"],
  "sources": [
    {
      "title": "Official DHSGSU Source title",
      "url": "https://dhsgsu.edu.in/index.php/en/...",
      "sourceType": "official | circular | map | web",
      "verified": true
    }
  ],
  "relatedTopics": ["Related service 1", "Related service 2"],
  "confidence": "verified_official | general_guidance"
}
      `.trim();

      // Prepare conversation history context
      const chatHistoryText = conversationHistory.length > 0
        ? conversationHistory.map(h => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`).join('\n')
        : '';

      const prompt = `
${systemPrompt}

${chatHistoryText ? `Recent Conversation History:\n${chatHistoryText}\n` : ''}
User Query: "${message}"
User Preferred Language (if any): "${language}"
`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();

      try {
        const parsed = JSON.parse(text) as StructuredAnswer;
        if (parsed && parsed.answer) {
          return parsed;
        }
      } catch (parseError) {
        console.warn('[GeminiService] JSON parse error from model response, falling back to deterministic/structured response');
      }

      if (deterministicMatch) {
        return deterministicMatch;
      }
      return this.buildGenericKnowledgeFallback(message, language);
    } catch (apiError) {
      console.error('[GeminiService] API invocation error:', apiError);
      if (deterministicMatch) {
        return deterministicMatch;
      }
      return this.buildGenericKnowledgeFallback(message, language);
    }
  }

  private buildGenericKnowledgeFallback(query: string, lang = 'auto'): StructuredAnswer {
    const isHindi = /[\u0900-\u097F]/.test(query) || query.toLowerCase().includes('kaha') || query.toLowerCase().includes('kya');

    return {
      answer: isHindi
        ? `डॉ. हरीसिंह गौर विश्वविद्यालय (DHSGSU) परिसर में आपकी सहायता के लिए मैं उपस्थित हूँ। आप छात्रवृत्ति, परीक्षा फॉर्म, अंकसूची संशोधन, हॉस्टल, लाइब्रेरी या किसी भी विभाग की जानकारी के लिए पूछ सकते हैं।`
        : `I am your DHSGSU Campus Assistant. I can help guide you to the right department, administrative office, library, hostel, examination support, or scholarship cell.`,
      language: isHindi ? 'Hindi/Hinglish' : 'English',
      intent: 'general_assistance',
      responsibleUnit: {
        name: 'Main Administrative Block (Prashasnik Bhawan)',
        type: 'office',
        location: 'Patharia Hills Campus, Sagar',
        contact: '07582-265810'
      },
      location: {
        name: 'Prashasnik Bhawan',
        building: 'Main Administrative Block',
        landmark: 'Near Flagpost, Patharia Hills',
        mapLink: 'https://maps.google.com/?q=Dr.+Harisingh+Gour+Vishwavidyalaya+Sagar'
      },
      contact: {
        email: 'registrar@dhsgsu.edu.in',
        helpline: '07582-265810',
        officialWebsite: 'https://dhsgsu.edu.in/index.php/en/'
      },
      sources: [
        {
          title: 'DHSGSU Official Website',
          url: 'https://dhsgsu.edu.in/index.php/en/',
          sourceType: 'official',
          verified: true
        }
      ],
      relatedTopics: ['Scholarships', 'Examination Cell', 'Central Library', 'Hostel Admissions', 'Departments'],
      confidence: 'general_guidance'
    };
  }
}

export const geminiService = new GeminiService();
