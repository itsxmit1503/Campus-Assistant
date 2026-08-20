import { StructuredAnswer, Department, AdministrativeOffice, CampusLocation, StudentService } from '../types/index.js';
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
  | 'DEPARTMENT_INFO'
  | 'OFFICE_INFO'
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
    'chalo', 'dikha', 'du', 'do', 'bol', 'bolo', 'haal', 'kaise', 'badhiya', 'chahiye', 'janna', 'bataiye'
  ];

  const words = text.toLowerCase().split(/[\s,?.!]+/);
  if (words.some(w => hinglishMarkers.includes(w))) return 'hinglish';

  if (words.length <= 2 && history.length > 0) {
    const last = history.filter(h => h.role === 'user').slice(-2, -1)[0]?.content.toLowerCase() || '';
    if (last.split(/[\s,?.!]+/).some(w => hinglishMarkers.includes(w))) return 'hinglish';
  }

  return 'english';
}

/**
 * Identify any university entity mentioned in the query
 */
function findUniversityEntity(q: string): {
  department?: Department;
  office?: AdministrativeOffice;
  location?: CampusLocation;
  service?: StudentService;
} {
  const depts = knowledgeService.getDepartments();
  const offices = knowledgeService.getOffices();
  const locs = knowledgeService.getLocations();
  const services = knowledgeService.getServices();

  // 1. Check Computer Science / Applications
  if (
    /\b(computer science|computer|csa|cse|mca|it department|cs department|comp sc)\b/i.test(q)
  ) {
    const dept = depts.find(d => d.id === 'dept-cs-applications');
    const loc = locs.find(l => l.id === 'loc-csa-building');
    return { department: dept, location: loc };
  }

  // 2. Check Law
  if (/\b(law|vidhi|legal|llb|ba llb|llm)\b/i.test(q)) {
    const dept = depts.find(d => d.id === 'dept-law');
    const loc = locs.find(l => l.id === 'loc-law-dept');
    return { department: dept, location: loc };
  }

  // 3. Check Business / Management
  if (/\b(business|management|mba|bba|commerce)\b/i.test(q)) {
    const dept = depts.find(d => d.id === 'dept-business-mgmt');
    return { department: dept };
  }

  // 4. Check Physics
  if (/\b(physics|bhautik)\b/i.test(q)) {
    const dept = depts.find(d => d.id === 'dept-physics');
    return { department: dept };
  }

  // 5. Check Chemistry
  if (/\b(chemistry|rasayan)\b/i.test(q)) {
    const dept = depts.find(d => d.id === 'dept-chemistry');
    return { department: dept };
  }

  // 6. Check Central Library
  if (/\b(library|pustakalaya|granthalaya|লাইব্রেরি|लायब्ररी|நூலகம்|લાઇબ્રેરી|ਨਵਾਂ ਲਾਇਬ੍ਰੇਰੀ)\b/i.test(q)) {
    const loc = locs.find(l => l.id === 'loc-central-library');
    return { location: loc };
  }

  // 7. Check Scholarship
  if (/\b(scholarship|chhatravritti|fellowship|mp taas|nsp)\b/i.test(q)) {
    const office = offices.find(o => o.id === 'office-scholarship-cell');
    const service = services.find(s => s.id === 'service-scholarship-support');
    return { office, service };
  }

  // 8. Check Examination / Marksheet
  if (/\b(exam|pariksha|marksheet|admit card|result|correction)\b/i.test(q)) {
    const office = offices.find(o => o.id === 'office-exam-cell');
    const service = services.find(s => s.id === 'service-marksheet-correction');
    const loc = locs.find(l => l.id === 'loc-pariksha-bhawan');
    return { office, service, location: loc };
  }

  // 9. Check DSW (Dean Student Welfare)
  if (/\b(dsw|dean student welfare|welfare|student welfare)\b/i.test(q)) {
    const office = offices.find(o => o.id === 'office-dsw');
    return { office };
  }

  // 10. Check Registrar
  if (/\b(registrar|kul sachiv|kulsachiv)\b/i.test(q)) {
    const office = offices.find(o => o.id === 'office-registrar');
    return { office };
  }

  // 11. Check Health Centre
  if (/\b(health|medical|hospital|dispensary|doctor)\b/i.test(q)) {
    const office = offices.find(o => o.id === 'office-health-centre');
    const loc = locs.find(l => l.id === 'loc-health-centre');
    return { office, location: loc };
  }

  // 12. Check Hostels
  if (/\b(hostel|chhatravas|warden|allotment|room)\b/i.test(q)) {
    const office = offices.find(o => o.id === 'office-chief-warden');
    const service = services.find(s => s.id === 'service-hostel-allotment');
    return { office, service };
  }

  // 13. Check Administrative Block
  if (/\b(admin block|administrative block|prashasnik bhawan|main office)\b/i.test(q)) {
    const loc = locs.find(l => l.id === 'loc-admin-block');
    return { location: loc };
  }

  return {};
}

