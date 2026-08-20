import { StructuredAnswer } from '../types/index.js';
import { knowledgeService } from './knowledgeService.js';

export type RouteType = 
  | 'GREETING'
  | 'CASUAL_CHAT'
  | 'TESTING'
  | 'ACKNOWLEDGEMENT'
  | 'THANKS'
  | 'FAREWELL'
  | 'CAPABILITIES'
  | 'LOCAL_FACT'
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

export function routeQuery(
  query: string,
  lang = 'auto',
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
): RouteDecision {
  const q = query.toLowerCase().trim();
  const isHindiOrHinglish = /[\u0900-\u097F]/.test(query) || 
    /\b(kaha|kahan|kya|hai|kare|batao|nahi|chahiye|chal|rha|rhi|dekh|acha|haan|theek|bhai|kaise|milega|jana|paisa|pata|jana|suvidha)\b/i.test(q);

  const lastUserMsg = conversationHistory.filter(m => m.role === 'user').slice(-2, -1)[0]?.content.toLowerCase() || '';
  const lastAssistantMsg = conversationHistory.filter(m => m.role === 'assistant').slice(-1)[0]?.content.toLowerCase() || '';

  // 1. GREETING
  if (/^(hey|hello|hi|hiya|namaste|pranam|what's up|good morning|good afternoon|good evening|hey there|halo|kaise ho)(\s|!|\.|\?)*$/i.test(q)) {
    return {
      route: 'GREETING',
      requiresGemini: false,
      requiresWebSearch: false,
      deterministicResponse: {
        answer: isHindiOrHinglish
          ? `Hey! 👋 DHSGSU कैंपस में आपकी क्या मदद करूँ?`
          : `Hey! 👋 How can I help you around DHSGSU?`,
        language: isHindiOrHinglish ? 'Hinglish' : 'English',
        intent: 'greeting',
        intentCategory: 'GREETING',
        display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: false, relatedTopics: false }
      }
    };
  }

  // 2. CASUAL TESTING / "Bas check kar raha hu" / "Working or not"
  if (
    /\b(check|test|working|chal rha|chal raha|dekh raha|dekh rha|kuch nahi bas|bas aise hi|testing)\b/i.test(q) ||
    q.includes('chl rha') || q.includes('chal raha ki nahi') || q.includes('working or not')
  ) {
    return {
      route: 'TESTING',
      requiresGemini: false,
      requiresWebSearch: false,
      deterministicResponse: {
        answer: isHindiOrHinglish
          ? `Haha, haan, bilkul chal raha hai 😄\nJab bhi campus se juda kuch poochna ho, bas puch lena.`
          : `Haha, yep, it's working smoothly 😄\nWhenever you're ready, feel free to ask anything about the campus.`,
        language: isHindiOrHinglish ? 'Hinglish' : 'English',
        intent: 'casual_testing',
        intentCategory: 'CASUAL_CONVERSATION',
        display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: false, relatedTopics: false }
      }
    };
  }

  // 3. NOTHING / "Kuch nahi"
  if (
    /^(kuch nahi|kuch nhi|nothing|nothing much|never mind|chodo|rehnde)(\s|!|\.|\?)*$/i.test(q)
  ) {
    return {
      route: 'CASUAL_CHAT',
      requiresGemini: false,
      requiresWebSearch: false,
      deterministicResponse: {
        answer: isHindiOrHinglish
          ? `No worries 😄 Aaram se, jab zaroorat ho bata dena.`
          : `No worries 😄 Take your time.`,
        language: isHindiOrHinglish ? 'Hinglish' : 'English',
        intent: 'casual_chat',
        intentCategory: 'CASUAL_CONVERSATION',
        display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: false, relatedTopics: false }
      }
    };
  }

  // 4. ACKNOWLEDGEMENTS ("Acha", "Okay", "Theek hai", "Got it", "Sahi hai")
  if (/^(acha|achha|ok|okay|theek hai|thik hai|got it|sahi hai|fine|cool|alright|hmm|accha)(\s|!|\.|\?)*$/i.test(q)) {
    return {
      route: 'ACKNOWLEDGEMENT',
      requiresGemini: false,
      requiresWebSearch: false,
      deterministicResponse: {
        answer: isHindiOrHinglish ? `👍` : `👍`,
        language: isHindiOrHinglish ? 'Hinglish' : 'English',
        intent: 'acknowledgement',
        intentCategory: 'CASUAL_CONVERSATION',
        display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: false, relatedTopics: false }
      }
    };
  }

  // 5. THANKS ("Thank you", "Thanks", "Dhanyawad", "Shukriya")
  if (/\b(thanks|thank you|thx|dhanyawad|shukriya|bahut dhanyawad)\b/i.test(q)) {
    return {
      route: 'THANKS',
      requiresGemini: false,
      requiresWebSearch: false,
      deterministicResponse: {
        answer: isHindiOrHinglish ? `You're welcome! 😊 Kabhi bhi kuch pooch sakte ho.` : `You're welcome! 😊 Feel free to ask anytime.`,
        language: isHindiOrHinglish ? 'Hinglish' : 'English',
        intent: 'thanks',
        intentCategory: 'CASUAL_CONVERSATION',
        display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: false, relatedTopics: false }
      }
    };
  }

  // 6. FAREWELL ("Bye", "Alvida", "Good night", "See you")
  if (/^(bye|goodbye|see you|alvida|tata|good night)(\s|!|\.|\?)*$/i.test(q)) {
    return {
      route: 'FAREWELL',
      requiresGemini: false,
      requiresWebSearch: false,
      deterministicResponse: {
        answer: isHindiOrHinglish ? `Bye! Take care 👋` : `Bye! Take care 👋`,
        language: isHindiOrHinglish ? 'Hinglish' : 'English',
        intent: 'farewell',
        intentCategory: 'CASUAL_CONVERSATION',
        display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: false, relatedTopics: false }
      }
    };
  }

  // 7. CAPABILITIES ("What can you do?", "Kya kar sakte ho?")
  if (/\b(what can you do|kya kar sakte ho|capabilities|what do you know|help me with)\b/i.test(q)) {
    return {
      route: 'CAPABILITIES',
      requiresGemini: false,
      requiresWebSearch: false,
      deterministicResponse: {
        answer: isHindiOrHinglish
          ? `Main DHSGSU campus ke departments, scholarship, marksheet correction, exam issues, hostel, library aur medical facilities ke process aur location batane mein madad kar sakta hoon.\n\nAapko kis cheez mein help chahiye?`
          : `I can help you navigate DHSGSU: finding departments, resolving scholarship or marksheet issues, exam form glitches, hostel allotment, and campus facilities.\n\nWhat do you need help with?`,
        language: isHindiOrHinglish ? 'Hinglish' : 'English',
        intent: 'capabilities',
        intentCategory: 'CASUAL_CONVERSATION',
        display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: false, relatedTopics: false }
      }
    };
  }

  // 8. "NOT SURE WHERE TO GO"
  if (
    q.includes('nahi pata') || q.includes('dont know where to go') || q.includes("don't know where to go") ||
    q.includes('kahan jau') || q.includes('kaha jau') || q.includes('kis office mein')
  ) {
    return {
      route: 'PROBLEM_TRIAGE',
      requiresGemini: false,
      requiresWebSearch: false,
      deterministicResponse: {
        answer: isHindiOrHinglish
          ? `Koi baat nahi! Aap bas apni problem bataiye (jaise scholarship pending hai, marksheet mein error hai, fee issue hai ya hostel chahiye) — main aapko exact office aur location bata doonga.`
          : `No worries! Just tell me what you're trying to get done (e.g. scholarship pending, marksheet error, exam fee glitch, or hostel room), and I'll tell you exactly which office to visit.`,
        language: isHindiOrHinglish ? 'Hinglish' : 'English',
        intent: 'triage_initiation',
        intentCategory: 'PROBLEM_SOLVING',
        display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: false, relatedTopics: false }
      }
    };
  }

  // 9. FOLLOW-UP: "Where to go?" / "Haan kahan jana hai?" / "Location batao"
  const isAskingLocationFollowUp = 
    /\b(kahan jana|kaha jana|where to go|where should i go|location batao|kahan hai)\b/i.test(q) ||
    ((q === 'haan' || q === 'yes' || q.includes('batao') || q.includes('chalo')) && (lastAssistantMsg.includes('where to go') || lastAssistantMsg.includes('location') || lastAssistantMsg.includes('kahan jana')));

  if (isAskingLocationFollowUp) {
    if (lastAssistantMsg.includes('scholarship') || lastUserMsg.includes('scholarship')) {
      const office = knowledgeService.getOfficeById('office-scholarship-cell')!;
      const loc = knowledgeService.getLocationById('loc-admin-block')!;
      return {
        route: 'FOLLOW_UP',
        requiresGemini: false,
        requiresWebSearch: false,
        deterministicResponse: {
          answer: isHindiOrHinglish
            ? `Iske liye aapko **University Scholarship Cell** jaana hoga jo **Administrative Block (Room No. 12)** mein hai.`
            : `For this, visit the **University Scholarship & Fellowship Cell** located in **Room No. 12, Main Administrative Block**.`,
          language: isHindiOrHinglish ? 'Hinglish' : 'English',
          intent: 'scholarship_location',
          intentCategory: 'LOCATION',
          responsibleUnit: {
            name: office.name,
            type: 'office',
            location: office.location,
            officeHours: office.officeHours
          },
          location: {
            name: loc.name,
            building: loc.building,
            floor: 'Ground Floor (Room No. 12)',
            landmark: loc.landmark,
            mapLink: loc.mapLink,
            coordinates: loc.coordinates
          },
          display: { responsibleUnit: true, location: true, contact: false, documents: false, nextSteps: true, sources: true, relatedTopics: false }
        }
      };
    }

    if (lastAssistantMsg.includes('marksheet') || lastUserMsg.includes('marksheet')) {
      const office = knowledgeService.getOfficeById('office-exam-cell')!;
      const loc = knowledgeService.getLocationById('loc-pariksha-bhawan')!;
      return {
        route: 'FOLLOW_UP',
        requiresGemini: false,
        requiresWebSearch: false,
        deterministicResponse: {
          answer: isHindiOrHinglish
            ? `Iske liye aapko **Examination Cell (Pariksha Bhawan)** jaana hoga jo Main Administrative Block ke paas hai.`
            : `For this, visit the **Examination Cell (Pariksha Bhawan)** located adjacent to the Main Administrative Block.`,
          language: isHindiOrHinglish ? 'Hinglish' : 'English',
          intent: 'marksheet_location',
          intentCategory: 'LOCATION',
          responsibleUnit: {
            name: office.name,
            type: 'office',
            location: office.location,
            officeHours: office.officeHours
          },
          location: {
            name: loc.name,
            building: loc.building,
            floor: loc.floor,
            landmark: loc.landmark,
            mapLink: loc.mapLink,
            coordinates: loc.coordinates
          },
          display: { responsibleUnit: true, location: true, contact: false, documents: false, nextSteps: true, sources: true, relatedTopics: false }
        }
      };
    }
  }

  // 10. FOLLOW-UP: "What documents to take?" / "Kya documents le jaun?"
  if (/\b(document|documents|dastavej|kya le jaun|what to bring|what should i take)\b/i.test(q)) {
    let service = knowledgeService.getServiceById('service-scholarship-support')!;
    if (lastAssistantMsg.includes('marksheet') || lastUserMsg.includes('marksheet')) {
      service = knowledgeService.getServiceById('service-marksheet-correction')!;
    } else if (lastAssistantMsg.includes('hostel') || lastUserMsg.includes('hostel')) {
      service = knowledgeService.getServiceById('service-hostel-allotment')!;
    } else if (lastAssistantMsg.includes('bonafide') || lastUserMsg.includes('bonafide')) {
      service = knowledgeService.getServiceById('service-bonafide-cert')!;
    }

    return {
      route: 'DOCUMENTS',
      requiresGemini: false,
      requiresWebSearch: false,
      deterministicResponse: {
        answer: isHindiOrHinglish
          ? `Aapko yeh documents saath le jaane honge:`
          : `Here are the required documents you should bring:`,
        language: isHindiOrHinglish ? 'Hinglish' : 'English',
        intent: 'documents_checklist',
        intentCategory: 'PROCESS',
        requiredDocuments: service.requiredDocuments,
        nextSteps: service.process,
        display: { responsibleUnit: false, location: false, contact: false, documents: true, nextSteps: true, sources: true, relatedTopics: false }
      }
    };
  }

  // 11. FOLLOW-UP: "Number hai?" / "Phone number" / "Email"
  if (/\b(number|phone|helpline|contact|email|number hai)\b/i.test(q)) {
    let office = knowledgeService.getOfficeById('office-exam-cell')!;
    if (q.includes('scholarship') || lastAssistantMsg.includes('scholarship') || lastUserMsg.includes('scholarship')) {
      office = knowledgeService.getOfficeById('office-scholarship-cell')!;
    } else if (q.includes('health') || q.includes('medical')) {
      office = knowledgeService.getOfficeById('office-health-centre')!;
    } else if (q.includes('dsw') || q.includes('welfare')) {
      office = knowledgeService.getOfficeById('office-dsw')!;
    }

    return {
      route: 'CONTACT',
      requiresGemini: false,
      requiresWebSearch: false,
      deterministicResponse: {
        answer: isHindiOrHinglish
          ? `**${office.name}** ka contact details yeh hai:`
          : `Here are the official contact details for **${office.name}**:`,
        language: isHindiOrHinglish ? 'Hinglish' : 'English',
        intent: 'contact_info',
        intentCategory: 'CONTACT',
        responsibleUnit: {
          name: office.name,
          type: 'office',
          location: office.location,
          officeHours: office.officeHours
        },
        contact: {
          phone: office.contact?.phone,
          helpline: office.contact?.helpline,
          email: office.contact?.email,
          officialWebsite: office.officialSourceUrl
        },
        display: { responsibleUnit: true, location: false, contact: true, documents: false, nextSteps: false, sources: true, relatedTopics: false }
      }
    };
  }

  // 12. PROBLEM: "Meri scholarship nahi aayi" (Turn 1)
  if (
    q.includes('scholarship nahi aayi') || q.includes('scholarship pending') ||
    q.includes('scholarship ka paisa') || q.includes('scholarship kab milegi') ||
    (q.includes('scholarship') && (q.includes('problem') || q.includes('nahi mila') || q.includes('status')))
  ) {
    return {
      route: 'PROBLEM_TRIAGE',
      requiresGemini: false,
      requiresWebSearch: false,
      deterministicResponse: {
        answer: isHindiOrHinglish
          ? `Sure, I can help you figure that out. Has the scholarship already been approved, or is the application still pending on the portal?`
          : `Sure, I can help you figure that out. Has your scholarship already been approved, or is the application still showing as pending on the portal?`,
        language: isHindiOrHinglish ? 'Hinglish' : 'English',
        intent: 'scholarship_triage',
        intentCategory: 'PROBLEM_SOLVING',
        followUpQuestion: 'Has it been approved or is it pending?',
        display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: false, relatedTopics: false }
      }
    };
  }

  // 13. PROBLEM: "Approved hai but payment nahi aayi" (Turn 2)
  if (
    (q.includes('approved') || q.includes('approve ho gaya') || q.includes('paas ho gaya')) &&
    (lastAssistantMsg.includes('scholarship') || lastUserMsg.includes('scholarship') || q.includes('scholarship'))
  ) {
    return {
      route: 'PROBLEM_TRIAGE',
      requiresGemini: false,
      requiresWebSearch: false,
      deterministicResponse: {
        answer: isHindiOrHinglish
          ? `Got it. So the issue is with the payment rather than the application status. I can guide you to the relevant university support. Do you want to know where to go?`
          : `Got it. So the issue is with the payment disbursement rather than the application status. I can guide you to the relevant university office. Would you like to know where to go?`,
        language: isHindiOrHinglish ? 'Hinglish' : 'English',
        intent: 'scholarship_approved_disbursement',
        intentCategory: 'PROBLEM_SOLVING',
        display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: false, relatedTopics: false }
      }
    };
  }

  // 14. PROBLEM: "Marksheet mein correction karwana hai" (Turn 1)
  if (q.includes('marksheet') && (q.includes('correction') || q.includes('sudhar') || q.includes('galat') || q.includes('spelling'))) {
    return {
      route: 'PROBLEM_TRIAGE',
      requiresGemini: false,
      requiresWebSearch: false,
      deterministicResponse: {
        answer: isHindiOrHinglish
          ? `Sure. What needs to be corrected on the marksheet, your personal details (name/roll no) or something related to marks/subjects?`
          : `Sure. What needs to be corrected on the marksheet, your personal details or something related to marks/subject codes?`,
        language: isHindiOrHinglish ? 'Hinglish' : 'English',
        intent: 'marksheet_correction_triage',
        intentCategory: 'PROBLEM_SOLVING',
        display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: false, relatedTopics: false }
      }
    };
  }

  // 15. DIRECT LOCATION: Library
  if (q.includes('library kaha') || q.includes('library kahan') || q.includes('where is the library') || q.includes('central library')) {
    const loc = knowledgeService.getLocationById('loc-central-library')!;
    return {
      route: 'LOCATION',
      requiresGemini: false,
      requiresWebSearch: false,
      deterministicResponse: {
        answer: isHindiOrHinglish
          ? `The Central Library is on the DHSGSU campus (between Arts and Science blocks). Want me to show you the location on the map?`
          : `The Central Library is centrally located on the DHSGSU campus between Faculty of Arts and Science Complex. Want me to show you the location on the map?`,
        language: isHindiOrHinglish ? 'Hinglish' : 'English',
        intent: 'library_location',
        intentCategory: 'LOCATION',
        location: {
          name: loc.name,
          building: loc.building,
          landmark: loc.landmark,
          mapLink: loc.mapLink,
          coordinates: loc.coordinates
        },
        display: { responsibleUnit: false, location: true, contact: false, documents: false, nextSteps: false, sources: true, relatedTopics: false }
      }
    };
  }

  // 16. DIRECT LOCATION: MCA Department
  if (q.includes('mca') && (q.includes('kaha') || q.includes('kahan') || q.includes('where') || q.includes('department'))) {
    const dept = knowledgeService.getDepartmentById('dept-cs-applications')!;
    const loc = knowledgeService.getLocationById('loc-csa-building')!;
    return {
      route: 'LOCATION',
      requiresGemini: false,
      requiresWebSearch: false,
      deterministicResponse: {
        answer: isHindiOrHinglish
          ? `MCA is associated with the Department of Computer Science & Applications (CSA Building on Upper Campus).`
          : `The MCA programme is run by the Department of Computer Science & Applications (CSA Building, Upper Campus).`,
        language: isHindiOrHinglish ? 'Hinglish' : 'English',
        intent: 'mca_department_location',
        intentCategory: 'LOCATION',
        location: {
          name: dept.building,
          building: dept.building,
          landmark: 'Patharia Hills Campus',
          mapLink: dept.mapLink,
          coordinates: loc.coordinates
        },
        display: { responsibleUnit: false, location: true, contact: false, documents: false, nextSteps: false, sources: true, relatedTopics: false }
      }
    };
  }

  // 17. CURRENT / TIME-SENSITIVE QUERIES -> Require Gemini + Search Grounding
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

  // 18. COMPLEX / UNCERTAIN QUERIES -> Escalate to Gemini AI Reasoning (Compact Context)
  return {
    route: 'COMPLEX_REASONING',
    requiresGemini: true,
    requiresWebSearch: false
  };
}
