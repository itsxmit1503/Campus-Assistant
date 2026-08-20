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
  const isEnglish = detectedLang === 'english';
  const isHindi = detectedLang === 'hindi';

  // 1. DEPARTMENT OF COMPUTER SCIENCE / APPLICATIONS
  if (/\b(computer science|computer|csa|cse|mca|cs department)\b/i.test(q)) {
    const dept = departmentsData.find(d => d.id === 'dept-cs-applications')!;
    const isLocation = /\b(kaha|kahan|kidhar|where|location|building|rasta|map|campus mein)\b/i.test(q);
    const isHod = /\b(hod|head|dean|kaun hai|who is)\b/i.test(q);
    const isCourses = /\b(course|courses|programme|programmes|degree)\b/i.test(q);
    const isContact = /\b(contact|number|phone|email)\b/i.test(q);

    if (isLocation) {
      return {
        answer: isEnglish
          ? `The ${dept.name} is located in the CSA Building on the Upper Campus near the Science Block.`
          : `Department of Computer Science & Applications (CSA) Upper Campus mein Science Block ke paas sthit hai.`,
        language: detectedLang,
        intent: 'department_location',
        intentCategory: 'LOCATION',
        responsibleUnit: { name: dept.name, type: 'department', location: dept.location },
        location: { name: dept.building, building: dept.building, landmark: 'Upper Campus near Science Block', mapLink: dept.mapLink },
        display: { responsibleUnit: false, location: true, contact: false, documents: false, nextSteps: false, sources: true, relatedTopics: false }
      };
    }

    if (isHod) {
      return {
        answer: `${dept.name} ke Head (HOD) **${dept.hod}** hain. Unka office CSA Building mein hai.`,
        language: detectedLang,
        intent: 'department_hod',
        intentCategory: 'INFORMATION',
        responsibleUnit: { name: dept.name, type: 'department', location: dept.location },
        display: { responsibleUnit: true, location: false, contact: false, documents: false, nextSteps: false, sources: true, relatedTopics: false }
      };
    }

    if (isCourses) {
      return {
        answer: `${dept.name} mein yeh programmes offer hote hain: **${dept.programmes.join(', ')}**.`,
        language: detectedLang,
        intent: 'department_courses',
        intentCategory: 'INFORMATION',
        responsibleUnit: { name: dept.name, type: 'department', location: dept.location },
        display: { responsibleUnit: true, location: false, contact: false, documents: false, nextSteps: false, sources: true, relatedTopics: false }
      };
    }

    if (isContact) {
      return {
        answer: `${dept.name} ka contact: Phone: **${dept.contact?.phone || 'N/A'}**, Email: **${dept.contact?.email || 'N/A'}**.`,
        language: detectedLang,
        intent: 'department_contact',
        intentCategory: 'CONTACT',
        responsibleUnit: { name: dept.name, type: 'department', location: dept.location },
        contact: { phone: dept.contact?.phone, email: dept.contact?.email, officialWebsite: dept.officialSourceUrl },
        display: { responsibleUnit: true, location: false, contact: true, documents: false, nextSteps: false, sources: true, relatedTopics: false }
      };
    }

    // Overview
    return {
      answer: isEnglish
        ? `Sure! For the **${dept.name}** (${dept.schoolName}), I can help with location, courses (${dept.programmes.join(', ')}), HOD, or contact details. What would you like to know?`
        : `Haan, bilkul. **${dept.name}** ke baare mein location, courses (${dept.programmes.join(', ')}), HOD ya contact details me se kis cheez ke baare mein janna hai?`,
      language: detectedLang,
      intent: 'department_overview',
      intentCategory: 'INFORMATION',
      responsibleUnit: { name: dept.name, type: 'department', location: dept.location },
      display: { responsibleUnit: true, location: false, contact: false, documents: false, nextSteps: false, sources: true, relatedTopics: false }
    };
  }

  // 2. CENTRAL LIBRARY
  if (q.includes('library') || q.includes('লাইব্রেরি') || q.includes('लायब्ररी')) {
    const loc = locationsData.find(l => l.id === 'loc-central-library')!;
    return {
      answer: isEnglish
        ? `The Jawaharlal Nehru Central Library is located centrally on campus between Arts and Science faculties.`
        : `Haan, Central Library campus mein Arts aur Science faculty ke beech mein sthit hai. Exact location map par dekhna chahte hain?`,
      language: detectedLang,
      intent: 'library_location',
      intentCategory: 'LOCATION',
      location: { name: loc.name, building: loc.building, landmark: loc.landmark, mapLink: loc.mapLink },
      display: { responsibleUnit: false, location: true, contact: false, documents: false, nextSteps: false, sources: true, relatedTopics: false }
    };
  }

  // 3. SCHOLARSHIP
  if (q.includes('scholarship') && (q.includes('nahi aayi') || q.includes('pending') || q.includes('paisa') || q.includes('scene'))) {
    return {
      answer: `Achha, scholarship approve ho chuki hai ya abhi pending hai?`,
      language: detectedLang,
      intent: 'scholarship_triage',
      intentCategory: 'PROBLEM_SOLVING',
      display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: false, relatedTopics: false }
    };
  }

  // 4. CASUAL / SOCIAL
  if (/\b(hello bol|bol na|bol re|kuch bol|kya haal|aur bata|aur bhai|kya scene)\b/i.test(q)) {
    return {
      answer: `Hello 😄`,
      language: detectedLang,
      intent: 'casual_social',
      intentCategory: 'CASUAL_CONVERSATION',
      display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: false, relatedTopics: false }
    };
  }

  if (/^(hey|hello|hi|hiya|namaste|what's up|good morning|hey there)(\s|!|\.|\?)*$/i.test(q)) {
    return {
      answer: `Hey! 👋`,
      language: detectedLang,
      intent: 'greeting',
      intentCategory: 'GREETING',
      display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: false, relatedTopics: false }
    };
  }

  if (/^(hmm|hmmm|acha|achha|ok|okay|theek hai|thik hai|theek|got it|haan)(\s|!|\.|\?)*$/i.test(q)) {
    return {
      answer: q === 'acha' || q === 'achha' ? `haan 😄` : `😄`,
      language: detectedLang,
      intent: 'acknowledgement',
      intentCategory: 'CASUAL_CONVERSATION',
      display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: false, relatedTopics: false }
    };
  }

  if (/\b(checkout|check|test|testing|chal rha|chal raha|chl rha|chl raha|dekh rha|dekh raha)\b/i.test(q)) {
    return {
      answer: `Haha, haan, chal raha hai 😄`,
      language: detectedLang,
      intent: 'casual_testing',
      intentCategory: 'CASUAL_CONVERSATION',
      display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: false, relatedTopics: false }
    };
  }

  return {
    answer: isEnglish ? `Sure, go ahead 😄` : `Haan bolo 😄`,
    language: detectedLang,
    intent: 'casual_chat',
    intentCategory: 'CASUAL_CONVERSATION',
    display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: false, relatedTopics: false }
  };
}
