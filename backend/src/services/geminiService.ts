import { GoogleGenerativeAI } from '@google/generative-ai';
import crypto from 'crypto';
import { config } from '../config/env.js';
import { StructuredAnswer, ChatRequest } from '../types/index.js';
import { knowledgeService } from './knowledgeService.js';
import { entityVerificationEngine } from './entityVerificationEngine.js';
import { routeQuery, detectLanguage } from './queryRouter.js';

function cleanJsonResponse(rawText: string): any {
  let cleaned = rawText.trim();
  
  // 1. Strip markdown code fences
  if (cleaned.includes('```')) {
    const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (match) {
      cleaned = match[1].trim();
    } else {
      cleaned = cleaned.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
    }
  }

  // 2. Extract between first { and last }
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  // 3. Try standard parse
  try {
    return JSON.parse(cleaned);
  } catch {}

  // 4. Try fixing single quotes to double quotes
  try {
    const doubleQuoted = cleaned
      .replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, '"$1"')
      .replace(/,\s*([\]}])/g, '$1'); // remove trailing commas
    return JSON.parse(doubleQuoted);
  } catch {}

  // 5. Try fixing unescaped newlines inside JSON strings
  try {
    const sanitized = cleaned.replace(/[\r\n]+/g, ' ');
    return JSON.parse(sanitized);
  } catch (err) {
    throw err;
  }
}

/**
 * Extracts ONLY the conversational answer text if JSON parsing fails,
 * ensuring raw JSON syntax ({ "answer": ... }) is NEVER displayed in the chat UI.
 */
