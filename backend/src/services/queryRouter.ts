import { StructuredAnswer } from '../types/index.js';
import { knowledgeService } from './knowledgeService.js';

export type RouteType = 
  | 'GREETING'
  | 'CASUAL_SOCIAL'
  | 'CASUAL_CHAT'
  | 'TESTING'
  | 'ACKNOWLEDGEMENT'
  | 'THANKS'
  | 'FAREWELL'
  | 'LANGUAGE_QUERY'
  | 'CAPABILITIES'
  | 'LOCATION'
  | 'CONTACT'
  | 'DOCUMENTS'
  | 'PROBLEM_TRIAGE'
  | 'FOLLOW_UP'
  | 'CURRENT_WEB_QUERY'
  | 'COMPLEX_REASONING';

export interface RouteDecision {
  route: RouteType;
  requiresGemini: boolean;
  requiresWebSearch: boolean;
  deterministicResponse?: StructuredAnswer;
}

export function detectLanguage(text: string, history: Array<{ role: 'user' | 'assistant'; content: string }> = []): string {
  if (/[\u0980-\u09FF]/.test(text)) return 'bengali';
  if (/[\u0A00-\u0A7F]/.test(text)) return 'punjabi';
  if (/[\u0A80-\u0AFF]/.test(text)) return 'gujarati';
  if (/[\u0B00-\u0B7F]/.test(text)) return 'odia';
  if (/[\u0B80-\u0BFF]/.test(text)) return 'tamil';
  if (/[\u0C00-\u0C7F]/.test(text)) return 'telugu';
  if (/[\u0C80-\u0CFF]/.test(text)) return 'kannada';
  if (/[\u0D00-\u0D7F]/.test(text)) return 'malayalam';
  if (/[\u0900-\u097F]/.test(text)) {
    if (/\b(कुठे|आहे|नाही|काय|कसे|सांगा|धन्यवाद)\b/.test(text)) return 'marathi';
    return 'hindi';
  }

  const hinglishMarkers = [
    'kuch', 'nahi', 'nhi', 'bas', 'checkout', 'check', 'rha', 'rhi', 'raha', 'rahi', 'hu', 'hoon', 'hai', 'hain',
    'kya', 'kaha', 'kahan', 'kidhar', 'kaise', 'kaun', 'kyun', 'kyu', 'kab', 'bhai', 'yaar', 'batao', 'bata',
    'dekh', 'dekhte', 'chal', 'chl', 'samajh', 'pata', 'chahiye', 'karna', 'kare', 'karu', 'karein', 'jana',
    'jaun', 'padega', 'milega', 'mili', 'aaya', 'aayi', 'paisa', 'scene', 'acha', 'achha', 'theek', 'thik',
    'haan', 'sahi', 'leke', 'saath', 'bhi', 'se', 'ko', 'me', 'mein', 'par', 'pe', 'toh', 'to', 'ho', 'gaya',
    'gayi', 'hoga', 'hogi', 'rakha', 'mera', 'meri', 'mere', 'tera', 'teri', 'tere', 'apna', 'apni', 'waise',
    'chalo', 'dikha', 'du', 'do', 'bol', 'bolo', 'haal', 'kaise', 'badhiya'
  ];

  const words = text.toLowerCase().split(/[\s,?.!]+/);
  if (words.some(w => hinglishMarkers.includes(w))) return 'hinglish';

  if (words.length <= 2 && history.length > 0) {
    const last = history.filter(h => h.role === 'user').slice(-2, -1)[0]?.content.toLowerCase() || '';
    if (last.split(/[\s,?.!]+/).some(w => hinglishMarkers.includes(w))) return 'hinglish';
  }

  return 'english';
}

