import { StructuredAnswer } from '../types/index.js';

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
    'chalo', 'dikha', 'du', 'do', 'bol', 'bolo', 'haal', 'kaise', 'badhiya', 'chahiye', 'janna', 'bataiye'
  ];

  const words = text.toLowerCase().split(/[\s,?.!]+/);
  if (words.some(w => hinglishMarkers.includes(w))) return 'hinglish';

  return 'english';
}

export class ConversationEngine {
  /**
   * Check if a message is purely conversational/social without any information intent
   */
  resolvePurelyConversational(query: string, history: Array<{ role: 'user' | 'assistant'; content: string }> = []): StructuredAnswer | null {
    const q = query.toLowerCase().trim();
    const detectedLang = detectLanguage(query);
    const isEnglish = detectedLang === 'english';
    const isHindi = detectedLang === 'hindi';

    // 1. Unspecified Opening ("kuch puchna hai", "ek baat puchu?", "can i ask something?")
    if (/^(kuch puchna hai|ek baat puchu|ek sawal hai|can i ask something|may i ask|puch sakta hu)(\s|!|\.|\?)*$/i.test(q)) {
      return {
        answer: isEnglish ? `Sure, go ahead and ask! 😄` : isHindi ? `बिल्कुल, पूछिए! 😄` : `Bilkul, pucho! Jo bhi jaana hai batao 😄`,
        language: detectedLang,
        intent: 'conversation_opening',
        intentCategory: 'CASUAL_CONVERSATION',
        display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: false, relatedTopics: false }
      };
    }

    // 2. Playful Social Commands ("hello bol", "bol na", "kya haal", "sab badhiya", "aur bata")
    if (/\b(hello bol|bol na|bol re|kuch bol|kya haal|kya hal|aur bata|aur bhai|kya chal raha|sab badhiya|kya scene)\b/i.test(q)) {
      let answer = `Hello 😄`;
      if (q.includes('kya haal') || q.includes('aur bata') || q.includes('sab badhiya')) answer = `Sab badhiya! Batao 😄`;
      else if (q.includes('hello bol')) answer = `Hello 😄`;
      else answer = `Haan bolo 😄`;

      return {
        answer,
        language: detectedLang,
        intent: 'casual_social',
        intentCategory: 'CASUAL_CONVERSATION',
        display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: false, relatedTopics: false }
      };
    }

    // 3. Greetings ("hey", "hello", "hi", "namaste", "pranam")
    if (/^(hey|hello|hi|hiya|namaste|pranam|what's up|good morning|good afternoon|good evening|hey there|halo|kaise ho|নমস্কার|வணக்கம்|నమస్కారం|નમસ્તે|ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ|നമസ്കാരം)(\s|!|\.|\?)*$/i.test(q)) {
      let answer = `Hey! 👋`;
      if (isHindi) answer = `नमस्ते! 👋`;
      else if (detectedLang === 'bengali') answer = `নমস্কার! 👋`;
      else if (detectedLang === 'marathi') answer = `नमस्कार! 👋`;
      else if (detectedLang === 'tamil') answer = `வணக்கம்! 👋`;

      return {
        answer,
        language: detectedLang,
        intent: 'greeting',
        intentCategory: 'GREETING',
        display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: false, relatedTopics: false }
      };
    }

    // 4. Acknowledgements / Minimal Feedback ("hmm", "hmmm", "acha", "ok", "theek hai", "got it")
    if (/^(hmm|hmmm|hmmmm|acha|achha|ok|okay|theek hai|thik hai|theek|thik|got it|sahi hai|fine|cool|alright|nice|great|haan|sahi|होय|बरोबर|ठीक আছে|சரி)(\s|!|\.|\?)*$/i.test(q)) {
      let answer = `😄`;
      if (q.startsWith('hmm')) answer = `😄`;
      else if (q === 'acha' || q === 'achha') answer = `haan 😄`;
      else if (q === 'theek hai' || q === 'thik hai' || q === 'theek') answer = `Theek hai 👍`;
      else if (q === 'ok' || q === 'okay' || q === 'cool' || q === 'nice') answer = `👍`;

      return {
        answer,
        language: detectedLang,
        intent: 'acknowledgement',
        intentCategory: 'CASUAL_CONVERSATION',
        display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: false, relatedTopics: false }
      };
    }

    // 5. Testing / Meta ("bas check kar raha hu", "just testing", "dekh raha tha")
    if (
      /\b(checkout|check|test|testing|chal rha|chal raha|chl rha|chl raha|dekh rha|dekh raha|dekh raha tha|dekhte|working|kaam kar|aise hi|চেক|பரிசோதனை)\b/i.test(q) ||
      q.includes('kuch nahi bas') || q.includes('kuch nhi bas') || q.includes('just checking') || q.includes('just testing')
    ) {
      let answer = `Haha, fair enough 😄`;
      if (q.includes('chal raha') || q.includes('chl rha') || q.includes('working') || q.includes('checkout')) {
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

    // 6. Nothing / Kuch nahi
    if (/^(kuch nahi|kuch nhi|nothing|nothing much|never mind|chodo|rehnde|no problem|कुछ नहीं|কিছু না|काही नाही|ஒன்றுமில்லை)(\s|!|\.|\?)*$/i.test(q)) {
      let answer = `No worries 😄`;
      if (isHindi) answer = `कोई बात नहीं 😄`;

      return {
        answer,
        language: detectedLang,
        intent: 'casual_chat',
        intentCategory: 'CASUAL_CONVERSATION',
        display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: false, relatedTopics: false }
      };
    }

    // 7. Thanks
    if (/\b(thanks|thank you|thx|dhanyawad|shukriya|ধন্যবাদ|நன்றி|ధన్యవాదాలు|આભાર|ਧੰਨਵਾਦ)\b/i.test(q)) {
      return {
        answer: `Anytime 😄`,
        language: detectedLang,
        intent: 'thanks',
        intentCategory: 'CASUAL_CONVERSATION',
        display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: false, relatedTopics: false }
      };
    }

    // 8. Farewell
    if (/^(bye|goodbye|see you|alvida|tata|good night|বিদায়)(\s|!|\.|\?)*$/i.test(q)) {
      return {
        answer: `Bye, take care 👋`,
        language: detectedLang,
        intent: 'farewell',
        intentCategory: 'CASUAL_CONVERSATION',
        display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: false, relatedTopics: false }
      };
    }

    // 9. Capability Query
    if (/\b(what can you do|kya kar sakte ho|kya kya bata sakte|capabilities|what do you know|help me with|tu kya karta)\b/i.test(q)) {
      let answer = `Campus se related almost kuch bhi pooch sakte ho. Departments, hostels, scholarships, exams, offices, locations ya koi problem ho toh batao.`;
      if (isEnglish) answer = `I can help with departments, campus locations, university services, admissions, exams, scholarships, hostels, and figuring out where to go when you're stuck.`;

      return {
        answer,
        language: detectedLang,
        intent: 'capabilities',
        intentCategory: 'CASUAL_CONVERSATION',
        display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: false, relatedTopics: false }
      };
    }

    return null;
  }
}

export const conversationEngine = new ConversationEngine();
