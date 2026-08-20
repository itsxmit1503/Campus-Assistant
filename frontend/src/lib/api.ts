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

function detectClientLanguage(text: string, history: Array<{ role: 'user' | 'assistant'; content: string }> = []): 'hinglish' | 'hindi' | 'english' | 'bengali' | 'marathi' | 'tamil' {
  if (/[\u0980-\u09FF]/.test(text)) return 'bengali';
  if (/[\u0B80-\u0BFF]/.test(text)) return 'tamil';
  if (/[\u0900-\u097F]/.test(text)) {
    if (/\b(कुठे|आहे|नाही|काय)\b/.test(text)) return 'marathi';
    return 'hindi';
  }

  const hinglishMarkers = [
    'kuch', 'nahi', 'nhi', 'bas', 'checkout', 'check', 'rha', 'rhi', 'raha', 'rahi', 'hu', 'hoon', 'hai', 'hain',
    'kya', 'kaha', 'kahan', 'kidhar', 'kaise', 'kaun', 'kyun', 'kyu', 'kab', 'bhai', 'yaar', 'batao', 'bata',
    'dekh', 'dekhte', 'chal', 'chl', 'samajh', 'pata', 'chahiye', 'karna', 'kare', 'karu', 'karein', 'jana',
    'jaun', 'padega', 'milega', 'mili', 'aaya', 'aayi', 'paisa', 'scene', 'acha', 'achha', 'theek', 'thik',
    'haan', 'sahi', 'leke', 'saath', 'bhi', 'se', 'ko', 'me', 'mein', 'par', 'pe', 'toh', 'to', 'ho', 'gaya',
    'gayi', 'hoga', 'hogi', 'rakha', 'mera', 'meri', 'mere', 'tera', 'teri', 'tere', 'apna', 'apni', 'waise',
    'chalo', 'dikha', 'du', 'do', 'bol', 'bolo', 'haal', 'badhiya'
  ];

  const words = text.toLowerCase().split(/[\s,?.!]+/);
  if (words.some(w => hinglishMarkers.includes(w))) return 'hinglish';

  if (words.length <= 2 && history.length > 0) {
    const last = history.filter(h => h.role === 'user').slice(-2, -1)[0]?.content.toLowerCase() || '';
    if (last.split(/[\s,?.!]+/).some(w => hinglishMarkers.includes(w))) return 'hinglish';
  }

  return 'english';
}

function getLocalKnowledgeAnswer(
  query: string, 
  lang = 'auto', 
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
): StructuredAnswer {
  const q = query.toLowerCase().trim();
  const detectedLang = detectClientLanguage(query, conversationHistory);

  const lastUserMsg = conversationHistory.filter(m => m.role === 'user').slice(-2, -1)[0]?.content.toLowerCase() || '';
  const lastAssistantMsg = conversationHistory.filter(m => m.role === 'assistant').slice(-1)[0]?.content.toLowerCase() || '';

  // 1. PLAYFUL COMMANDS / CHAT ("hello bol", "bol na", "kya haal")
  if (/\b(hello bol|bol na|bol re|kuch bol|kya haal|kya hal|aur bata|aur bhai|kya scene)\b/i.test(q)) {
    let answer = `Hello 😄`;
    if (q.includes('kya haal') || q.includes('aur bata')) answer = `Sab badhiya! Batao 😄`;
    return {
      answer,
      language: detectedLang,
      intent: 'casual_social',
      intentCategory: 'CASUAL_CONVERSATION',
      display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: false, relatedTopics: false }
    };
  }

  // 2. GREETINGS
  if (/^(hey|hello|hi|hiya|namaste|what's up|good morning|hey there)(\s|!|\.|\?)*$/i.test(q)) {
    return {
      answer: `Hey! 👋`,
      language: detectedLang,
      intent: 'greeting',
      intentCategory: 'GREETING',
      display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: false, relatedTopics: false }
    };
  }

  // 3. ACKNOWLEDGEMENTS / THINKING
  if (/^(hmm|hmmm|hmmmm|acha|achha|ok|okay|theek hai|thik hai|theek|got it|sahi hai|fine|cool|alright|nice|great|haan)(\s|!|\.|\?)*$/i.test(q)) {
    let answer = `😄`;
    if (q === 'acha' || q === 'achha') answer = `haan 😄`;
    else if (q === 'theek hai' || q === 'thik hai' || q === 'theek') answer = `Theek hai 👍`;
    else if (q === 'ok' || q === 'okay' || q === 'cool') answer = `👍`;

    return {
      answer,
      language: detectedLang,
      intent: 'acknowledgement',
      intentCategory: 'CASUAL_CONVERSATION',
      display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: false, relatedTopics: false }
    };
  }

  // 4. CASUAL TESTING
  if (
    /\b(checkout|check|test|testing|chal rha|chal raha|chl rha|chl raha|dekh rha|dekh raha|dekhte|working|kaam kar|aise hi)\b/i.test(q) ||
    q.includes('kuch nahi bas') || q.includes('kuch nhi bas')
  ) {
    let answer = `Haha, fair enough 😄`;
    if (q.includes('chal raha') || q.includes('chl rha') || q.includes('checkout')) {
      answer = `Haha, haan, chal raha hai 😄`;
    }

    return {
      answer,
      language: detectedLang,
      intent: 'casual_testing',
      intentCategory: 'CASUAL_CONVERSATION',
      display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: false, relatedTopics: false }
    };
  }

  // 5. THANKS
  if (/\b(thanks|thank you|thx|dhanyawad|shukriya)\b/i.test(q)) {
    return {
      answer: `Anytime 😄`,
      language: detectedLang,
      intent: 'thanks',
      intentCategory: 'CASUAL_CONVERSATION',
      display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: false, relatedTopics: false }
    };
  }

  // 6. LOCATION: Library
  if (q.includes('library') || q.includes('লাইব্রেরি') || q.includes('लायब्ररी')) {
    const loc = locationsData.find(l => l.id === 'loc-central-library')!;
    let answer = `Haan, Central Library campus mein hai. Exact location bhi dikha du?`;
    if (detectedLang === 'english') answer = `The Central Library is on campus between Arts and Science faculties. Want me to show you the location on the map?`;

    return {
      answer,
      language: detectedLang,
      intent: 'library_location',
      intentCategory: 'LOCATION',
      location: { name: loc.name, building: loc.building, landmark: loc.landmark, mapLink: loc.mapLink },
      display: { responsibleUnit: false, location: true, contact: false, documents: false, nextSteps: false, sources: true, relatedTopics: false }
    };
  }

  // 7. PROBLEM: Scholarship
  if (q.includes('scholarship') && (q.includes('nahi aayi') || q.includes('pending') || q.includes('paisa') || q.includes('scene'))) {
    return {
      answer: `Achha, scholarship approve ho chuki hai ya abhi pending hai?`,
      language: detectedLang,
      intent: 'scholarship_triage',
      intentCategory: 'PROBLEM_SOLVING',
      display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: false, relatedTopics: false }
    };
  }

  // Natural Human Help-Desk Fallback (Never robotic)
  return {
    answer: detectedLang === 'english' ? `Sure, go ahead 😄` : `Haan bolo 😄`,
    language: detectedLang,
    intent: 'casual_chat',
    intentCategory: 'CASUAL_CONVERSATION',
    display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: false, relatedTopics: false }
  };
}
