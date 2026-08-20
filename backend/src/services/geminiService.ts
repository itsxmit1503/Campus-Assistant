import { GoogleGenerativeAI } from '@google/generative-ai';
import crypto from 'crypto';
import { config } from '../config/env.js';
import { StructuredAnswer, ChatRequest } from '../types/index.js';
import { knowledgeService } from './knowledgeService.js';
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

    // ── STEP 4: Retrieve relevant university context from knowledge base ──────
    console.log(`[CHAT] Knowledge retrieval started`);
    const targetedContext = knowledgeService.getCompactContextForQuery(cleanMsg, conversationHistory);
    const userLang = detectLanguage(cleanMsg, conversationHistory);
    console.log(`[CHAT] Knowledge context prepared (detected language: ${userLang})`);

    // ── STEP 5: Prepare conversation history for Gemini ───────────────────────
    const boundedHistory = conversationHistory.slice(-8);
    const historySummary = boundedHistory
      .map(h => `${h.role === 'user' ? 'Student' : 'Assistant'}: ${h.content}`)
      .join('\n');

    // ── STEP 6: Build the system prompt ──────────────────────────────────────
    const systemPrompt = `You are a friendly, knowledgeable university help-desk assistant at Dr. Harisingh Gour Vishwavidyalaya (DHSGSU), Sagar, Madhya Pradesh, India.
A student is talking with you directly. Behave like a real, helpful person sitting at the campus help desk — not a scripted chatbot.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORE CONVERSATIONAL RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. UNDERSTAND WHAT THE STUDENT ACTUALLY SAID.
   - Read the message fully. Understand the intent, not just the words.
   - Do NOT respond based on language alone. Language = how to communicate. Intent = what to communicate.

2. RESPOND TO THE ACTUAL MESSAGE.
   - If the student says "hey" → greet them naturally.
   - If the student says "umm just checking" → respond naturally (e.g., "Haha, no worries 😄 Take your time.").
   - If the student asks "what can you help with?" → actually explain your capabilities.
   - If the student asks about a department → provide actual department information.
   - NEVER respond with "Haan bolo", "Sure, go ahead", or "How can I help?" when the student has already asked a specific question.

3. CAPABILITIES (use this when the student asks what you can do):
   "I can help with things around DHSGSU like finding departments and offices, admission and exam-related info, scholarships, hostels, library, documents, contacts, campus facilities, and where to go for any specific problem. Ask me anything!"
   (Adjust the language and tone to match the student.)

4. LANGUAGE MIRRORING — CRITICAL:
   - Detect the student's language from their message.
   - Respond FULLY in that same language.
   - English message → English response.
   - Hindi message → Hindi response.
   - Hinglish message → Hinglish response.
   - Bengali message → Bengali response.
   - Marathi message → Marathi response.
   - Gujarati message → Gujarati response.
   - Tamil message → Tamil response.
   - Telugu message → Telugu response.
   - Kannada message → Kannada response.
   - ANY other Indian language → respond in that language.
   - Do NOT translate into English unless the student is writing in English.
   - If the student code-switches (mixes languages), mirror that mix naturally.

5. CONVERSATION CONTEXT AND FOLLOW-UPS:
   - Study the conversation history carefully.
   - Resolve follow-up references using context.
     Examples:
       - "hod kaun hai?" after discussing Physics → answer Physics HOD.
       - "aur contact?" after giving library location → give library contact.
       - "timing kya hai?" after library discussion → give library timing.
   - Do NOT ask "which department?" if the context already makes it clear.

6. NO HALLUCINATIONS:
   - Use ONLY verified information from the DHSGSU CONTEXT section below.
   - If a specific detail (phone, email, room number, timing) is not in the context, say:
     "Verified information for that detail is currently not available in university records."
   - Do NOT invent names, numbers, emails, locations, HODs, fees, or deadlines.

7. RESPONSE LENGTH MATCHING:
   - Simple greeting ("hey") → very short natural reply.
   - Location question → concise answer with relevant detail.
   - "Tell me everything about X department" → comprehensive structured overview.
   - Problem situation ("scholarship nahi aayi") → helpful explanation of steps + office.
   - Do NOT dump the entire database for a simple question.
   - Do NOT give one sentence for a "tell me everything" request.

8. CASUAL CONVERSATION:
   - Match the student's tone. Be relaxed for casual messages, helpful for questions, clear for serious problems.
   - Do NOT force every response toward university services.
   - If someone is just chatting, chat naturally. You can offer assistance when it feels natural, not after every single response.

9. STRUCTURED DATA FLAGS:
   - Set "display.location = true" only if the student is asking about a location/directions.
   - Set "display.contact = true" only if the student wants contact details.
   - Set "display.documents = true" only if documents are relevant.
   - Set "display.responsibleUnit = true" only if identifying a responsible office/dept adds value.
   - Set "display.sources = true" for verified university factual answers.
   - For pure casual conversation, set ALL display flags to false.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VERIFIED DHSGSU CAMPUS CONTEXT (USE THIS — DO NOT INVENT)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${targetedContext}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DETECTED STUDENT LANGUAGE: ${userLang}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Respond STRICTLY in this JSON format:
{
  "answer": "Your natural, helpful response in the student's language.",
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

For university information fields (responsibleUnit, location, contact), use this structure when relevant:
  "responsibleUnit": { "name": "...", "type": "department|office", "location": "...", "officeHours": "..." }
  "location": { "name": "...", "building": "...", "floor": "...", "landmark": "...", "mapLink": "..." }
  "contact": { "phone": "...", "helpline": "...", "email": "...", "officialWebsite": "..." }
  "sources": [{ "title": "...", "url": "...", "sourceType": "official", "verified": true }]

Set null for any field that is not applicable to this response.`;

    const fullPrompt = `${systemPrompt}

${historySummary ? `Recent Conversation History:\n${historySummary}\n` : ''}Current Student Message: "${cleanMsg}"`;

    // ── STEP 7: Call Gemini ───────────────────────────────────────────────────
    try {
      console.log(`[CHAT] Gemini request started`);

      const model = this.genAI.getGenerativeModel({
        model: 'gemini-3.5-flash',
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 900,
          responseMimeType: 'application/json'
        }
      });

      const result = await model.generateContent(fullPrompt);
      const text = result.response.text();

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
      const isLocationReq = /\b(kaha|kahan|kidhar|where|location|building|map)\b/i.test(query);
      const isHodReq = /\b(hod|head|kaun hai|who is|adhyaksh)\b/i.test(query);
      const isContactReq = /\b(contact|number|phone|email)\b/i.test(query);
      const isCoursesReq = /\b(course|courses|programme|programmes|degree|branch)\b/i.test(query);

      if (isLocationReq) {
        return {
          answer: isEnglish
            ? `The **${d.name}** is located at ${d.location || d.building}.`
            : `**${d.name}** ${d.location || d.building} mein sthit hai.`,
          language: lang, intent: 'department_location', intentCategory: 'LOCATION',
          location: { name: d.building || d.name, building: d.building, landmark: 'DHSGSU Campus', mapLink: d.mapLink },
          display: { responsibleUnit: false, location: true, contact: false, documents: false, nextSteps: false, sources: true, relatedTopics: false }
        };
      }
      if (isHodReq) {
        return {
          answer: isEnglish
            ? `The Head of the **${d.name}** is **${d.hod || 'not currently available in records'}**.`
            : `**${d.name}** ke Head (HOD) **${d.hod || 'records mein available nahi hai'}** hain.`,
          language: lang, intent: 'department_hod', intentCategory: 'INFORMATION',
          responsibleUnit: { name: d.name, type: 'department', location: d.location },
          display: { responsibleUnit: true, location: false, contact: false, documents: false, nextSteps: false, sources: true, relatedTopics: false }
        };
      }
      if (isContactReq) {
        return {
          answer: isEnglish
            ? `Contact for **${d.name}**: Phone: **${d.contact?.phone || 'N/A'}**, Email: **${d.contact?.email || 'N/A'}**.`
            : `**${d.name}** ka contact — Phone: **${d.contact?.phone || 'N/A'}**, Email: **${d.contact?.email || 'N/A'}**.`,
          language: lang, intent: 'department_contact', intentCategory: 'CONTACT',
          contact: { phone: d.contact?.phone, email: d.contact?.email, officialWebsite: d.officialSourceUrl },
          display: { responsibleUnit: true, location: false, contact: true, documents: false, nextSteps: false, sources: true, relatedTopics: false }
        };
      }
      if (isCoursesReq) {
        return {
          answer: isEnglish
            ? `The **${d.name}** offers: **${d.programmes.join(', ')}**.`
            : `**${d.name}** mein yeh programmes hain: **${d.programmes.join(', ')}**.`,
          language: lang, intent: 'department_courses', intentCategory: 'INFORMATION',
          responsibleUnit: { name: d.name, type: 'department', location: d.location },
          display: { responsibleUnit: true, location: false, contact: false, documents: false, nextSteps: false, sources: true, relatedTopics: false }
        };
      }

      // Full department overview
      const overview = isEnglish
        ? `**${d.name}** (${d.schoolName})\n\n📍 **Location:** ${d.location || d.building}\n👤 **HOD:** ${d.hod || 'N/A'}\n🎓 **Programmes:** ${d.programmes.join(', ')}\n📞 **Phone:** ${d.contact?.phone || 'N/A'}\n✉️ **Email:** ${d.contact?.email || 'N/A'}`
        : `**${d.name}** (${d.schoolName})\n\n📍 **Location:** ${d.location || d.building}\n👤 **HOD:** ${d.hod || 'N/A'}\n🎓 **Programmes:** ${d.programmes.join(', ')}\n📞 **Phone:** ${d.contact?.phone || 'N/A'}\n✉️ **Email:** ${d.contact?.email || 'N/A'}`;

      return {
        answer: overview,
        language: lang, intent: 'department_overview', intentCategory: 'INFORMATION',
        responsibleUnit: { name: d.name, type: 'department', location: d.location },
        location: { name: d.building || d.name, building: d.building, mapLink: d.mapLink },
        contact: { phone: d.contact?.phone, email: d.contact?.email, officialWebsite: d.officialSourceUrl },
        display: { responsibleUnit: true, location: true, contact: true, documents: false, nextSteps: false, sources: true, relatedTopics: false }
      };
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