export function routeQuery(
  query: string,
  lang = 'auto',
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
): RouteDecision {
  const q = query.toLowerCase().trim();
  const detectedLang = detectLanguage(query, conversationHistory);
  const isHinglish = detectedLang === 'hinglish';
  const isHindi = detectedLang === 'hindi';
  const isEnglish = detectedLang === 'english';

  const lastUserMsg = conversationHistory.filter(m => m.role === 'user').slice(-2, -1)[0]?.content.toLowerCase() || '';
  const lastAssistantMsg = conversationHistory.filter(m => m.role === 'assistant').slice(-1)[0]?.content.toLowerCase() || '';

  // -------------------------------------------------------------
  // STAGE 1: CHECK FOR UNIVERSITY ENTITY & INTENT FIRST!
  // This ensures a question like "computer science department hai kaha"
  // is NEVER accidentally swallowed by a casual acknowledgement branch!
  // -------------------------------------------------------------
  const entity = findUniversityEntity(q);

  // A. If an Academic Department is mentioned
  if (entity.department) {
    const dept = entity.department;
    const isLocation = /\b(kaha|kahan|kidhar|where|location|building|rasta|map|kis jagah|campus mein)\b/i.test(q);
    const isHod = /\b(hod|head|dean|incharge|kaun hai|who is|adhyaksh)\b/i.test(q);
    const isCourses = /\b(course|courses|programme|programmes|degree|kya padhate|branch|eligibility)\b/i.test(q);
    const isContact = /\b(contact|number|phone|email|helpline|sampark)\b/i.test(q);

    // A1. Specific Location Request
    if (isLocation) {
      let answer = `Department of Computer Science & Applications (CSA) Upper Campus mein Science Block ke paas sthit hai.`;
      if (isEnglish) answer = `The ${dept.name} is located in the CSA Building on the Upper Campus near the Science Block.`;
      else if (isHindi) answer = `${dept.name} अपर कैंपस में साइंस ब्लॉक के समीप CSA भवन में स्थित है।`;

      return {
        route: 'LOCATION',
        requiresGemini: false,
        requiresWebSearch: false,
        deterministicResponse: {
          answer,
          language: detectedLang,
          intent: 'department_location',
          intentCategory: 'LOCATION',
          responsibleUnit: { name: dept.name, type: 'department', location: dept.location },
          location: {
            name: dept.building,
            building: dept.building,
            landmark: 'Upper Campus near Science Block',
            mapLink: dept.mapLink
          },
          display: { responsibleUnit: false, location: true, contact: false, documents: false, nextSteps: false, sources: true, relatedTopics: false }
        }
      };
    }

    // A2. Specific HOD / Head Request
    if (isHod) {
      let answer = `${dept.name} ke Head (HOD) **${dept.hod}** hain. Unka office CSA Building mein hai.`;
      if (isEnglish) answer = `The Head of the ${dept.name} is **${dept.hod}**, with office located in the CSA Building.`;
      else if (isHindi) answer = `${dept.name} के विभागाध्यक्ष (HOD) **${dept.hod}** हैं।`;

      return {
        route: 'DEPARTMENT_INFO',
        requiresGemini: false,
        requiresWebSearch: false,
        deterministicResponse: {
          answer,
          language: detectedLang,
          intent: 'department_hod',
          intentCategory: 'INFORMATION',
          responsibleUnit: { name: dept.name, type: 'department', location: dept.location },
          display: { responsibleUnit: true, location: false, contact: false, documents: false, nextSteps: false, sources: true, relatedTopics: false }
        }
      };
    }

    // A3. Specific Courses Request
    if (isCourses) {
      const progList = dept.programmes.join(', ');
      let answer = `${dept.name} mein yeh programmes offer hote hain: **${progList}**.`;
      if (isEnglish) answer = `The ${dept.name} offers the following programmes: **${progList}**.`;
      else if (isHindi) answer = `${dept.name} में निम्नलिखित पाठ्यक्रम उपलब्ध हैं: **${progList}**।`;

      return {
        route: 'DEPARTMENT_INFO',
        requiresGemini: false,
        requiresWebSearch: false,
        deterministicResponse: {
          answer,
          language: detectedLang,
          intent: 'department_courses',
          intentCategory: 'INFORMATION',
          responsibleUnit: { name: dept.name, type: 'department', location: dept.location },
          display: { responsibleUnit: true, location: false, contact: false, documents: false, nextSteps: false, sources: true, relatedTopics: false }
        }
      };
    }

    // A4. Specific Contact Request
    if (isContact) {
      let answer = `${dept.name} ka contact: Phone: **${dept.contact?.phone || 'N/A'}**, Email: **${dept.contact?.email || 'N/A'}**.`;
      if (isEnglish) answer = `Contact details for ${dept.name}: Phone: **${dept.contact?.phone || 'N/A'}**, Email: **${dept.contact?.email || 'N/A'}**.`;

      return {
        route: 'CONTACT',
        requiresGemini: false,
        requiresWebSearch: false,
        deterministicResponse: {
          answer,
          language: detectedLang,
          intent: 'department_contact',
          intentCategory: 'CONTACT',
          responsibleUnit: { name: dept.name, type: 'department', location: dept.location },
          contact: { phone: dept.contact?.phone, email: dept.contact?.email, officialWebsite: dept.officialSourceUrl },
          display: { responsibleUnit: true, location: false, contact: true, documents: false, nextSteps: false, sources: true, relatedTopics: false }
        }
      };
    }

    // A5. Broad Department Information Request (e.g. "mujhe CS department se related info chahiye")
    let answer = `Haan, bilkul. **${dept.name}** (${dept.schoolName}) ke baare mein location, courses (${dept.programmes.join(', ')}), HOD ya contact details me se kis cheez ke baare mein janna hai?`;
    if (isEnglish) answer = `Sure! For the **${dept.name}** (${dept.schoolName}), I can help with location, courses (${dept.programmes.join(', ')}), HOD, or contact details. What would you like to know?`;
    else if (isHindi) answer = `हाँ बिल्कुल। **${dept.name}** के बारे में स्थान, पाठ्यक्रम (${dept.programmes.join(', ')}), HOD या संपर्क विवरण में से आप क्या जानना चाहते हैं?`;

    return {
      route: 'DEPARTMENT_INFO',
      requiresGemini: false,
      requiresWebSearch: false,
      deterministicResponse: {
        answer,
        language: detectedLang,
        intent: 'department_overview',
        intentCategory: 'INFORMATION',
        responsibleUnit: { name: dept.name, type: 'department', location: dept.location },
        display: { responsibleUnit: true, location: false, contact: false, documents: false, nextSteps: false, sources: true, relatedTopics: false }
      }
    };
  }

  // B. If Central Library is mentioned
  if (entity.location && entity.location.id === 'loc-central-library') {
    const loc = entity.location;
    let answer = `Haan, Central Library campus mein Arts aur Science faculty ke beech mein sthit hai. Exact location map par dekhna chahte hain?`;
    if (isEnglish) answer = `The Jawaharlal Nehru Central Library is located centrally on campus between Arts and Science faculties. Want me to show you the location on the map?`;
    else if (isHindi) answer = `केंद्रीय पुस्तकालय कला और विज्ञान संकाय के बीच स्थित है। क्या आप इसे मैप पर देखना चाहते हैं?`;
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

  // C. If Scholarship is mentioned
  if (q.includes('scholarship') || q.includes('chhatravritti')) {
    const isAskingWhereToGo = /\b(kahan jana|kaha jana|where to go|location|office|room)\b/i.test(q) ||
      ((q === 'haan' || q === 'yes') && lastAssistantMsg.includes('where to go'));

    if (isAskingWhereToGo || q.includes('approved')) {
      const office = knowledgeService.getOfficeById('office-scholarship-cell')!;
      const loc = knowledgeService.getLocationById('loc-admin-block')!;
      let answer = `Iske liye aapko **University Scholarship Cell** jaana hoga jo **Administrative Block (Room No. 12)** mein hai.`;
      if (isEnglish) answer = `For this, visit the **University Scholarship & Fellowship Cell** in **Room No. 12, Main Administrative Block**.`;

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

    // Scholarship Problem Triage
    let answer = `Achha, scholarship approve ho chuki hai ya abhi portal par pending hai?`;
    if (isEnglish) answer = `Has your scholarship already been approved, or is the application still showing as pending?`;
    else if (isHindi) answer = `क्या आपकी छात्रवृत्ति स्वीकृत (Approved) हो चुकी है, या अभी पेंडिंग है?`;

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

  // -------------------------------------------------------------
  // STAGE 2: PURELY CASUAL & SOCIAL MESSAGES
  // Handled ONLY if NO university entity was present in Stage 1!
  // -------------------------------------------------------------

  // 1. Playful Social ("hello bol", "bol na", "kya haal", "sab badhiya")
  if (
    /\b(hello bol|bol na|bol re|kuch bol|kya haal|kya hal|aur bata|aur bhai|kya chal raha|sab badhiya|kya scene)\b/i.test(q)
  ) {
    let answer = `Hello 😄`;
    if (q.includes('kya haal') || q.includes('aur bata') || q.includes('sab badhiya')) answer = `Sab badhiya! Batao 😄`;
    else if (q.includes('hello bol')) answer = `Hello 😄`;
    else answer = `Haan bolo 😄`;

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

  // 2. Greetings
  if (
    /^(hey|hello|hi|hiya|namaste|pranam|what's up|good morning|good afternoon|good evening|hey there|halo|kaise ho|নমস্কার|வணக்கம்|నమస్కారం|નમસ્તે|ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ|നമസ്കാരം)(\s|!|\.|\?)*$/i.test(q)
  ) {
    let answer = `Hey! 👋`;
    if (detectedLang === 'hindi') answer = `नमस्ते! 👋`;
    else if (detectedLang === 'bengali') answer = `নমস্কার! 👋`;
    else if (detectedLang === 'marathi') answer = `नमस्कार! 👋`;
    else if (detectedLang === 'tamil') answer = `வணக்கம்! 👋`;

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

  // 3. Acknowledgements ("hmm", "hmmm", "acha", "ok", "theek hai", "got it")
  if (
    /^(hmm|hmmm|hmmmm|acha|achha|ok|okay|theek hai|thik hai|theek|thik|got it|sahi hai|fine|cool|alright|nice|great|haan|sahi|होय|बरोबर|ঠিক আছে|சரி)(\s|!|\.|\?)*$/i.test(q)
  ) {
    let answer = `😄`;
    if (q.startsWith('hmm')) answer = `😄`;
    else if (q === 'acha' || q === 'achha') answer = `haan 😄`;
    else if (q === 'theek hai' || q === 'thik hai' || q === 'theek') answer = `Theek hai 👍`;
    else if (q === 'ok' || q === 'okay' || q === 'cool' || q === 'nice') answer = `👍`;

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

  // 4. Testing / Meta
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

  // 5. Nothing / Kuch nahi
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

  // 6. Thanks
  if (/\b(thanks|thank you|thx|dhanyawad|shukriya|ধন্যবাদ|நன்றி|ధన్యవాదాలు|આભાર|ਧੰਨਵਾਦ)\b/i.test(q)) {
    let answer = `Anytime 😄`;
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

  // 7. Farewell
  if (/^(bye|goodbye|see you|alvida|tata|good night|বিদায়)(\s|!|\.|\?)*$/i.test(q)) {
    return {
      route: 'FAREWELL',
      requiresGemini: false,
      requiresWebSearch: false,
      deterministicResponse: {
        answer: `Bye, take care 👋`,
        language: detectedLang,
        intent: 'farewell',
        intentCategory: 'CASUAL_CONVERSATION',
        display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: false, relatedTopics: false }
      }
    };
  }

  // 8. Capability question
  if (/\b(what can you do|kya kar sakte ho|kya kya bata sakte|capabilities|what do you know|help me with|tu kya karta)\b/i.test(q)) {
    let answer = `Campus se related almost kuch bhi pooch sakte ho. Departments, hostels, scholarships, exams, offices, locations ya koi problem ho toh batao.`;
    if (isEnglish) answer = `I can help with departments, campus locations, university services, admissions, exams, scholarships, hostels, and figuring out where to go when you're stuck.`;

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

  // 9. Current notices / Time-sensitive -> Gemini + Web Grounding
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

  // 10. Complex / Multilingual / Unmatched reasoning -> Gemini
  return {
    route: 'COMPLEX_REASONING',
    requiresGemini: true,
    requiresWebSearch: false
  };
}
