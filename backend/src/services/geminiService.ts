import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/env.js';
import { StructuredAnswer, ChatRequest } from '../types/index.js';
import { knowledgeService } from './knowledgeService.js';
import { routeQuery, detectLanguage } from './queryRouter.js';

function cleanJsonResponse(rawText: string): any {
  let cleaned = rawText.trim();
  // Strip markdown code fences if present
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  }
  return JSON.parse(cleaned);
}

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

    // 1. Check local in-memory cache (TTL: 1 hour to protect quota)
    const cached = this.responseCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.answer;
    }

    // 2. Query Router: Check if pure social message can be solved locally to save quota
    const decision = routeQuery(cleanMsg, language, conversationHistory);
    if (!decision.requiresGemini && decision.deterministicResponse) {
      return decision.deterministicResponse;
    }

    // 3. Fallback if no Gemini client available
    if (!this.genAI) {
      return this.buildSafeFallback(cleanMsg, conversationHistory);
    }

    // 4. Send to Gemini for Intelligent Help-Desk Reasoning over MongoDB Knowledge Context
    try {
      const model = this.genAI.getGenerativeModel({
        model: 'gemini-3.6-flash',
        generationConfig: {
          temperature: 0.35,
          maxOutputTokens: 700,
          responseMimeType: 'application/json'
        }
      });

      const targetedContext = knowledgeService.getCompactContextForQuery(cleanMsg, conversationHistory);
      const boundedHistory = conversationHistory.slice(-6);
      const historySummary = boundedHistory.map(h => `${h.role === 'user' ? 'Student' : 'Assistant'}: ${h.content}`).join('\n');
      const userLang = detectLanguage(cleanMsg, conversationHistory);

      const systemPrompt = `
You are a friendly, knowledgeable human sitting at the Dr. Harisingh Gour Vishwavidyalaya (DHSGSU, Sagar, MP) campus help desk.
A student is talking with you.

CORE HELP-DESK RULES:
1. ANSWER THE STUDENT'S ACTUAL QUESTION:
   - When a student asks for information (even in casual language, typos, or slang), ALWAYS answer the question directly, naturally, and accurately.
   - NEVER reply with "Haan bolo", "Hello 😄", or dismiss the student's question.
2. REQUEST DEPTH & COMPLETENESS:
   - If the student asks for an overview or related information (e.g., "mujhe physics department ke related information chahiye" or "baare mein sab batao"), provide a complete, well-structured department profile including:
     • School/Faculty
     • Location & Building
     • Head of Department (HOD)
     • Programmes/Courses offered
     • Contact Phone & Official Email
     • Campus Map / Website reference
   - If the student asks a specific question (e.g. "physics department kaha hai?" or "HOD kaun hai?"), answer that specific detail directly and concisely.
   - If the student has a problem (e.g. "scholarship nahi aayi", "marksheet mein naam galat hai"), explain the responsible office, location, required documents, and process steps.
3. CONVERSATION CONTEXT & FOLLOW-UPS:
   - Resolve short follow-ups like "hod kaun hai?", "aur kaha hai?", "contact number?", "waha admission kaise hota hai?" using the active department/topic from the recent conversation history.
4. NO HALLUCINATIONS:
   - Use ONLY verified information provided in the DHSGSU CONTEXT below. If a specific phone number or detail is not present in the context, explicitly say that it is currently not available in university records.
5. LANGUAGE & TONE:
   - Always match the student's language (Hinglish, Hindi, Bengali, Marathi, Tamil, Telugu, English, etc.) and conversational tone.
6. DYNAMIC DISPLAY FLAGS:
   - "display.location = true" if student asks where something is or needs directions.
   - "display.contact = true" if student asks for phone/email/contact.
   - "display.documents = true" if documents are needed.
   - "display.sources = true" for verified university facts.

VERIFIED DHSGSU CAMPUS CONTEXT:
${targetedContext}

Detected Language: ${userLang}

Respond strictly in JSON:
{
  "answer": "Helpful, natural conversational response in student's language.",
  "language": "${userLang}",
  "intent": "intent_code",
  "intentCategory": "INFORMATION | LOCATION | CONTACT | PROCESS | PROBLEM_SOLVING | CURRENT_INFORMATION",
  "display": {
    "responsibleUnit": false,
    "location": false,
    "contact": false,
    "documents": false,
    "nextSteps": false,
    "sources": true,
    "relatedTopics": false
  },
  "followUpQuestion": "Optional follow-up or null",
  "responsibleUnit": { "name": "Office/Department Name or null", "type": "department | office", "location": "Location or null" },
  "location": { "name": "Building name or null", "building": "Building or null", "landmark": "Landmark or null", "mapLink": "Map link or null" },
  "contact": { "phone": "Phone or null", "helpline": "Helpline or null", "email": "Email or null" },
  "requiredDocuments": ["Doc 1", "Doc 2"],
  "nextSteps": ["Step 1", "Step 2"],
  "sources": [{ "title": "Official DHSGSU Record", "url": "https://dhsgsu.edu.in", "sourceType": "official", "verified": true }],
  "relatedTopics": ["Topic 1", "Topic 2"]
}
      `.trim();

      const prompt = `
${systemPrompt}

${historySummary ? `Recent Conversation History:\n${historySummary}\n` : ''}
Current Student Message: "${cleanMsg}"
`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();

      try {
        const parsed = cleanJsonResponse(text) as StructuredAnswer;
        if (parsed && parsed.answer) {
          this.responseCache.set(cacheKey, {
            answer: parsed,
            expiry: Date.now() + 60 * 60 * 1000
          });
          return parsed;
        }
      } catch (parseError) {
        console.warn('[GeminiService] JSON parse error, using local knowledge resolution');
      }

      return this.buildSafeFallback(cleanMsg, conversationHistory);
    } catch (apiError: any) {
      console.warn('[GeminiService] API error/quota limit, using local knowledge fallback:', apiError?.message || apiError);
      return this.buildSafeFallback(cleanMsg, conversationHistory);
    }
  }

  private buildSafeFallback(query: string, history: Array<{ role: 'user' | 'assistant'; content: string }> = []): StructuredAnswer {
    const lang = detectLanguage(query, history);
    const isEnglish = lang === 'english';
    const isHindi = lang === 'hindi';
    const q = query.toLowerCase();
    const { matchedDepartments, matchedOffices, matchedLocations, matchedServices } = knowledgeService.findRelevantContext(query, history);

    // 1. Department Count / Total Structure Query
    if (q.includes('kitne department') || q.includes('total campus') || q.includes('total department') || q.includes('how many department')) {
      const depts = knowledgeService.getDepartments();
      const schools = knowledgeService.getSchools();
      const answer = isEnglish
        ? `DHSGSU campus comprises **${schools.length} Schools** and over **${depts.length} Academic Departments** located across the Patharia Hills Campus.`
        : `DHSGSU campus mein kul **${schools.length} Schools** ke antargat **${depts.length} se adhik Academic Departments** sthit hain.`;

      return {
        answer,
        language: lang,
        intent: 'campus_structure',
        intentCategory: 'INFORMATION',
        display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: true, relatedTopics: false }
      };
    }

    // 2. Admission Notice / Latest Updates
    if (q.includes('latest admission') || q.includes('admission notice') || q.includes('admission update')) {
      const answer = isEnglish
        ? `Admissions at DHSGSU are conducted through CUET (UG/PG) and Departmental Entrances. For current seat allocation, merit lists, and counseling schedules, check the official portal: **dhsgsu.edu.in**.`
        : `DHSGSU mein admissions CUET (UG/PG) aur Departmental Entrance dwara hote hain. Latest merit list, counseling schedule aur updates ke liye official website **dhsgsu.edu.in** dekhein.`;

      return {
        answer,
        language: lang,
        intent: 'admission_notice',
        intentCategory: 'CURRENT_INFORMATION',
        sources: [{ title: 'Official DHSGSU Admissions', url: 'https://dhsgsu.edu.in', sourceType: 'official', verified: true }],
        display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: true, relatedTopics: false }
      };
    }

    // 3. Exam Form Submission Query
    if (q.includes('exam form') || q.includes('examination form')) {
      const examOffice = knowledgeService.getOfficeById('office-exam-cell')!;
      const answer = isEnglish
        ? `Exam forms are submitted online via the MP Online / Samarth Portal and verified at the **Examination Cell (Pariksha Bhawan)**.`
        : `Exam form online MP Online / Samarth Portal par bhara jaata hai aur physical verification **Examination Cell (Pariksha Bhawan)** mein hota hai.`;

      return {
        answer,
        language: lang,
        intent: 'exam_form',
        intentCategory: 'PROCESS',
        responsibleUnit: { name: examOffice.name, type: 'office', location: examOffice.location },
        location: { name: 'Pariksha Bhawan', building: 'Examination Building', mapLink: examOffice.officialSourceUrl },
        display: { responsibleUnit: true, location: true, contact: false, documents: false, nextSteps: true, sources: true, relatedTopics: false }
      };
    }

    // 4. Matched Department Fallback
    if (matchedDepartments.length > 0) {
      const d = matchedDepartments[0];
      const isLocationReq = /\b(kaha|kahan|kidhar|where|location|building|map)\b/i.test(query);
      const isHodReq = /\b(hod|head|kaun hai|who is)\b/i.test(query);
      const isContactReq = /\b(contact|number|phone|email)\b/i.test(query);

      if (isLocationReq) {
        return {
          answer: isEnglish
            ? `The **${d.name}** is located at ${d.location || d.building}.`
            : `**${d.name}** ${d.location || d.building} mein sthit hai.`,
          language: lang,
          intent: 'department_location',
          intentCategory: 'LOCATION',
          responsibleUnit: { name: d.name, type: 'department', location: d.location },
          location: { name: d.building || d.name, building: d.building, landmark: 'DHSGSU Campus', mapLink: d.mapLink },
          display: { responsibleUnit: false, location: true, contact: false, documents: false, nextSteps: false, sources: true, relatedTopics: false }
        };
      }

      if (isHodReq) {
        return {
          answer: isEnglish
            ? `The Head of the **${d.name}** is **${d.hod}**.`
            : `**${d.name}** ke Head (HOD) **${d.hod}** hain.`,
          language: lang,
          intent: 'department_hod',
          intentCategory: 'INFORMATION',
          responsibleUnit: { name: d.name, type: 'department', location: d.location },
          display: { responsibleUnit: true, location: false, contact: false, documents: false, nextSteps: false, sources: true, relatedTopics: false }
        };
      }

      if (isContactReq) {
        return {
          answer: isEnglish
            ? `Contact for **${d.name}**: Phone: **${d.contact?.phone || 'N/A'}**, Email: **${d.contact?.email || 'N/A'}**.`
            : `**${d.name}** ka contact: Phone: **${d.contact?.phone || 'N/A'}**, Email: **${d.contact?.email || 'N/A'}**.`,
          language: lang,
          intent: 'department_contact',
          intentCategory: 'CONTACT',
          responsibleUnit: { name: d.name, type: 'department', location: d.location },
          contact: { phone: d.contact?.phone, email: d.contact?.email, officialWebsite: d.officialSourceUrl },
          display: { responsibleUnit: true, location: false, contact: true, documents: false, nextSteps: false, sources: true, relatedTopics: false }
        };
      }

      // Complete Department Profile
      const overviewText = isEnglish
        ? `**${d.name}** (${d.schoolName})\n\n📍 **Location:** ${d.location || d.building}\n👤 **HOD:** ${d.hod}\n🎓 **Programmes:** ${d.programmes.join(', ')}\n📞 **Contact:** ${d.contact?.phone || 'N/A'}\n✉️ **Email:** ${d.contact?.email || 'N/A'}`
        : `Haan, bilkul. **${d.name}** (${d.schoolName}) ki details:\n\n📍 **Location:** ${d.location || d.building}\n👤 **HOD:** ${d.hod}\n🎓 **Programmes:** ${d.programmes.join(', ')}\n📞 **Phone:** ${d.contact?.phone || 'N/A'}\n✉️ **Email:** ${d.contact?.email || 'N/A'}`;

      return {
        answer: overviewText,
        language: lang,
        intent: 'department_overview',
        intentCategory: 'INFORMATION',
        responsibleUnit: { name: d.name, type: 'department', location: d.location },
        location: { name: d.building || d.name, building: d.building, mapLink: d.mapLink },
        contact: { phone: d.contact?.phone, email: d.contact?.email, officialWebsite: d.officialSourceUrl },
        display: { responsibleUnit: true, location: true, contact: true, documents: false, nextSteps: false, sources: true, relatedTopics: false }
      };
    }

    // 5. Matched Location Fallback
    if (matchedLocations.length > 0) {
      const l = matchedLocations[0];
      return {
        answer: isEnglish
          ? `**${l.name}** is located at ${l.building} (${l.landmark || 'Patharia Hills Campus'}).`
          : `**${l.name}** ${l.building} (${l.landmark || 'Patharia Hills Campus'}) mein sthit hai.`,
        language: lang,
        intent: 'location_info',
        intentCategory: 'LOCATION',
        location: { name: l.name, building: l.building, landmark: l.landmark, mapLink: l.mapLink },
        display: { responsibleUnit: false, location: true, contact: false, documents: false, nextSteps: false, sources: true, relatedTopics: false }
      };
    }

    // 6. Matched Office Fallback
    if (matchedOffices.length > 0) {
      const o = matchedOffices[0];
      return {
        answer: isEnglish
          ? `**${o.name}** is located at ${o.location} (${o.building}). Office Hours: ${o.officeHours}.`
          : `**${o.name}** ${o.location} (${o.building}) mein sthit hai. Timing: ${o.officeHours}.`,
        language: lang,
        intent: 'office_overview',
        intentCategory: 'INFORMATION',
        responsibleUnit: { name: o.name, type: 'office', location: o.location, officeHours: o.officeHours },
        display: { responsibleUnit: true, location: true, contact: false, documents: false, nextSteps: false, sources: true, relatedTopics: false }
      };
    }

    // 7. General Help Fallback
    return {
      answer: isEnglish
        ? `I can help you with DHSGSU departments, locations, admissions, exams, scholarships, hostels, and contacts. What would you like to know?`
        : `DHSGSU campus se related departments, locations, admission, exam, scholarship ya contact se sambandhit aap kya janna chahte hain?`,
      language: lang,
      intent: 'general_help',
      intentCategory: 'INFORMATION',
      display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: false, relatedTopics: false }
    };
  }
}

export const geminiService = new GeminiService();