export function routeQuery(
  query: string,
  lang = 'auto',
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
): RouteDecision {
  const q = query.toLowerCase().trim();
  const detectedLang = detectLanguage(query, conversationHistory);

  const lastUserMsg = conversationHistory.filter(m => m.role === 'user').slice(-2, -1)[0]?.content.toLowerCase() || '';
  const lastAssistantMsg = conversationHistory.filter(m => m.role === 'assistant').slice(-1)[0]?.content.toLowerCase() || '';

  // 1. PLAYFUL COMMANDS / CHAT ("hello bol", "bol na", "kuch bol", "kya haal", "aur bata", "kya scene hai")
  if (
    /\b(hello bol|bol na|bol re|kuch bol|kya haal|kya hal|aur bata|aur bhai|kya chal raha|sab badhiya|kya scene)\b/i.test(q)
  ) {
    let answer = `Hello 😄`;
    if (q.includes('kya haal') || q.includes('aur bata') || q.includes('sab badhiya')) {
      answer = `Sab badhiya! Batao 😄`;
    } else if (q.includes('hello bol')) {
      answer = `Hello 😄`;
    } else {
      answer = `Haan bolo 😄`;
    }

    return {
      route: 'CASUAL_SOCIAL',
      requiresGemini: false,
      requiresWebSearch: false,
      deterministicResponse: {
        answer,
        language: detectedLang,
        intent: 'casual_social',
        intentCategory: 'CASUAL_CONVERSATION',
        display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: false, relatedTopics: false }
      }
    };
  }

  // 2. GREETINGS ("hey", "hello", "hi", "namaste", "pranam")
  if (
    /^(hey|hello|hi|hiya|namaste|pranam|what's up|good morning|good afternoon|good evening|hey there|halo|kaise ho|নমস্কার|வணக்கம்|నమస్కారం|નમસ્તે|ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ|നമസ്കാരം)(\s|!|\.|\?)*$/i.test(q)
  ) {
    let answer = `Hey! 👋`;
    if (detectedLang === 'hindi') answer = `नमस्ते! 👋`;
    else if (detectedLang === 'bengali') answer = `নমস্কার! 👋`;
    else if (detectedLang === 'marathi') answer = `नमस्कार! 👋`;
    else if (detectedLang === 'tamil') answer = `வணக்கம்! 👋`;
    else if (detectedLang === 'telugu') answer = `నమస్కారం! 👋`;
    else if (detectedLang === 'gujarati') answer = `નમસ્તે! 👋`;
    else if (detectedLang === 'punjabi') answer = `ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! 👋`;

    return {
      route: 'GREETING',
      requiresGemini: false,
      requiresWebSearch: false,
      deterministicResponse: {
        answer,
        language: detectedLang,
        intent: 'greeting',
        intentCategory: 'GREETING',
        display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: false, relatedTopics: false }
      }
    };
  }

  // 3. ACKNOWLEDGEMENTS / THINKING ("hmm", "hmmm", "acha", "ok", "okay", "theek hai", "got it", "haan", "cool", "nice")
  if (
    /^(hmm|hmmm|hmmmm|acha|achha|ok|okay|theek hai|thik hai|theek|thik|got it|sahi hai|fine|cool|alright|nice|great|haan|sahi|होय|बरोबर|ঠিক আছে|சரி)(\s|!|\.|\?)*$/i.test(q)
  ) {
    let answer = `😄`;
    if (q.startsWith('hmm')) {
      answer = `😄`;
    } else if (q === 'acha' || q === 'achha') {
      answer = `haan 😄`;
    } else if (q === 'theek hai' || q === 'thik hai' || q === 'theek') {
      answer = `Theek hai 👍`;
    } else if (q === 'ok' || q === 'okay' || q === 'cool' || q === 'nice') {
      answer = `👍`;
    }

    return {
      route: 'ACKNOWLEDGEMENT',
      requiresGemini: false,
      requiresWebSearch: false,
      deterministicResponse: {
        answer,
        language: detectedLang,
        intent: 'acknowledgement',
        intentCategory: 'CASUAL_CONVERSATION',
        display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: false, relatedTopics: false }
      }
    };
  }

  // 4. CASUAL TESTING / META ("bas check kar raha hu", "testing", "dekh raha tha", "chal raha hai ki nahi")
  if (
    /\b(checkout|check|test|testing|chal rha|chal raha|chl rha|chl raha|dekh rha|dekh raha|dekh raha tha|dekhte|working|kaam kar|aise hi|চেক|பரிசோதனை)\b/i.test(q) ||
    q.includes('kuch nahi bas') || q.includes('kuch nhi bas') || q.includes('just checking') || q.includes('just testing')
  ) {
    let answer = `Haha, fair enough 😄`;
    if (q.includes('chal raha') || q.includes('chl rha') || q.includes('working') || q.includes('checkout')) {
      answer = `Haha, haan, chal raha hai 😄`;
    }

    return {
      route: 'TESTING',
      requiresGemini: false,
      requiresWebSearch: false,
      deterministicResponse: {
        answer,
        language: detectedLang,
        intent: 'casual_testing',
        intentCategory: 'CASUAL_CONVERSATION',
        display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: false, relatedTopics: false }
      }
    };
  }

  // 5. NOTHING / "Kuch nahi"
  if (/^(kuch nahi|kuch nhi|nothing|nothing much|never mind|chodo|rehnde|no problem|कुछ नहीं|কিছু না|काही नाही|ஒன்றுமில்லை)(\s|!|\.|\?)*$/i.test(q)) {
    let answer = `No worries 😄`;
    if (detectedLang === 'hindi') answer = `कोई बात नहीं 😄`;

    return {
      route: 'CASUAL_CHAT',
      requiresGemini: false,
      requiresWebSearch: false,
      deterministicResponse: {
        answer,
        language: detectedLang,
        intent: 'casual_chat',
        intentCategory: 'CASUAL_CONVERSATION',
        display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: false, relatedTopics: false }
      }
    };
  }

  // 6. THANKS
  if (/\b(thanks|thank you|thx|dhanyawad|shukriya|ধন্যবাদ|நன்றி|ధన్యవాదాలు|આભાર|ਧੰਨਵਾਦ)\b/i.test(q)) {
    let answer = `Anytime 😄`;
    if (detectedLang === 'hindi') answer = `स्वागत है! 😊`;

    return {
      route: 'THANKS',
      requiresGemini: false,
      requiresWebSearch: false,
      deterministicResponse: {
        answer,
        language: detectedLang,
        intent: 'thanks',
        intentCategory: 'CASUAL_CONVERSATION',
        display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: false, relatedTopics: false }
      }
    };
  }

  // 7. FAREWELL
  if (/^(bye|goodbye|see you|alvida|tata|good night|বিদায়)(\s|!|\.|\?)*$/i.test(q)) {
    let answer = `Bye, take care 👋`;

    return {
      route: 'FAREWELL',
      requiresGemini: false,
      requiresWebSearch: false,
      deterministicResponse: {
        answer,
        language: detectedLang,
        intent: 'farewell',
        intentCategory: 'CASUAL_CONVERSATION',
        display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: false, relatedTopics: false }
      }
    };
  }

  // 8. CAPABILITY QUESTION ("What can you help me with?", "Tu kya kya bata sakta hai?")
  if (/\b(what can you do|kya kar sakte ho|kya kya bata sakte|capabilities|what do you know|help me with|tu kya karta)\b/i.test(q)) {
    let answer = `Campus se related almost kuch bhi pooch sakte ho. Departments, hostels, scholarships, exams, offices, locations ya koi problem ho toh batao.`;
    if (detectedLang === 'english') {
      answer = `I can help with departments, campus locations, university services, admissions, exams, scholarships, hostels, and figuring out where to go when you're stuck.`;
    }

    return {
      route: 'CAPABILITIES',
      requiresGemini: false,
      requiresWebSearch: false,
      deterministicResponse: {
        answer,
        language: detectedLang,
        intent: 'capabilities',
        intentCategory: 'CASUAL_CONVERSATION',
        display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: false, relatedTopics: false }
      }
    };
  }

  // 9. LOCATION: Central Library
  if (
    q.includes('library') || q.includes('লাইব্রেরি') || q.includes('लायब्ररी') || 
    q.includes('நூலகம்') || q.includes('లైబ్రరీ') || q.includes('પુસ્તકાલય')
  ) {
    const loc = knowledgeService.getLocationById('loc-central-library')!;
    let answer = `Haan, Central Library campus mein hai. Exact location bhi dikha du?`;
    if (detectedLang === 'english') answer = `The Central Library is on the campus between Arts and Science faculties. Want me to show you the location on the map?`;
    else if (detectedLang === 'hindi') answer = `केंद्रीय पुस्तकालय कला और विज्ञान संकाय के बीच स्थित है। क्या आप इसे मैप पर देखना चाहते हैं?`;
    else if (detectedLang === 'bengali') answer = `সেন্ট্রাল লাইব্রেরি আর্টস ও সায়েন্স ফ্যাকাল্টির মাঝে ক্যাম্পাসের কেন্দ্রীয় এলাকায় অবস্থিত। আপনি কি ম্যাপে দেখতে চান?`;
    else if (detectedLang === 'marathi') answer = `मध्यवर्ती ग्रंथालय (Central Library) कला आणि विज्ञान विद्याशाखेच्या मध्ये कॅम्पसमध्ये स्थित आहे. नकाशावर पाहायचे आहे का?`;
    else if (detectedLang === 'tamil') answer = `மத்திய நூலகம் கலை மற்றும் அறிவியல் துறைகளுக்கு இடையே வளாகத்தில் அமைந்துள்ளது. வரைபடத்தில் பார்க்க வேண்டுமா?`;

    return {
      route: 'LOCATION',
      requiresGemini: false,
      requiresWebSearch: false,
      deterministicResponse: {
        answer,
        language: detectedLang,
        intent: 'library_location',
        intentCategory: 'LOCATION',
        location: { name: loc.name, building: loc.building, landmark: loc.landmark, mapLink: loc.mapLink, coordinates: loc.coordinates },
        display: { responsibleUnit: false, location: true, contact: false, documents: false, nextSteps: false, sources: true, relatedTopics: false }
      }
    };
  }

  // 10. PROBLEM: Scholarship
  if (
    q.includes('scholarship nahi aayi') || q.includes('scholarship pending') ||
    q.includes('scholarship ka paisa') || q.includes('scholarship kab milegi') ||
    (q.includes('scholarship') && (q.includes('problem') || q.includes('nahi mila') || q.includes('status') || q.includes('scene')))
  ) {
    let answer = `Achha, scholarship approve ho chuki hai ya abhi pending hai?`;
    if (detectedLang === 'english') answer = `Has your scholarship already been approved, or is the application still showing as pending?`;
    else if (detectedLang === 'hindi') answer = `क्या आपकी छात्रवृत्ति स्वीकृत (Approved) हो चुकी है, या अभी पेंडिंग है?`;

    return {
      route: 'PROBLEM_TRIAGE',
      requiresGemini: false,
      requiresWebSearch: false,
      deterministicResponse: {
        answer,
        language: detectedLang,
        intent: 'scholarship_triage',
        intentCategory: 'PROBLEM_SOLVING',
        followUpQuestion: 'Approved or pending verification?',
        display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: false, relatedTopics: false }
      }
    };
  }

  // 11. FOLLOW-UP: "Where to go?" / "Haan kahan jana hai?"
  const isAskingLocationFollowUp = 
    /\b(kahan jana|kaha jana|where to go|where should i go|location batao|kahan hai|kidhar hai|কোথায় যেতে হবে|எங்கே செல்ல வேண்டும்)\b/i.test(q) ||
    ((q === 'haan' || q === 'yes' || q.includes('batao') || q.includes('chalo') || q.includes('dikha') || q === 'হ্যাঁ') && 
     (lastAssistantMsg.includes('where to go') || lastAssistantMsg.includes('location') || lastAssistantMsg.includes('kahan') || lastAssistantMsg.includes('dikha')));

  if (isAskingLocationFollowUp) {
    if (lastAssistantMsg.includes('scholarship') || lastUserMsg.includes('scholarship')) {
      const office = knowledgeService.getOfficeById('office-scholarship-cell')!;
      const loc = knowledgeService.getLocationById('loc-admin-block')!;
      let answer = `Iske liye aapko **University Scholarship Cell** jaana hoga jo **Administrative Block (Room No. 12)** mein hai.`;
      if (detectedLang === 'english') answer = `For this, visit the **University Scholarship & Fellowship Cell** in **Room No. 12, Main Administrative Block**.`;

      return {
        route: 'FOLLOW_UP',
        requiresGemini: false,
        requiresWebSearch: false,
        deterministicResponse: {
          answer,
          language: detectedLang,
          intent: 'scholarship_location',
          intentCategory: 'LOCATION',
          responsibleUnit: { name: office.name, type: 'office', location: office.location, officeHours: office.officeHours },
          location: { name: loc.name, building: loc.building, floor: 'Ground Floor (Room No. 12)', landmark: loc.landmark, mapLink: loc.mapLink, coordinates: loc.coordinates },
          display: { responsibleUnit: true, location: true, contact: false, documents: false, nextSteps: true, sources: true, relatedTopics: false }
        }
      };
    }
  }

  // 12. CURRENT / TIME-SENSITIVE -> Gemini + Search Grounding
  if (
    /\b(latest|current|deadline|last date|aaj ka|circular|new notice|notification|kya date hai|update)\b/i.test(q) ||
    q.includes('admission last date') || q.includes('exam date')
  ) {
    return {
      route: 'CURRENT_WEB_QUERY',
      requiresGemini: true,
      requiresWebSearch: true
    };
  }

  // 13. COMPLEX / UNCERTAIN -> Escalate to Gemini
  return {
    route: 'COMPLEX_REASONING',
    requiresGemini: true,
    requiresWebSearch: false
  };
}
