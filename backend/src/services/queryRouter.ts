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

export function detectLanguage(text: string, history: Array<{ role: 'user' | 'assistant'; content: string }> = []): 'hinglish' | 'hindi' | 'english' | 'other' {
  const t = text.toLowerCase().trim();
  
  if (/[\u0900-\u097F]/.test(text)) {
    return 'hindi';
  }

  // Common Hinglish marker words
  const hinglishMarkers = [
    'kuch', 'nahi', 'nhi', 'bas', 'checkout', 'check', 'rha', 'rhi', 'raha', 'rahi', 'hu', 'hoon', 'hai', 'hain',
    'kya', 'kaha', 'kahan', 'kidhar', 'kaise', 'kaun', 'kyun', 'kyu', 'kab', 'bhai', 'yaar', 'batao', 'bata',
    'dekh', 'dekhte', 'chal', 'chl', 'samajh', 'pata', 'chahiye', 'karna', 'kare', 'karu', 'karein', 'jana',
    'jaun', 'padega', 'milega', 'mili', 'aaya', 'aayi', 'paisa', 'scene', 'acha', 'achha', 'theek', 'thik',
    'haan', 'sahi', 'leke', 'saath', 'bhi', 'se', 'ko', 'me', 'mein', 'par', 'pe', 'toh', 'to', 'ho', 'gaya',
    'gayi', 'hoga', 'hogi', 'rakha', 'mera', 'meri', 'mere', 'tera', 'teri', 'tere', 'apna', 'apni', 'waise',
    'chalo', 'dikha', 'du', 'do'
  ];

  const words = t.split(/[\s,?.!]+/);
  const hasHinglish = words.some(w => hinglishMarkers.includes(w));
  if (hasHinglish) {
    return 'hinglish';
  }

  // Check recent user message in history if current message is short like "haan", "ok", "acha"
  if (words.length <= 2 && history.length > 0) {
    const lastUserText = history.filter(h => h.role === 'user').slice(-2, -1)[0]?.content.toLowerCase() || '';
    if (lastUserText.split(/[\s,?.!]+/).some(w => hinglishMarkers.includes(w))) {
      return 'hinglish';
    }
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
  const isHinglish = detectedLang === 'hinglish';
  const isHindi = detectedLang === 'hindi';

  const lastUserMsg = conversationHistory.filter(m => m.role === 'user').slice(-2, -1)[0]?.content.toLowerCase() || '';
  const lastAssistantMsg = conversationHistory.filter(m => m.role === 'assistant').slice(-1)[0]?.content.toLowerCase() || '';

  // 1. GREETING ("hey", "hello", "hi", "namaste")
  if (/^(hey|hello|hi|hiya|namaste|pranam|what's up|good morning|good afternoon|good evening|hey there|halo|kaise ho)(\s|!|\.|\?)*$/i.test(q)) {
    let answer = `Hey! 👋 How can I help you around DHSGSU?`;
    if (isHindi) answer = `नमस्ते! 👋 DHSGSU कैंपस में आपकी क्या सहायता करूँ?`;
    else if (isHinglish) answer = `Hey! 👋 Batao, campus mein kis cheez mein help chahiye?`;

    return {
      route: 'GREETING',
      requiresGemini: false,
      requiresWebSearch: false,
      deterministicResponse: {
        answer,
        language: isHindi ? 'Hindi' : isHinglish ? 'Hinglish' : 'English',
        intent: 'greeting',
        intentCategory: 'GREETING',
        display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: false, relatedTopics: false }
      }
    };
  }

  // 2. CASUAL TESTING / META ("bas check kar rha hu", "checkout kar raha hu", "chal raha hai ki nahi", "just testing")
  if (
    /\b(checkout|check|test|testing|chal rha|chal raha|chl rha|chl raha|dekh rha|dekh raha|dekhte|working|kaam kar|aise hi)\b/i.test(q) ||
    q.includes('kuch nahi bas') || q.includes('kuch nhi bas') || q.includes('just checking') || q.includes('just testing')
  ) {
    let answer = `Haha, yep, it's working smoothly 😄\nWhenever you're ready, feel free to ask anything about the campus.`;
    if (isHindi) answer = `हाँ, बिल्कुल चालू है 😄 जब भी कुछ पूछना हो, निसंकोच बताइएगा।`;
    else if (isHinglish) answer = `Haha, haan bhai, bilkul chal raha hai 😄\nJab bhi campus se juda kuch poochna ho, bas bol dena.`;

    return {
      route: 'TESTING',
      requiresGemini: false,
      requiresWebSearch: false,
      deterministicResponse: {
        answer,
        language: isHindi ? 'Hindi' : isHinglish ? 'Hinglish' : 'English',
        intent: 'casual_testing',
        intentCategory: 'CASUAL_CONVERSATION',
        display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: false, relatedTopics: false }
      }
    };
  }

  // 3. NOTHING / "Kuch nahi"
  if (/^(kuch nahi|kuch nhi|nothing|nothing much|never mind|chodo|rehnde|no problem)(\s|!|\.|\?)*$/i.test(q)) {
    let answer = `No worries 😄 Take your time.`;
    if (isHindi) answer = `कोई बात नहीं 😄 आराम से, जब ज़रूरत हो बताइएगा।`;
    else if (isHinglish) answer = `Koi baat nahi 😄 Aaram se, jab zaroorat ho bata dena.`;

    return {
      route: 'CASUAL_CHAT',
      requiresGemini: false,
      requiresWebSearch: false,
      deterministicResponse: {
        answer,
        language: isHindi ? 'Hindi' : isHinglish ? 'Hinglish' : 'English',
        intent: 'casual_chat',
        intentCategory: 'CASUAL_CONVERSATION',
        display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: false, relatedTopics: false }
      }
    };
  }

  // 4. ACKNOWLEDGEMENTS ("Acha", "Okay", "Theek hai", "Got it", "Sahi hai")
  if (/^(acha|achha|ok|okay|theek hai|thik hai|got it|sahi hai|fine|cool|alright|hmm|accha)(\s|!|\.|\?)*$/i.test(q)) {
    let answer = `👍`;
    if (q === 'acha' || q === 'achha' || q === 'accha') answer = `Haan 😄`;

    return {
      route: 'ACKNOWLEDGEMENT',
      requiresGemini: false,
      requiresWebSearch: false,
      deterministicResponse: {
        answer,
        language: isHindi ? 'Hindi' : isHinglish ? 'Hinglish' : 'English',
        intent: 'acknowledgement',
        intentCategory: 'CASUAL_CONVERSATION',
        display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: false, relatedTopics: false }
      }
    };
  }

  // 5. THANKS ("Thank you", "Thanks bhai", "Dhanyawad")
  if (/\b(thanks|thank you|thx|dhanyawad|shukriya)\b/i.test(q)) {
    let answer = `You're welcome! 😊 Feel free to ask anytime.`;
    if (isHindi) answer = `स्वागत है! 😊 कभी भी पूछ सकते हैं।`;
    else if (isHinglish) answer = `Anytime bhai! 😊 Kabhi bhi kuch pooch lena.`;

    return {
      route: 'THANKS',
      requiresGemini: false,
      requiresWebSearch: false,
      deterministicResponse: {
        answer,
        language: isHindi ? 'Hindi' : isHinglish ? 'Hinglish' : 'English',
        intent: 'thanks',
        intentCategory: 'CASUAL_CONVERSATION',
        display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: false, relatedTopics: false }
      }
    };
  }

  // 6. FAREWELL ("Bye", "Alvida", "Good night")
  if (/^(bye|goodbye|see you|alvida|tata|good night)(\s|!|\.|\?)*$/i.test(q)) {
    let answer = `Bye! Take care 👋`;
    if (isHinglish) answer = `Bye bhai, take care 👋`;

    return {
      route: 'FAREWELL',
      requiresGemini: false,
      requiresWebSearch: false,
      deterministicResponse: {
        answer,
        language: isHindi ? 'Hindi' : isHinglish ? 'Hinglish' : 'English',
        intent: 'farewell',
        intentCategory: 'CASUAL_CONVERSATION',
        display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: false, relatedTopics: false }
      }
    };
  }

  // 7. LANGUAGE INQUIRY ("Can you speak Hindi?", "Hinglish samajhte ho?")
  if (/\b(speak hindi|hindi aati|hinglish aati|hindi bol|language|hindi samajh)\b/i.test(q)) {
    return {
      route: 'LANGUAGE_QUERY',
      requiresGemini: false,
      requiresWebSearch: false,
      deterministicResponse: {
        answer: `Bilkul! Hindi, Hinglish ya English — jis mein comfortable ho usmein baat kar sakte ho 😄`,
        language: 'Hinglish',
        intent: 'language_capabilities',
        intentCategory: 'CASUAL_CONVERSATION',
        display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: false, relatedTopics: false }
      }
    };
  }

  // 8. CAPABILITIES ("What can you help with?", "Tu kya kya bata sakta hai?")
  if (/\b(what can you do|kya kar sakte ho|kya kya bata sakte|capabilities|what do you know|help me with)\b/i.test(q)) {
    let answer = `I can help with departments, campus locations, university services, admissions, exams, scholarships, hostels, and figuring out where to go when you're stuck.`;
    if (isHinglish) answer = `Campus se related almost kuch bhi pooch sakte ho — departments, hostels, scholarships, exams, offices, locations, admission ya koi problem ho toh batao, main guide kar dunga.`;
    else if (isHindi) answer = `मैं विश्वविद्यालय के विभागों, छात्रावास, छात्रवृत्ति, परीक्षा, प्रशासनिक कार्यालयों, परिसर स्थानों और विद्यार्थी सेवाओं की पूरी जानकारी में आपकी सहायता कर सकता हूँ।`;

    return {
      route: 'CAPABILITIES',
      requiresGemini: false,
      requiresWebSearch: false,
      deterministicResponse: {
        answer,
        language: isHindi ? 'Hindi' : isHinglish ? 'Hinglish' : 'English',
        intent: 'capabilities',
        intentCategory: 'CASUAL_CONVERSATION',
        display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: false, relatedTopics: false }
      }
    };
  }

  // 9. "NOT SURE WHERE TO GO"
  if (
    q.includes('nahi pata') || q.includes('dont know where to go') || q.includes("don't know where to go") ||
    q.includes('kahan jau') || q.includes('kaha jau') || q.includes('kis office mein')
  ) {
    let answer = `No worries! Tell me what you're trying to get done (e.g. scholarship pending, marksheet error, exam fee glitch, or hostel room), and I'll guide you step-by-step to the right place.`;
    if (isHinglish) answer = `Koi baat nahi! Aap bas apni problem batao (jaise scholarship pending hai, marksheet mein error hai, fee issue hai ya hostel chahiye) — main exact office aur location bata dunga.`;
    else if (isHindi) answer = `कोई बात नहीं! आप बस अपनी समस्या बताइए (जैसे छात्रवृत्ति पेंडिंग है, अंकसूची सुधार, फीस या हॉस्टल) — मैं आपको सही कार्यालय और स्थान बता दूँगा।`;

    return {
      route: 'PROBLEM_TRIAGE',
      requiresGemini: false,
      requiresWebSearch: false,
      deterministicResponse: {
        answer,
        language: isHindi ? 'Hindi' : isHinglish ? 'Hinglish' : 'English',
        intent: 'triage_initiation',
        intentCategory: 'PROBLEM_SOLVING',
        display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: false, relatedTopics: false }
      }
    };
  }

  // 10. FOLLOW-UP: "Where to go?" / "Haan kahan jana hai?" / "Location batao"
  const isAskingLocationFollowUp = 
    /\b(kahan jana|kaha jana|where to go|where should i go|location batao|kahan hai|kidhar hai)\b/i.test(q) ||
    ((q === 'haan' || q === 'yes' || q.includes('batao') || q.includes('chalo') || q.includes('dikha')) && 
     (lastAssistantMsg.includes('where to go') || lastAssistantMsg.includes('location') || lastAssistantMsg.includes('kahan') || lastAssistantMsg.includes('dikha')));

  if (isAskingLocationFollowUp) {
    if (lastAssistantMsg.includes('scholarship') || lastUserMsg.includes('scholarship')) {
      const office = knowledgeService.getOfficeById('office-scholarship-cell')!;
      const loc = knowledgeService.getLocationById('loc-admin-block')!;
      let answer = `For this, visit the **University Scholarship & Fellowship Cell** located in **Room No. 12, Main Administrative Block**.`;
      if (isHinglish) answer = `Iske liye aapko **University Scholarship Cell** jaana hoga jo **Administrative Block (Room No. 12)** mein hai.`;
      else if (isHindi) answer = `इसके लिए आपको **University Scholarship Cell (प्रशासनिक भवन, कमरा नंबर 12)** में जाना होगा।`;

      return {
        route: 'FOLLOW_UP',
        requiresGemini: false,
        requiresWebSearch: false,
        deterministicResponse: {
          answer,
          language: isHindi ? 'Hindi' : isHinglish ? 'Hinglish' : 'English',
          intent: 'scholarship_location',
          intentCategory: 'LOCATION',
          responsibleUnit: { name: office.name, type: 'office', location: office.location, officeHours: office.officeHours },
          location: { name: loc.name, building: loc.building, floor: 'Ground Floor (Room No. 12)', landmark: loc.landmark, mapLink: loc.mapLink, coordinates: loc.coordinates },
          display: { responsibleUnit: true, location: true, contact: false, documents: false, nextSteps: true, sources: true, relatedTopics: false }
        }
      };
    }

    if (lastAssistantMsg.includes('marksheet') || lastUserMsg.includes('marksheet')) {
      const office = knowledgeService.getOfficeById('office-exam-cell')!;
      const loc = knowledgeService.getLocationById('loc-pariksha-bhawan')!;
      let answer = `For marksheet correction, visit the **Examination Cell (Pariksha Bhawan)** located near the Main Administrative Block.`;
      if (isHinglish) answer = `Iske liye aapko **Examination Cell (Pariksha Bhawan)** jaana hoga jo Main Administrative Block ke paas hai.`;
      else if (isHindi) answer = `इसके लिए आपको **परीक्षा भवन (Examination Cell)** में जाना होगा जो प्रशासनिक भवन के समीप स्थित है।`;

      return {
        route: 'FOLLOW_UP',
        requiresGemini: false,
        requiresWebSearch: false,
        deterministicResponse: {
          answer,
          language: isHindi ? 'Hindi' : isHinglish ? 'Hinglish' : 'English',
          intent: 'marksheet_location',
          intentCategory: 'LOCATION',
          responsibleUnit: { name: office.name, type: 'office', location: office.location, officeHours: office.officeHours },
          location: { name: loc.name, building: loc.building, floor: loc.floor, landmark: loc.landmark, mapLink: loc.mapLink, coordinates: loc.coordinates },
          display: { responsibleUnit: true, location: true, contact: false, documents: false, nextSteps: true, sources: true, relatedTopics: false }
        }
      };
    }

    if (lastAssistantMsg.includes('library') || lastUserMsg.includes('library')) {
      const loc = knowledgeService.getLocationById('loc-central-library')!;
      let answer = `The **Jawaharlal Nehru Central Library** is centrally located between Arts and Science blocks on Patharia Hills.`;
      if (isHinglish) answer = `Central Library Arts aur Science blocks ke beech mein Patharia Hills campus par hai.`;
      else if (isHindi) answer = `केंद्रीय पुस्तकालय कला और विज्ञान संकाय के बीच मुख्य परिसर में स्थित है।`;

      return {
        route: 'FOLLOW_UP',
        requiresGemini: false,
        requiresWebSearch: false,
        deterministicResponse: {
          answer,
          language: isHindi ? 'Hindi' : isHinglish ? 'Hinglish' : 'English',
          intent: 'library_location',
          intentCategory: 'LOCATION',
          location: { name: loc.name, building: loc.building, landmark: loc.landmark, mapLink: loc.mapLink, coordinates: loc.coordinates },
          display: { responsibleUnit: false, location: true, contact: false, documents: false, nextSteps: false, sources: true, relatedTopics: false }
        }
      };
    }
  }

  // 11. FOLLOW-UP: "What documents to take?" / "Kya documents le jaun?"
  if (/\b(document|documents|dastavej|kya le jaun|what to bring|what should i take|kya leke jana)\b/i.test(q)) {
    let service = knowledgeService.getServiceById('service-scholarship-support')!;
    if (lastAssistantMsg.includes('marksheet') || lastUserMsg.includes('marksheet')) {
      service = knowledgeService.getServiceById('service-marksheet-correction')!;
    } else if (lastAssistantMsg.includes('hostel') || lastUserMsg.includes('hostel')) {
      service = knowledgeService.getServiceById('service-hostel-allotment')!;
    } else if (lastAssistantMsg.includes('bonafide') || lastUserMsg.includes('bonafide')) {
      service = knowledgeService.getServiceById('service-bonafide-cert')!;
    }

    let answer = `Here are the required documents you should bring:`;
    if (isHinglish) answer = `Aapko yeh documents saath le jaane honge:`;
    else if (isHindi) answer = `आपको ये आवश्यक दस्तावेज साथ ले जाने होंगे:`;

    return {
      route: 'DOCUMENTS',
      requiresGemini: false,
      requiresWebSearch: false,
      deterministicResponse: {
        answer,
        language: isHindi ? 'Hindi' : isHinglish ? 'Hinglish' : 'English',
        intent: 'documents_checklist',
        intentCategory: 'PROCESS',
        requiredDocuments: service.requiredDocuments,
        nextSteps: service.process,
        display: { responsibleUnit: false, location: false, contact: false, documents: true, nextSteps: true, sources: true, relatedTopics: false }
      }
    };
  }

  // 12. FOLLOW-UP: "Number hai?" / "Phone number" / "Email"
  if (/\b(number|phone|helpline|contact|email|number hai|number milega)\b/i.test(q)) {
    let office = knowledgeService.getOfficeById('office-exam-cell')!;
    if (q.includes('scholarship') || lastAssistantMsg.includes('scholarship') || lastUserMsg.includes('scholarship')) {
      office = knowledgeService.getOfficeById('office-scholarship-cell')!;
    } else if (q.includes('health') || q.includes('medical')) {
      office = knowledgeService.getOfficeById('office-health-centre')!;
    } else if (q.includes('dsw') || q.includes('welfare')) {
      office = knowledgeService.getOfficeById('office-dsw')!;
    }

    let answer = `Here are the official contact details for **${office.name}**:`;
    if (isHinglish) answer = `**${office.name}** ka verified contact yeh hai:`;
    else if (isHindi) answer = `**${office.name}** का संपर्क विवरण यह है:`;

    return {
      route: 'CONTACT',
      requiresGemini: false,
      requiresWebSearch: false,
      deterministicResponse: {
        answer,
        language: isHindi ? 'Hindi' : isHinglish ? 'Hinglish' : 'English',
        intent: 'contact_info',
        intentCategory: 'CONTACT',
        responsibleUnit: { name: office.name, type: 'office', location: office.location, officeHours: office.officeHours },
        contact: { phone: office.contact?.phone, helpline: office.contact?.helpline, email: office.contact?.email, officialWebsite: office.officialSourceUrl },
        display: { responsibleUnit: true, location: false, contact: true, documents: false, nextSteps: false, sources: true, relatedTopics: false }
      }
    };
  }

  // 13. PROBLEM: "Meri scholarship nahi aayi" (Turn 1)
  if (
    q.includes('scholarship nahi aayi') || q.includes('scholarship pending') ||
    q.includes('scholarship ka paisa') || q.includes('scholarship kab milegi') ||
    (q.includes('scholarship') && (q.includes('problem') || q.includes('nahi mila') || q.includes('status') || q.includes('scene')))
  ) {
    let answer = `Sure, I can help you figure that out. Has the scholarship already been approved, or is the application still pending on the portal?`;
    if (isHinglish) answer = `Haan, dekhte hain. Scholarship approve ho chuki hai ya abhi portal par pending dikha rahi hai?`;
    else if (isHindi) answer = `ज़रूर। क्या आपकी छात्रवृत्ति पोर्टल पर स्वीकृत (Approved) हो चुकी है, या अभी पेंडिंग है?`;

    return {
      route: 'PROBLEM_TRIAGE',
      requiresGemini: false,
      requiresWebSearch: false,
      deterministicResponse: {
        answer,
        language: isHindi ? 'Hindi' : isHinglish ? 'Hinglish' : 'English',
        intent: 'scholarship_triage',
        intentCategory: 'PROBLEM_SOLVING',
        followUpQuestion: 'Approved or pending verification?',
        display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: false, relatedTopics: false }
      }
    };
  }

  // 14. PROBLEM: "Approved hai but payment nahi aayi" (Turn 2)
  if (
    (q.includes('approved') || q.includes('approve ho gaya') || q.includes('approve hai') || q.includes('paas ho gaya')) &&
    (lastAssistantMsg.includes('scholarship') || lastUserMsg.includes('scholarship') || q.includes('scholarship'))
  ) {
    let answer = `Got it. So the issue is with the payment disbursement rather than the application status. I can guide you to the relevant university office. Would you like to know where to go?`;
    if (isHinglish) answer = `Achha, matlab application side se approve hai but payment nahi aayi. Is case mein payment/disbursement side check karni padegi. Kahan jaana hai bata du?`;
    else if (isHindi) answer = `समझ गया। यानी फॉर्म स्वीकृत है पर राशि नहीं आई। क्या आप जानना चाहते हैं कि इसके लिए कैंपस में कहाँ संपर्क करना है?`;

    return {
      route: 'PROBLEM_TRIAGE',
      requiresGemini: false,
      requiresWebSearch: false,
      deterministicResponse: {
        answer,
        language: isHindi ? 'Hindi' : isHinglish ? 'Hinglish' : 'English',
        intent: 'scholarship_approved_disbursement',
        intentCategory: 'PROBLEM_SOLVING',
        display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: false, relatedTopics: false }
      }
    };
  }

  // 15. PROBLEM: "Marksheet mein correction karwana hai" (Turn 1)
  if (q.includes('marksheet') && (q.includes('correction') || q.includes('sudhar') || q.includes('galat') || q.includes('spelling') || q.includes('galti'))) {
    let answer = `Sure. What needs to be corrected on the marksheet, your personal details (name/roll no) or something related to marks/subject codes?`;
    if (isHinglish) answer = `Haan, marksheet mein kis cheez ka correction karwana hai — personal details (naam/roll no) ya fir marks/subjects se related koi issue hai?`;
    else if (isHindi) answer = `मार्कशीट में किस विवरण में सुधार करवाना है — व्यक्तिगत विवरण (नाम/रोल नंबर) या अंक/विषय में?`;

    return {
      route: 'PROBLEM_TRIAGE',
      requiresGemini: false,
      requiresWebSearch: false,
      deterministicResponse: {
        answer,
        language: isHindi ? 'Hindi' : isHinglish ? 'Hinglish' : 'English',
        intent: 'marksheet_correction_triage',
        intentCategory: 'PROBLEM_SOLVING',
        display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: false, relatedTopics: false }
      }
    };
  }

  // 16. DIRECT LOCATION: Library
  if (q.includes('library kaha') || q.includes('library kahan') || q.includes('library kidhar') || q.includes('where is the library') || q.includes('central library')) {
    const loc = knowledgeService.getLocationById('loc-central-library')!;
    let answer = `The Central Library is located centrally on the DHSGSU campus between the Arts and Science blocks. Want me to show you the location on the map?`;
    if (isHinglish) answer = `Central Library Arts aur Science faculty ke beech mein campus ke central area mein hai. Chaho toh location dikha du?`;
    else if (isHindi) answer = `केंद्रीय पुस्तकालय कला और विज्ञान संकाय के बीच स्थित है। क्या आप इसे मैप पर देखना चाहते हैं?`;

    return {
      route: 'LOCATION',
      requiresGemini: false,
      requiresWebSearch: false,
      deterministicResponse: {
        answer,
        language: isHindi ? 'Hindi' : isHinglish ? 'Hinglish' : 'English',
        intent: 'library_location',
        intentCategory: 'LOCATION',
        location: { name: loc.name, building: loc.building, landmark: loc.landmark, mapLink: loc.mapLink, coordinates: loc.coordinates },
        display: { responsibleUnit: false, location: true, contact: false, documents: false, nextSteps: false, sources: true, relatedTopics: false }
      }
    };
  }

  // 17. DIRECT LOCATION: MCA Department
  if (q.includes('mca') && (q.includes('kaha') || q.includes('kahan') || q.includes('kidhar') || q.includes('where') || q.includes('department'))) {
    const dept = knowledgeService.getDepartmentById('dept-cs-applications')!;
    const loc = knowledgeService.getLocationById('loc-csa-building')!;
    let answer = `The MCA programme is run by the Department of Computer Science & Applications (CSA Building on the Upper Campus near the Science Block).`;
    if (isHinglish) answer = `MCA Department of Computer Science & Applications (CSA Building) mein hai, jo Upper Campus par Science Block ke paas hai.`;
    else if (isHindi) answer = `MCA विभाग कंप्यूटर साइंस एंड एप्लीकेशंस (CSA भवन) में स्थित है, जो अपर कैंपस में स्थित है।`;

    return {
      route: 'LOCATION',
      requiresGemini: false,
      requiresWebSearch: false,
      deterministicResponse: {
        answer,
        language: isHindi ? 'Hindi' : isHinglish ? 'Hinglish' : 'English',
        intent: 'mca_department_location',
        intentCategory: 'LOCATION',
        location: { name: dept.building, building: dept.building, landmark: 'Patharia Hills Campus', mapLink: dept.mapLink, coordinates: loc.coordinates },
        display: { responsibleUnit: false, location: true, contact: false, documents: false, nextSteps: false, sources: true, relatedTopics: false }
      }
    };
  }

  // 18. CURRENT / TIME-SENSITIVE -> Require Gemini + Search Grounding
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

  // 19. COMPLEX / UNCERTAIN -> Escalate to Gemini
  return {
    route: 'COMPLEX_REASONING',
    requiresGemini: true,
    requiresWebSearch: false
  };
}
