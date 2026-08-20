import { StructuredAnswer } from '../types/index.js';
import { knowledgeService } from './knowledgeService.js';

export type RouteType = 
  | 'GREETING'
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

  // Hinglish markers
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

export function routeQuery(
  query: string,
  lang = 'auto',
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
): RouteDecision {
  const q = query.toLowerCase().trim();
  const detectedLang = detectLanguage(query, conversationHistory);

  const lastUserMsg = conversationHistory.filter(m => m.role === 'user').slice(-2, -1)[0]?.content.toLowerCase() || '';
  const lastAssistantMsg = conversationHistory.filter(m => m.role === 'assistant').slice(-1)[0]?.content.toLowerCase() || '';

  // 1. GREETINGS
  if (
    /^(hey|hello|hi|hiya|namaste|pranam|what's up|good morning|good afternoon|good evening|hey there|halo|kaise ho|নমস্কার|வணக்கம்|నమస్కారం|નમસ્તે|ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ|നമസ്കാരം)(\s|!|\.|\?)*$/i.test(q)
  ) {
    let answer = `Hey! 👋 How can I help you around DHSGSU?`;
    if (detectedLang === 'hindi') answer = `नमस्ते! 👋 DHSGSU कैंपस में आपकी क्या सहायता करूँ?`;
    else if (detectedLang === 'hinglish') answer = `Hey! 👋 Batao, campus mein kis cheez mein help chahiye?`;
    else if (detectedLang === 'bengali') answer = `নমস্কার! 👋 DHSGSU ক্যাম্পাসে আপনাকে কীভাবে সাহায্য করতে পারি?`;
    else if (detectedLang === 'marathi') answer = `नमस्कार! 👋 DHSGSU कॅम्पसमध्ये मी तुम्हाला कशी मदत करू शकतो?`;
    else if (detectedLang === 'tamil') answer = `வணக்கம்! 👋 DHSGSU வளாகத்தில் உங்களுக்கு நான் எவ்வாறு உதவ முடியும்?`;
    else if (detectedLang === 'telugu') answer = `నమస్కారం! 👋 DHSGSU క్యాంపస్‌లో మీకు నేను ఎలా సహాయపడగలను?`;
    else if (detectedLang === 'gujarati') answer = `નમસ્તે! 👋 DHSGSU કેમ્પસમાં હું તમને કેવી રીતે મદદ કરી શકું?`;
    else if (detectedLang === 'punjabi') answer = `ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! 👋 DHSGSU ਕੈਂਪਸ ਵਿੱਚ ਮੈਂ ਤੁਹਾਡੀ ਕੀ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ?`;

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

  // 2. CASUAL TESTING / META
  if (
    /\b(checkout|check|test|testing|chal rha|chal raha|chl rha|chl raha|dekh rha|dekh raha|dekhte|working|kaam kar|aise hi|চেক|பரிசோதனை|తనిఖీ)\b/i.test(q) ||
    q.includes('kuch nahi bas') || q.includes('kuch nhi bas') || q.includes('just checking') || q.includes('just testing')
  ) {
    let answer = `Haha, yep, it's working smoothly 😄\nWhenever you're ready, feel free to ask anything about the campus.`;
    if (detectedLang === 'hindi') answer = `हाँ, बिल्कुल चालू है 😄 जब भी कुछ पूछना हो, निसंकोच बताइएगा।`;
    else if (detectedLang === 'hinglish') answer = `Haha, haan bhai, bilkul chal raha hai 😄\nJab bhi campus se juda kuch poochna ho, bas bol dena.`;
    else if (detectedLang === 'bengali') answer = `হ্যাঁ, একেবারে ঠিকঠাক কাজ করছে 😄 যখনই কিছু জানার থাকবে নির্দ্বিধায় জিজ্ঞাসা করবেন।`;
    else if (detectedLang === 'marathi') answer = `हो, अगदी व्यवस्थित सुरू आहे 😄 जेव्हाही काही विचारायचे असेल, नक्की विचारा.`;
    else if (detectedLang === 'tamil') answer = `ஆம், சரியாக வேலை செய்கிறது 😄 எப்போது வேண்டுமானாலும் வளாகம் பற்றி கேளுங்கள்.`;

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

  // 3. NOTHING / "Kuch nahi"
  if (/^(kuch nahi|kuch nhi|nothing|nothing much|never mind|chodo|rehnde|no problem|কিছু না|काही नाही|ஒன்றுமில்லை)(\s|!|\.|\?)*$/i.test(q)) {
    let answer = `No worries 😄 Take your time.`;
    if (detectedLang === 'hindi') answer = `कोई बात नहीं 😄 आराम से, जब ज़रूरत हो बताइएगा।`;
    else if (detectedLang === 'hinglish') answer = `Koi baat nahi 😄 Aaram se, jab zaroorat ho bata dena.`;
    else if (detectedLang === 'bengali') answer = `কোনো সমস্যা নেই 😄 সময় নিন, যখন প্রয়োজন হবে জানাবেন।`;
    else if (detectedLang === 'marathi') answer = `काही हरकत नाही 😄 आरामशीर, जेव्हा गरज असेल तेव्हा सांगा.`;

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

  // 4. ACKNOWLEDGEMENTS ("Acha", "Okay", "Theek hai", "Got it", "Sahi hai")
  if (/^(acha|achha|ok|okay|theek hai|thik hai|got it|sahi hai|fine|cool|alright|hmm|accha|ঠিক আছে|சரி|होय|बरोबर)(\s|!|\.|\?)*$/i.test(q)) {
    let answer = `👍`;
    if (q === 'acha' || q === 'achha' || q === 'accha') answer = `Haan 😄`;

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

  // 5. THANKS
  if (/\b(thanks|thank you|thx|dhanyawad|shukriya|ধন্যবাদ|நன்றி|ధన్యవాदాలు|આભાર|ਧੰਨਵਾਦ)\b/i.test(q)) {
    let answer = `You're welcome! 😊 Feel free to ask anytime.`;
    if (detectedLang === 'hinglish') answer = `Anytime bhai! 😊 Kabhi bhi kuch pooch lena.`;
    else if (detectedLang === 'hindi') answer = `स्वागत है! 😊 कभी भी पूछ सकते हैं।`;
    else if (detectedLang === 'bengali') answer = `আপনাকে স্বাগতম! 😊 যেকোনো সময় জিজ্ঞাসা করতে পারেন।`;
    else if (detectedLang === 'marathi') answer = `स्वागत आहे! 😊 कधीही विचारू शकता.`;

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

  // 6. FAREWELL
  if (/^(bye|goodbye|see you|alvida|tata|good night|বিদায়)(\s|!|\.|\?)*$/i.test(q)) {
    let answer = `Bye! Take care 👋`;
    if (detectedLang === 'hinglish') answer = `Bye bhai, take care 👋`;
    else if (detectedLang === 'bengali') answer = `বিদায়! ভালো থাকবেন 👋`;

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

  // 7. LANGUAGE INQUIRY
  if (/\b(speak hindi|hindi aati|hinglish aati|hindi bol|bengali aati|language|hindi samajh)\b/i.test(q)) {
    return {
      route: 'LANGUAGE_QUERY',
      requiresGemini: false,
      requiresWebSearch: false,
      deterministicResponse: {
        answer: `Bilkul! Hindi, Hinglish, English, Bengali, Marathi, Tamil, Telugu — jis mein comfortable ho usmein baat kar sakte ho 😄`,
        language: 'Hinglish',
        intent: 'language_capabilities',
        intentCategory: 'CASUAL_CONVERSATION',
        display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: false, relatedTopics: false }
      }
    };
  }

  // 8. DIRECT LOCATION: Library (Multilingual)
  if (
    q.includes('library') || q.includes('লাইব্রেরি') || q.includes('लायब्ररी') || 
    q.includes('நூலகம்') || q.includes('లైబ్రరీ') || q.includes('પુસ્તકાલય')
  ) {
    const loc = knowledgeService.getLocationById('loc-central-library')!;
    let answer = `The Central Library is located centrally on the DHSGSU campus between the Arts and Science blocks. Want me to show you the location on the map?`;
    if (detectedLang === 'hinglish') answer = `Central Library Arts aur Science faculty ke beech mein campus ke central area mein hai. Chaho toh location dikha du?`;
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

  // 9. PROBLEM: "Meri scholarship nahi aayi" (Turn 1)
  if (
    q.includes('scholarship nahi aayi') || q.includes('scholarship pending') ||
    q.includes('scholarship ka paisa') || q.includes('scholarship kab milegi') ||
    (q.includes('scholarship') && (q.includes('problem') || q.includes('nahi mila') || q.includes('status') || q.includes('scene')))
  ) {
    let answer = `Sure, I can help you figure that out. Has the scholarship already been approved, or is the application still pending on the portal?`;
    if (detectedLang === 'hinglish') answer = `Haan, dekhte hain. Scholarship approve ho chuki hai ya abhi portal par pending dikha rahi hai?`;
    else if (detectedLang === 'hindi') answer = `ज़रूर। क्या आपकी छात्रवृत्ति पोर्टल पर स्वीकृत (Approved) हो चुकी है, या अभी पेंडिंग है?`;

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

  // 10. CURRENT / TIME-SENSITIVE -> Require Gemini + Search Grounding
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

  // 11. COMPLEX / UNCERTAIN -> Escalate to Gemini
  return {
    route: 'COMPLEX_REASONING',
    requiresGemini: true,
    requiresWebSearch: false
  };
}
