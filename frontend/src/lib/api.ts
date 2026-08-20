import { StructuredAnswer } from '../types';
import { servicesData, officesData, departmentsData, locationsData } from '../data';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function sendChatMessage(
  message: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [],
  language: string = 'auto'
): Promise<StructuredAnswer> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        conversationHistory,
        language
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`API responded with status: ${res.status}`);
    }

    const data: StructuredAnswer = await res.json();
    return data;
  } catch (error) {
    console.warn('[Frontend API] Backend unreachable or offline, using client-side router:', error);
    return getLocalKnowledgeAnswer(message, language, conversationHistory);
  }
}

/**
 * Client-side progressive router matching human-like conversation
 */
function getLocalKnowledgeAnswer(
  query: string, 
  lang = 'auto', 
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
): StructuredAnswer {
  const q = query.toLowerCase().trim();
  const isHindiOrHinglish = /[\u0900-\u097F]/.test(query) || 
    /\b(kaha|kahan|kya|hai|kare|batao|nahi|chahiye|chal|rha|rhi|dekh|acha|haan|theek|bhai|kaise|milega|jana|paisa|pata|jana|suvidha)\b/i.test(q);

  const lastUserMsg = conversationHistory.filter(m => m.role === 'user').slice(-2, -1)[0]?.content.toLowerCase() || '';
  const lastAssistantMsg = conversationHistory.filter(m => m.role === 'assistant').slice(-1)[0]?.content.toLowerCase() || '';

  // 1. GREETING
  if (/^(hey|hello|hi|hiya|namaste|what's up|good morning|hey there)(\s|!|\.|\?)*$/i.test(q)) {
    return {
      answer: isHindiOrHinglish ? `Hey! 👋 DHSGSU कैंपस में आपकी क्या मदद करूँ?` : `Hey! 👋 How can I help you around DHSGSU?`,
      language: isHindiOrHinglish ? 'Hinglish' : 'English',
      intent: 'greeting',
      intentCategory: 'GREETING',
      display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: false, relatedTopics: false }
    };
  }

  // 2. CASUAL TESTING
  if (/\b(check|test|working|chal rha|chal raha|dekh raha|dekh rha|kuch nahi bas|bas aise hi|testing)\b/i.test(q)) {
    return {
      answer: isHindiOrHinglish 
        ? `Haha, haan, bilkul chal raha hai 😄\nJab bhi kuch poochna ho, bas puch lena.`
        : `Haha, yep, it's working smoothly 😄\nWhenever you're ready, feel free to ask anything about the campus.`,
      language: isHindiOrHinglish ? 'Hinglish' : 'English',
      intent: 'casual_testing',
      intentCategory: 'CASUAL_CONVERSATION',
      display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: false, relatedTopics: false }
    };
  }

  // 3. ACKNOWLEDGEMENTS
  if (/^(acha|achha|ok|okay|theek hai|thik hai|got it|sahi hai|fine|cool|alright|hmm|accha)(\s|!|\.|\?)*$/i.test(q)) {
    return {
      answer: `👍`,
      language: isHindiOrHinglish ? 'Hinglish' : 'English',
      intent: 'acknowledgement',
      intentCategory: 'CASUAL_CONVERSATION',
      display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: false, relatedTopics: false }
    };
  }

  // 4. THANKS
  if (/\b(thanks|thank you|thx|dhanyawad|shukriya)\b/i.test(q)) {
    return {
      answer: isHindiOrHinglish ? `You're welcome! 😊` : `You're welcome! 😊`,
      language: isHindiOrHinglish ? 'Hinglish' : 'English',
      intent: 'thanks',
      intentCategory: 'CASUAL_CONVERSATION',
      display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: false, relatedTopics: false }
    };
  }

  // 5. PROBLEM: Scholarship
  if (q.includes('scholarship') && (q.includes('nahi aayi') || q.includes('pending') || q.includes('paisa') || q.includes('kya karu'))) {
    return {
      answer: isHindiOrHinglish
        ? `Sure, I can help you figure that out. Has the scholarship already been approved, or is the application still pending on the portal?`
        : `Sure, I can help you figure that out. Has your scholarship already been approved, or is the application still showing as pending?`,
      language: isHindiOrHinglish ? 'Hinglish' : 'English',
      intent: 'scholarship_triage',
      intentCategory: 'PROBLEM_SOLVING',
      display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: false, relatedTopics: false }
    };
  }

  // 6. FOLLOW-UP: "Approved hai" / "Kahan jana hai"
  if (
    q.includes('approved') || q.includes('kahan jana') || q.includes('kaha jana') || q.includes('where to go') ||
    ((q === 'haan' || q === 'yes') && lastAssistantMsg.includes('where to go'))
  ) {
    const office = officesData.find(o => o.id === 'office-scholarship-cell')!;
    const loc = locationsData.find(l => l.id === 'loc-admin-block')!;
    return {
      answer: isHindiOrHinglish
        ? `Iske liye aapko **University Scholarship Cell (Administrative Block, Room No. 12)** jaana hoga.`
        : `For this, visit the **University Scholarship Cell** located in **Room No. 12, Main Administrative Block**.`,
      language: isHindiOrHinglish ? 'Hinglish' : 'English',
      intent: 'scholarship_location',
      intentCategory: 'LOCATION',
      responsibleUnit: { name: office.name, type: 'office', location: office.location },
      location: { name: loc.name, building: loc.building, floor: 'Ground Floor (Room 12)', landmark: loc.landmark, mapLink: loc.mapLink },
      display: { responsibleUnit: true, location: true, contact: false, documents: false, nextSteps: true, sources: true, relatedTopics: false }
    };
  }

  // 7. LOCATION: Library
  if (q.includes('library kaha') || q.includes('library kahan') || q.includes('where is the library')) {
    const loc = locationsData.find(l => l.id === 'loc-central-library')!;
    return {
      answer: isHindiOrHinglish
        ? `The Central Library is on the DHSGSU campus (between Arts and Science blocks). Want me to show you the location?`
        : `The Central Library is centrally located between Arts and Science blocks. Want me to show you the location on the map?`,
      language: isHindiOrHinglish ? 'Hinglish' : 'English',
      intent: 'library_location',
      intentCategory: 'LOCATION',
      location: { name: loc.name, building: loc.building, landmark: loc.landmark, mapLink: loc.mapLink },
      display: { responsibleUnit: false, location: true, contact: false, documents: false, nextSteps: false, sources: true, relatedTopics: false }
    };
  }

  // Default clean conversational response
  return {
    answer: isHindiOrHinglish
      ? `Haan, bataiye campus mein kis cheez ke baare mein janna hai?`
      : `I can help you around DHSGSU. What would you like to know?`,
    language: isHindiOrHinglish ? 'Hinglish' : 'English',
    intent: 'general_assistance',
    intentCategory: 'CASUAL_CONVERSATION',
    display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: false, relatedTopics: false }
  };
}