function extractAnswerText(rawText: string): string {
  if (!rawText) return '';
  const trimmed = rawText.trim();

  // 1. Regex match for "answer": "..." or 'answer': '...'
  const answerMatch = trimmed.match(/["']answer["']\s*:\s*["']([\s\S]*?)(?=(?:["']\s*,\s*["']|\n\s*["']|\}\s*$))/i);
  if (answerMatch && answerMatch[1]) {
    return answerMatch[1]
      .replace(/\\n/g, '\n')
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'")
      .trim();
  }

  // 2. If it's plain text without JSON markers, return directly
  if (!trimmed.startsWith('{') && !trimmed.startsWith('```')) {
    return trimmed;
  }

  // 3. Strip any JSON artifacts
  return trimmed
    .replace(/^\{[\s\S]*?["']answer["']\s*:\s*["']/i, '')
    .replace(/["']\s*,[\s\S]*\}$/i, '')
    .replace(/```(?:json)?/gi, '')
    .replace(/```/g, '')
    .replace(/^[{\s"]+|[}\s"]+$/g, '')
    .trim();
}

/**
 * Build a cache key that includes conversation context so that follow-up questions
 * (e.g. "hod kaun hai?" after "physics department ke baare mein batao") never return
 * a stale cached response from a completely different conversation.
 */
function buildCacheKey(message: string, history: Array<{ role: string; content: string }>, lang: string): string {
  // Include the last 3 history turns in the key to capture context
  const recentHistory = history.slice(-3).map(h => `${h.role}:${h.content}`).join('|');
  const raw = `${message.toLowerCase()}__${lang}__${recentHistory}`;
  return crypto.createHash('md5').update(raw).digest('hex');
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

    console.log(`\n[CHAT] ──────────────────────────────────────`);
    console.log(`[CHAT] Message received: "${cleanMsg}"`);

    // ── STEP 1: Check if this is a trivial local-only message ────────────────
    const decision = routeQuery(cleanMsg, language, conversationHistory);

    if (!decision.requiresGemini && decision.deterministicResponse) {
      console.log(`[CHAT] Routing → LOCAL TRIVIAL RESPONSE (thanks/bye/emoji)`);
      return decision.deterministicResponse;
    }

    console.log(`[CHAT] Routing → GEMINI`);

    // ── STEP 2: Check cache (with context-aware cache key) ───────────────────
    const cacheKey = buildCacheKey(cleanMsg, conversationHistory, language);
    const cached = this.responseCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      console.log(`[CHAT] Cache hit — returning cached Gemini response`);
      return cached.answer;
    }

    // ── STEP 3: Fallback if Gemini is not configured ─────────────────────────
    if (!this.genAI) {
      console.warn(`[CHAT] Gemini not configured — using structured knowledge fallback`);
      return this.buildSafeFallback(cleanMsg, conversationHistory);
    }

    // ── STEP 4: Official Source-First & Physical Entity Verification ───────────
    const verifiedReqContext = await entityVerificationEngine.verifyQuery(cleanMsg, conversationHistory);
    const targetedContext = verifiedReqContext.verificationSummaryText;
    const userLang = detectLanguage(cleanMsg, conversationHistory);
    console.log(`[CHAT] Verified knowledge context prepared (detected language: ${userLang})`);

    // ── STEP 5: Prepare conversation history for Gemini ───────────────────────
    const boundedHistory = conversationHistory.slice(-8);
    const historySummary = boundedHistory
      .map(h => `${h.role === 'user' ? 'Student' : 'Assistant'}: ${h.content}`)
      .join('\n');

    // ── STEP 6: Build the system prompt ──────────────────────────────────────
    const systemPrompt = `You are a friendly, knowledgeable university help-desk assistant at Dr. Harisingh Gour Vishwavidyalaya (DHSGSU), Sagar, Madhya Pradesh, India.
A student is talking with you directly. Behave like a real, helpful person sitting at the campus help desk — not a scripted chatbot.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORE CONVERSATIONAL & FACTUAL RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. UNDERSTAND WHAT THE STUDENT ACTUALLY SAID.
   - Read the message fully. Understand the intent, not just the words.
   - Do NOT respond based on language alone. Language = how to communicate. Intent = what to communicate.

2. CAMPUS CLASSIFICATION & VERIFIED LOCATIONS:
   - DHSGSU has two primary campus areas:
     • **Valley Campus (Gour Nagar)**: Contains Department of Computer Science & Applications (CSA) and specific lower-campus facilities.
     • **Upper Campus (Patharia Hills)**: Contains Main Administrative Block, Pariksha Bhawan, Central Library, Science Block (Physics, Chemistry), Law, Management, DSW, Hostels, etc.
   - **CRITICAL**: The Department of Computer Science & Applications (CSA) is located in the **Valley Campus**. NEVER say or infer that CSA is in the Upper Campus, Patharia Hills, or Hill Campus.
   - Always state the verified Campus, Building, and Landmark accurately from the CONTEXT below.

3. COUNT & EXHAUSTIVE QUESTIONS:
   - When asked "how many", "total", "list all" (e.g. boys hostels, girls hostels, libraries, campuses):
     • Use the exact verified count and items provided in the VERIFIED DHSGSU CAMPUS CONTEXT below.
     • For example: There are 4 Boys' Hostels (Tagore, Raman, Vivekananda, Gour), 4 Girls' Hostels (Saraswati, Laxmibai, Nivedita, Priyadarshini), 2 Campuses (Valley Campus & Upper Campus).
     • NEVER say "exact number is not listed" when the context lists them.

4. DO NOT EQUATE 'MAIN/CENTRAL' WITH 'ONLY':
   - "Jawaharlal Nehru Central Library is the main library" does NOT mean there is only one library (departmental libraries & reading rooms also exist across academic departments).
   - If asked "so there is only one library?", clarify that Central Library is the main university library and departmental reading collections also operate.

5. LOCATION & GOOGLE MAPS REQUESTS:
   - When a student asks "kaha hai?", "where is it?", "exact location", "address", "map link", or "how do I reach?":
     • Give a clear, natural explanation specifying the exact Campus, Building, and Landmark.
     • Set "display.location = true" and populate the "location" object with "campus", "building", "address", "landmark", and "googleMapsUrl".
     • Do NOT paste raw http/https map URLs inside the conversational "answer" text (the UI renders a clickable "Open in Google Maps" button automatically).

6. DEPARTMENT OVERVIEW & DETAIL REQUESTS:
   - When a student asks for overview/details (e.g., "batao", "details chahiye", "courses kaunse hain"):
     • Provide a well-structured summary: School, Campus & Building, HOD, Programmes, Official Email/Phone.
     • Keep it concise and readable with bullet points where appropriate.

7. MULTI-PART REQUESTS — MANDATORY FULL COMPLETENESS:
   - If a student asks for MULTIPLE pieces of information in a single message (e.g. "contact details and location", "HOD aur email", "address, phone aur map"):
     • You MUST satisfy EVERY single requested piece of information in that same response.
     • NEVER stop after answering only one part.
     • Enable all corresponding display flags (e.g., if asking for location AND contact, set BOTH "display.location = true" AND "display.contact = true").

8. LANGUAGE MIRRORING — CRITICAL:
   - Detect the student's language from their message and respond in that same language.
   - English → English | Hindi → Hindi | Hinglish → Hinglish | Bengali → Bengali | Marathi → Marathi | etc.
   - Keep official department and office names in their recognizable form for physical navigation.

9. CONVERSATION CONTEXT AND FOLLOW-UPS:
   - Study conversation history carefully.
   - Resolve follow-up references using context (e.g., "exact location?", "kis campus mein hai?", "HOD kaun hai?", "map bhej do" refer to the active department/topic).

10. NO HALLUCINATIONS:
   - Use ONLY verified information from the DHSGSU CONTEXT section below.
   - If a specific phone number or detail is not present in the context, explicitly say it is currently not listed in university records.

11. STRUCTURED DATA FLAGS:
   - "display.location = true" if student asks about location, directions, campus, or maps.
   - "display.contact = true" if student asks for phone/email/contact.
   - "display.documents = true" if documents are needed.
   - "display.responsibleUnit = true" for department/office overviews.
   - "display.sources = true" for verified university factual answers.
   - "display.relatedTopics = false" (do not clutter direct factual answers with exploration chips unless relevant).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VERIFIED DHSGSU CAMPUS CONTEXT (USE THIS — DO NOT INVENT)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${targetedContext}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DETECTED STUDENT LANGUAGE: ${userLang}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Respond STRICTLY in this JSON format:
{
  "answer": "Your natural, helpful response in the student's language (no raw map URLs in text).",
  "language": "${userLang}",
  "intent": "concise_intent_code",
  "intentCategory": "GREETING | CASUAL_CONVERSATION | INFORMATION | LOCATION | CONTACT | PROCESS | PROBLEM_SOLVING | CURRENT_INFORMATION",
  "display": {
    "responsibleUnit": false,
    "location": false,
    "contact": false,
    "documents": false,
    "nextSteps": false,
    "sources": false,
    "relatedTopics": false
  },
  "followUpQuestion": null,
  "responsibleUnit": null,
  "location": null,
  "contact": null,
  "requiredDocuments": [],
  "nextSteps": [],
  "sources": [],
  "relatedTopics": []
}

For structured objects when relevant:
  "responsibleUnit": { "name": "...", "type": "department|office", "location": "...", "officeHours": "..." }
  "location": {
    "name": "...",
    "campus": "Valley Campus | Upper Campus (Patharia Hills)",
    "building": "...",
    "floor": "...",
    "address": "...",
    "landmark": "...",
    "googleMapsUrl": "https://maps.google.com/..."
  }
  "contact": { "phone": "...", "helpline": "...", "email": "...", "officialWebsite": "..." }
  "sources": [{ "title": "...", "url": "...", "sourceType": "official", "verified": true }]

Set null for any field that is not applicable to this response.`;

    const fullPrompt = `${systemPrompt}

${historySummary ? `Recent Conversation History:\n${historySummary}\n` : ''}Current Student Message: "${cleanMsg}"`;

    // ── STEP 7: Call Gemini ───────────────────────────────────────────────────
    try {
      console.log(`[CHAT] Gemini request started`);

      let text = '';
      const candidateModels = ['gemini-flash-latest', 'gemini-flash-lite-latest', 'gemini-3.5-flash-lite'];

      for (const modelName of candidateModels) {
        try {
          const model = this.genAI.getGenerativeModel({
            model: modelName,
            generationConfig: {
              temperature: 0.4,
              maxOutputTokens: 2048,
              responseMimeType: 'application/json'
            }
          });

          const result = await model.generateContent(fullPrompt);
          text = result.response.text();
          if (text && text.trim().length > 0) {
            console.log(`[CHAT] Gemini response generated using model: ${modelName}`);
            break;
          }
        } catch (modelErr: any) {
          console.warn(`[CHAT] Model ${modelName} attempt failed (${modelErr?.message || modelErr}). Trying next available model...`);
        }
      }

      if (!text || text.trim().length === 0) {
        return this.buildSafeFallback(cleanMsg, conversationHistory);
      }

      try {
        const parsed = cleanJsonResponse(text) as StructuredAnswer;
        if (parsed && parsed.answer) {
          console.log(`[CHAT] Gemini final response generated (intent: ${parsed.intent || 'n/a'})`);
          const isFactual = parsed.intentCategory && !['CASUAL_CONVERSATION', 'GREETING'].includes(parsed.intentCategory);
          const ttl = isFactual ? 30 * 60 * 1000 : 5 * 60 * 1000;
          this.responseCache.set(cacheKey, { answer: parsed, expiry: Date.now() + ttl });
          console.log(`[CHAT] Response returned to client`);
          console.log(`[CHAT] ──────────────────────────────────────\n`);
          return parsed;
        }
      } catch (parseError) {
        console.warn(`[CHAT] Strict JSON parse failed, extracting raw text directly from Gemini`);
        // If Gemini outputted plain text instead of strict JSON, use Gemini's actual text!
        if (text && text.trim().length > 0) {
          const cleanAnswer = extractAnswerText(text);
          const fallbackAnswer: StructuredAnswer = {
            answer: cleanAnswer,
            language: userLang,
            intent: 'gemini_text_response',
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
          return fallbackAnswer;
        }
      }

      return this.buildSafeFallback(cleanMsg, conversationHistory);
    } catch (apiError: any) {
      console.error(`[CHAT] Gemini API error: ${apiError?.message || apiError}`);
      return this.buildSafeFallback(cleanMsg, conversationHistory);
    }
  }

  /**
   * buildSafeFallback — Called ONLY when Gemini is unavailable.
   *
   * This is NOT a canned response generator.
   * It attempts to provide the best possible factual answer from the knowledge base,
   * and clearly communicates when the full assistant is temporarily unavailable.
   *
   * It must NEVER return "Haan bolo" or "Sure, go ahead".
   */
  private buildSafeFallback(
    query: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }> = []
  ): StructuredAnswer {
    console.log(`[CHAT] Using knowledge-based fallback (Gemini unavailable)`);
    const lang = detectLanguage(query, history);
    const isEnglish = lang === 'english';
    const q = query.toLowerCase();

    const { matchedDepartments, matchedOffices, matchedLocations, matchedServices } =
      knowledgeService.findRelevantContext(query, history);

    // ── Department match ─────────────────────────────────────────────────────
    if (matchedDepartments.length > 0) {
      const d = matchedDepartments[0];
      const isLocationReq = /\b(kaha|kahan|kidhar|where|location|building|map|address|campus|pahuchu|rasta)\b/i.test(query);
      const isHodReq = /\b(hod|head|kaun hai|who is|adhyaksh)\b/i.test(query);
      const isContactReq = /\b(contact|number|phone|email|sampark)\b/i.test(query);
      const isCoursesReq = /\b(course|courses|programme|programmes|degree|branch|eligibility|admission)\b/i.test(query);
      const isOverviewReq = /\b(details|overview|baare mein|about|tell me|profile|all|sab|complete)\b/i.test(query);

      const deptCampus = d.campus || (d.id === 'dept-cs-applications' ? 'Valley Campus' : 'Upper Campus (Patharia Hills)');
      const deptAddress = d.address || `${d.building}, ${d.location}`;
      const deptMapsUrl = d.googleMapsUrl || d.mapLink || `https://maps.google.com/?q=${encodeURIComponent(d.name + ' DHSGSU Sagar')}`;

      // Count how many specific aspects are requested
      const requestedAspects = [
        isLocationReq && 'location',
        isContactReq && 'contact',
        isHodReq && 'hod',
        isCoursesReq && 'courses'
      ].filter(Boolean) as string[];

      // Multi-intent or Overview Request
      if (isOverviewReq || requestedAspects.length > 1 || requestedAspects.length === 0) {
        let answerText = isEnglish
          ? `**${d.name}** (${d.schoolName})\n\n📍 **Campus:** ${deptCampus}\n🏢 **Building:** ${d.building}`
          : `**${d.name}** (${d.schoolName})\n\n📍 **Campus:** ${deptCampus}\n🏢 **Building:** ${d.building}`;

        if (isHodReq || isOverviewReq || requestedAspects.length === 0) {
          answerText += `\n👤 **HOD:** ${d.hod || 'N/A'}`;
        }
        if (isCoursesReq || isOverviewReq || requestedAspects.length === 0) {
          answerText += `\n🎓 **Programmes:** ${d.programmes.join(', ')}`;
        }
        if (isContactReq || isOverviewReq || requestedAspects.length === 0) {
          answerText += `\n📞 **Phone:** ${d.contact?.phone || 'N/A'}\n✉️ **Email:** ${d.contact?.email || 'N/A'}`;
        }

        return {
          answer: answerText,
          language: lang,
          intent: 'department_overview',
          intentCategory: 'INFORMATION',
          responsibleUnit: { name: d.name, type: 'department', location: d.location },
          location: {
            name: d.name,
            campus: deptCampus,
            building: d.building,
            address: deptAddress,
            landmark: d.landmark || deptCampus,
            mapLink: deptMapsUrl,
            googleMapsUrl: deptMapsUrl,
            coordinates: d.coordinates
          },
          contact: { phone: d.contact?.phone, email: d.contact?.email, officialWebsite: d.officialSourceUrl },
          display: {
            responsibleUnit: true,
            location: isLocationReq || isOverviewReq || requestedAspects.length === 0,
            contact: isContactReq || isOverviewReq || requestedAspects.length === 0,
            documents: false,
            nextSteps: false,
            sources: true,
            relatedTopics: false
          }
        };
      }

      // Single specific aspect requests:
      if (isLocationReq) {
        return {
          answer: isEnglish
            ? `The **${d.name}** is located at **${deptCampus}** (${d.building}).`
            : `**${d.name}** **${deptCampus}** (${d.building}) mein sthit hai.`,
          language: lang,
          intent: 'department_location',
          intentCategory: 'LOCATION',
          responsibleUnit: { name: d.name, type: 'department', location: d.location },
          location: {
            name: d.name,
            campus: deptCampus,
            building: d.building,
            address: deptAddress,
            landmark: d.landmark || deptCampus,
            mapLink: deptMapsUrl,
            googleMapsUrl: deptMapsUrl,
            coordinates: d.coordinates
          },
          display: { responsibleUnit: false, location: true, contact: false, documents: false, nextSteps: false, sources: true, relatedTopics: false }
        };
      }

      if (isHodReq) {
        return {
          answer: isEnglish
            ? `The Head of the **${d.name}** is **${d.hod || 'not currently available in records'}**.`
            : `**${d.name}** ke Head (HOD) **${d.hod || 'records mein available nahi hai'}** hain.`,
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
            : `**${d.name}** ka contact — Phone: **${d.contact?.phone || 'N/A'}**, Email: **${d.contact?.email || 'N/A'}**.`,
          language: lang,
          intent: 'department_contact',
          intentCategory: 'CONTACT',
          contact: { phone: d.contact?.phone, email: d.contact?.email, officialWebsite: d.officialSourceUrl },
          display: { responsibleUnit: true, location: false, contact: true, documents: false, nextSteps: false, sources: true, relatedTopics: false }
        };
      }

      if (isCoursesReq) {
        return {
          answer: isEnglish
            ? `The **${d.name}** offers: **${d.programmes.join(', ')}**.`
            : `**${d.name}** mein yeh programmes hain: **${d.programmes.join(', ')}**.`,
          language: lang,
          intent: 'department_courses',
          intentCategory: 'INFORMATION',
          responsibleUnit: { name: d.name, type: 'department', location: d.location },
          display: { responsibleUnit: true, location: false, contact: false, documents: false, nextSteps: false, sources: true, relatedTopics: false }
        };
      }
    }

    // ── Location match ───────────────────────────────────────────────────────
    if (matchedLocations.length > 0) {
      const l = matchedLocations[0];
      return {
        answer: isEnglish
          ? `**${l.name}** is located at ${l.building} (${l.landmark || 'Patharia Hills Campus'}).`
          : `**${l.name}** ${l.building} (${l.landmark || 'Patharia Hills Campus'}) mein sthit hai.`,
        language: lang, intent: 'location_info', intentCategory: 'LOCATION',
        location: { name: l.name, building: l.building, landmark: l.landmark, mapLink: l.mapLink },
        display: { responsibleUnit: false, location: true, contact: false, documents: false, nextSteps: false, sources: true, relatedTopics: false }
      };
    }

    // ── Office match ─────────────────────────────────────────────────────────
    if (matchedOffices.length > 0) {
      const o = matchedOffices[0];
      return {
        answer: isEnglish
          ? `**${o.name}** is located at ${o.location} (${o.building}). Office hours: ${o.officeHours}.`
          : `**${o.name}** ${o.location} (${o.building}) mein hai. Timing: ${o.officeHours}.`,
        language: lang, intent: 'office_info', intentCategory: 'INFORMATION',
        responsibleUnit: { name: o.name, type: 'office', location: o.location, officeHours: o.officeHours },
        display: { responsibleUnit: true, location: true, contact: false, documents: false, nextSteps: false, sources: true, relatedTopics: false }
      };
    }

    // ── Complete fallback — Gemini was unavailable and no match found ─────────
    return {
      answer: isEnglish
        ? `I'm having trouble connecting to the assistant right now. Please try again in a moment. You can also check **dhsgsu.edu.in** for official university information.`
        : `Abhi assistant se connect karne mein thodi dikkat aa rahi hai. Kripya thodi der baad try karein. Aap official website **dhsgsu.edu.in** bhi dekh sakte hain.`,
      language: lang,
      intent: 'service_unavailable',
      intentCategory: 'INFORMATION',
      sources: [{ title: 'DHSGSU Official Website', url: 'https://dhsgsu.edu.in', sourceType: 'official', verified: true }],
      display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: true, relatedTopics: false }
    };
  }
}

export const geminiService = new GeminiService();
