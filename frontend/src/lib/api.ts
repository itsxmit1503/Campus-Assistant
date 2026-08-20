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

function detectClientLanguage(text: string, history: Array<{ role: 'user' | 'assistant'; content: string }> = []): 'hinglish' | 'hindi' | 'english' {
  if (/[\u0900-\u097F]/.test(text)) return 'hindi';

  const hinglishMarkers = [
    'kuch', 'nahi', 'nhi', 'bas', 'checkout', 'check', 'rha', 'rhi', 'raha', 'rahi', 'hu', 'hoon', 'hai', 'hain',
    'kya', 'kaha', 'kahan', 'kidhar', 'kaise', 'kaun', 'kyun', 'kyu', 'kab', 'bhai', 'yaar', 'batao', 'bata',
    'dekh', 'dekhte', 'chal', 'chl', 'samajh', 'pata', 'chahiye', 'karna', 'kare', 'karu', 'karein', 'jana',
    'jaun', 'padega', 'milega', 'mili', 'aaya', 'aayi', 'paisa', 'scene', 'acha', 'achha', 'theek', 'thik',
    'haan', 'sahi', 'leke', 'saath', 'bhi', 'se', 'ko', 'me', 'mein', 'par', 'pe', 'toh', 'to', 'ho', 'gaya',
    'gayi', 'hoga', 'hogi', 'rakha', 'mera', 'meri', 'mere', 'tera', 'teri', 'tere', 'apna', 'apni', 'waise',
    'chalo', 'dikha', 'du', 'do'
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
  const isHinglish = detectedLang === 'hinglish';
  const isHindi = detectedLang === 'hindi';

  const lastUserMsg = conversationHistory.filter(m => m.role === 'user').slice(-2, -1)[0]?.content.toLowerCase() || '';
  const lastAssistantMsg = conversationHistory.filter(m => m.role === 'assistant').slice(-1)[0]?.content.toLowerCase() || '';

  // 1. GREETING
  if (/^(hey|hello|hi|hiya|namaste|what's up|good morning|hey there)(\s|!|\.|\?)*$/i.test(q)) {
    let answer = `Hey! 👋 How can I help you around DHSGSU?`;
    if (isHindi) answer = `नमस्ते! 👋 DHSGSU कैंपस में आपकी क्या सहायता करूँ?`;
    else if (isHinglish) answer = `Hey! 👋 Batao, campus mein kis cheez mein help chahiye?`;

    return {
      answer,
      language: detectedLang,
      intent: 'greeting',
      intentCategory: 'GREETING',
      display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: false, relatedTopics: false }
    };
  }

  // 2. CASUAL TESTING / CHECKOUT
  if (
    /\b(checkout|check|test|testing|chal rha|chal raha|chl rha|chl raha|dekh rha|dekh raha|dekhte|working|kaam kar|aise hi)\b/i.test(q) ||
    q.includes('kuch nahi bas') || q.includes('kuch nhi bas')
  ) {
    let answer = `Haha, yep, it's working smoothly 😄\nWhenever you're ready, feel free to ask anything about the campus.`;
    if (isHindi) answer = `हाँ, बिल्कुल चालू है 😄 जब भी कुछ पूछना हो, निसंकोच बताइएगा।`;
    else if (isHinglish) answer = `Haha, haan bhai, bilkul chal raha hai 😄\nJab bhi campus se juda kuch poochna ho, bas bol dena.`;

    return {
      answer,
      language: detectedLang,
      intent: 'casual_testing',
      intentCategory: 'CASUAL_CONVERSATION',
      display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: false, relatedTopics: false }
    };
  }

  // 3. ACKNOWLEDGEMENTS
  if (/^(acha|achha|ok|okay|theek hai|thik hai|got it|sahi hai|fine|cool|alright|hmm|accha)(\s|!|\.|\?)*$/i.test(q)) {
    return {
      answer: q === 'acha' || q === 'achha' ? `Haan 😄` : `👍`,
      language: detectedLang,
      intent: 'acknowledgement',
      intentCategory: 'CASUAL_CONVERSATION',
      display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: false, relatedTopics: false }
    };
  }

  // 4. THANKS
  if (/\b(thanks|thank you|thx|dhanyawad|shukriya)\b/i.test(q)) {
    return {
      answer: isHinglish ? `Anytime bhai! 😊 Kabhi bhi kuch pooch lena.` : `You're welcome! 😊`,
      language: detectedLang,
      intent: 'thanks',
      intentCategory: 'CASUAL_CONVERSATION',
      display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: false, relatedTopics: false }
    };
  }

  // 5. PROBLEM: Scholarship
  if (q.includes('scholarship') && (q.includes('nahi aayi') || q.includes('pending') || q.includes('paisa') || q.includes('kya karu') || q.includes('scene'))) {
    let answer = `Sure, I can help you figure that out. Has the scholarship already been approved, or is the application still pending on the portal?`;
    if (isHinglish) answer = `Haan, dekhte hain. Scholarship approve ho chuki hai ya abhi portal par pending dikha rahi hai?`;
    else if (isHindi) answer = `ज़रूर। क्या आपकी छात्रवृत्ति पोर्टल पर स्वीकृत (Approved) हो चुकी है, या अभी पेंडिंग है?`;

    return {
      answer,
      language: detectedLang,
      intent: 'scholarship_triage',
      intentCategory: 'PROBLEM_SOLVING',
      display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: false, relatedTopics: false }
    };
  }

  // 6. FOLLOW-UP: "Approved hai" / "Kahan jana hai"
  if (
    q.includes('approved') || q.includes('approve ho gaya') || q.includes('kahan jana') || q.includes('kaha jana') || q.includes('where to go') ||
    ((q === 'haan' || q === 'yes') && (lastAssistantMsg.includes('where to go') || lastAssistantMsg.includes('kahan jaana')))
  ) {
    const office = officesData.find(o => o.id === 'office-scholarship-cell')!;
    const loc = locationsData.find(l => l.id === 'loc-admin-block')!;
    let answer = `For this, visit the **University Scholarship Cell** located in **Room No. 12, Main Administrative Block**.`;
    if (isHinglish) answer = `Iske liye aapko **University Scholarship Cell (Administrative Block, Room No. 12)** jaana hoga.`;
    else if (isHindi) answer = `इसके लिए आपको **University Scholarship Cell (प्रशासनिक भवन, कमरा नंबर 12)** में जाना होगा।`;

    return {
      answer,
      language: detectedLang,
      intent: 'scholarship_location',
      intentCategory: 'LOCATION',
      responsibleUnit: { name: office.name, type: 'office', location: office.location },
      location: { name: loc.name, building: loc.building, floor: 'Ground Floor (Room 12)', landmark: loc.landmark, mapLink: loc.mapLink },
      display: { responsibleUnit: true, location: true, contact: false, documents: false, nextSteps: true, sources: true, relatedTopics: false }
    };
  }

  // 7. LOCATION: Library
  if (q.includes('library kaha') || q.includes('library kahan') || q.includes('library kidhar') || q.includes('where is the library')) {
    const loc = locationsData.find(l => l.id === 'loc-central-library')!;
    let answer = `The Central Library is on the DHSGSU campus (between Arts and Science blocks). Want me to show you the location on the map?`;
    if (isHinglish) answer = `Central Library Arts aur Science blocks ke beech mein campus ke central area mein hai. Chaho toh location dikha du?`;

    return {
      answer,
      language: detectedLang,
      intent: 'library_location',
      intentCategory: 'LOCATION',
      location: { name: loc.name, building: loc.building, landmark: loc.landmark, mapLink: loc.mapLink },
      display: { responsibleUnit: false, location: true, contact: false, documents: false, nextSteps: false, sources: true, relatedTopics: false }
    };
  }

  // Default clean conversational response
  return {
    answer: isHinglish
      ? `Haan, batao campus mein kis cheez ke baare mein janna hai?`
      : `I can help you around DHSGSU. What would you like to know?`,
    language: detectedLang,
    intent: 'general_assistance',
    intentCategory: 'CASUAL_CONVERSATION',
    display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: false, relatedTopics: false }
  };
}
