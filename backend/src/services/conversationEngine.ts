import { StructuredAnswer } from '../types/index.js';

/**
 * detectLanguage — lightweight script detection used only for context labelling.
 * Gemini is responsible for language-based response generation.
 */
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
    'kuch', 'nahi', 'nhi', 'bas', 'rha', 'rhi', 'raha', 'rahi', 'hoon', 'hai', 'hain',
    'kya', 'kaha', 'kahan', 'kidhar', 'kaise', 'kaun', 'kyun', 'kyu', 'kab', 'bhai', 'yaar',
    'batao', 'bata', 'dekh', 'dekhte', 'chal', 'chl', 'samajh', 'pata', 'chahiye', 'karna',
    'kare', 'karu', 'karein', 'jana', 'jaun', 'padega', 'milega', 'mili', 'aaya', 'aayi',
    'acha', 'achha', 'theek', 'thik', 'haan', 'sahi', 'bhi', 'se', 'ko', 'mein', 'par',
    'pe', 'toh', 'ho', 'gaya', 'gayi', 'hoga', 'hogi', 'mera', 'meri', 'mere', 'apna',
    'chalo', 'dikha', 'bolo', 'haal', 'badhiya', 'janna', 'bataiye', 'puchna', 'puchni'
  ];

  const words = text.toLowerCase().split(/[\s,?.!]+/);
  if (words.some(w => hinglishMarkers.includes(w))) return 'hinglish';

  return 'english';
}

export class ConversationEngine {
  /**
   * NARROW LOCAL HANDLER — Only handles truly trivial one-word/emoji acknowledgements.
   *
   * IMPORTANT: This method intentionally handles ONLY the absolute minimum set of
   * trivial messages that require no conversational reasoning whatsoever.
   *
   * DO NOT ADD more patterns here. The following MUST go through Gemini:
   *   - greetings (hey, hello, hi, namaste, etc.)
   *   - capability questions (what can you do, tum kya kar sakte ho)
   *   - casual check-ins (just checking, bas testing, umm, hmm)
   *   - small talk (kya haal chaal, kya scene)
   *   - openers (ek baat puchni thi, kuch puchna hai)
   *   - all university questions
   *   - all follow-up questions
   *   - any message containing a question or intent
   *
   * Gemini handles all of the above naturally and correctly.
   */
  resolvePurelyConversational(
    query: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }> = []
  ): StructuredAnswer | null {
    const q = query.trim();
    const qLower = q.toLowerCase();

    // SAFETY: If the message has more than 5 words, it almost certainly contains
    // intent that Gemini should handle. Route everything to Gemini.
    const wordCount = q.split(/\s+/).filter(Boolean).length;
    if (wordCount > 4) return null;

    // SAFETY: If the message contains a '?' or any question-forming word, send to Gemini.
    if (/[?？]/.test(q)) return null;
    if (/\b(kya|kaha|kahan|kidhar|where|when|how|kaise|kyun|why|what|who|kaun|kitna|kitne|kab|kaunse)\b/i.test(qLower)) return null;

    // SAFETY: If the message mentions any university topic, send to Gemini.
    const universityKeywords = [
      'department', 'school', 'physics', 'chemistry', 'maths', 'math', 'mathematics',
      'computer', 'csa', 'cse', 'mca', 'mba', 'law', 'vidhi', 'library', 'pustakalaya',
      'scholarship', 'chhatravritti', 'exam', 'pariksha', 'marksheet', 'hostel', 'chhatravas',
      'warden', 'admission', 'fee', 'fees', 'dsw', 'registrar', 'vc', 'hod', 'head', 'dean',
      'faculty', 'professor', 'contact', 'number', 'email', 'helpline', 'location', 'building',
      'form', 'result', 'degree', 'programme', 'course', 'courses', 'syllabus', 'notice',
      'correction', 'problem', 'dikkat', 'issue', 'pending', 'galat', 'allotment', 'document',
      'certificate', 'bonafide', 'migration', 'transfer', 'library', 'canteen', 'sports',
      'health', 'medical', 'dispensary', 'hostel', 'room', 'mess', 'gym', 'ground', 'stadium'
    ];
    if (universityKeywords.some(kw => {
      const reg = new RegExp(`\\b${kw}\\b`, 'i');
      return reg.test(qLower);
    })) return null;

    // ── TRIVIAL LOCAL RESPONSES ──────────────────────────────────────────────
    // Only the following patterns are handled locally. All else → Gemini.

    // 1. Pure thanks (standalone only)
    if (/^(thanks|thank you|thx|dhanyawad|shukriya|ধন্যবাদ|நன்றி|ధన్యవాదాలు|આભાર|ਧੰਨਵਾਦ|شکریہ)$/i.test(qLower)) {
      return {
        answer: `Anytime 😊`,
        language: detectLanguage(query, history),
        intent: 'thanks',
        intentCategory: 'CASUAL_CONVERSATION',
        display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: false, relatedTopics: false }
      };
    }

    // 2. Pure farewell (standalone only)
    if (/^(bye|goodbye|alvida|tata|see you|good night|বিদায়|さようなら)$/i.test(qLower)) {
      return {
        answer: `Bye! Take care 👋`,
        language: detectLanguage(query, history),
        intent: 'farewell',
        intentCategory: 'CASUAL_CONVERSATION',
        display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: false, relatedTopics: false }
      };
    }

    // 3. Pure emoji acknowledgements (no text)
    if (/^(👍|🙏|👌|✅|😊|😄|❤️|🙌)+$/.test(q)) {
      return {
        answer: `😊`,
        language: 'auto',
        intent: 'acknowledgement',
        intentCategory: 'CASUAL_CONVERSATION',
        display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: false, relatedTopics: false }
      };
    }

    // Everything else → Gemini handles it
    return null;
  }
}

export const conversationEngine = new ConversationEngine();
