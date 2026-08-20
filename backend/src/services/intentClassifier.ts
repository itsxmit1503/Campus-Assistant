import { StructuredAnswer } from '../types/index.js';
import { knowledgeService } from './knowledgeService.js';

export function classifyAndSolveDeterministic(
  query: string, 
  lang = 'auto', 
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
): StructuredAnswer | null {
  const q = query.toLowerCase().trim();
  const isHindi = /[\u0900-\u097F]/.test(query) || q.includes('kaha') || q.includes('kya') || q.includes('hai') || q.includes('kare') || q.includes('batao') || q.includes('nahi') || q.includes('kahan');

  // Check last conversation turn to understand follow-up context
  const lastUserMsg = conversationHistory.filter(m => m.role === 'user').slice(-2, -1)[0]?.content.toLowerCase() || '';
  const lastAssistantMsg = conversationHistory.filter(m => m.role === 'assistant').slice(-1)[0]?.content.toLowerCase() || '';

  // 1. GREETING & CASUAL CONVERSATION
  const isGreeting = /^(hey|hello|hi|hiya|namaste|pranam|what's up|good morning|good afternoon|good evening|hey there|halo|kaise ho)(\s|!|\.|\?)*$/i.test(q);
  if (isGreeting) {
    return {
      answer: isHindi
        ? `नमस्ते! 👋 डॉ. हरीसिंह गौर विश्वविद्यालय (DHSGSU) कैंपस में आपकी क्या सहायता कर सकता हूँ?`
        : `Hey! 👋 How can I help you around DHSGSU campus?`,
      language: isHindi ? 'Hindi' : 'English',
      intent: 'greeting',
      intentCategory: 'GREETING',
      display: {
        responsibleUnit: false,
        location: false,
        contact: false,
        documents: false,
        nextSteps: false,
        sources: false,
        relatedTopics: false
      }
    };
  }

  // Capabilities / "What can you do?"
  if (q.includes('what can you do') || q.includes('kya kar sakte ho') || q.includes('help me with') || q.includes('capabilities')) {
    return {
      answer: isHindi
        ? `मैं आपको DHSGSU कैंपस में सही विभाग खोजने, छात्रवृत्ति, अंकसूची सुधार, परीक्षा फॉर्म, हॉस्टल, लाइब्रेरी और स्वास्थ्य सेवाओं की सही प्रक्रिया और स्थान बताने में मदद कर सकता हूँ।\n\nबताइए, आपको क्या समस्या है?`
        : `I can help you navigate DHSGSU: finding departments, solving scholarship or marksheet issues, exam form problems, hostel allotment, and campus facilities.\n\nTell me what you need help with!`,
      language: isHindi ? 'Hindi' : 'English',
      intent: 'capabilities',
      intentCategory: 'CASUAL_CONVERSATION',
      display: {
        responsibleUnit: false,
        location: false,
        contact: false,
        documents: false,
        nextSteps: false,
        sources: false,
        relatedTopics: false
      }
    };
  }

  // "Not sure where to go"
  if (
    q.includes('nahi pata') ||
    q.includes('dont know where to go') ||
    q.includes("don't know where to go") ||
    q.includes('kahan jau') ||
    q.includes('kaha jau') ||
    q.includes('kis office mein')
  ) {
    return {
      answer: isHindi
        ? `कोई बात नहीं! आप मुझे अपनी समस्या बताइए (जैसे: छात्रवृत्ति नहीं आई, मार्कशीट में नाम गलत है, फीस कटी पर अपडेट नहीं हुई, या हॉस्टल चाहिए) — मैं आपको सही ऑफिस और स्थान तक पहुँचाऊँगा।`
        : `No worries! Just tell me what you're trying to get done (e.g. scholarship pending, marksheet error, exam fee glitch, or hostel room), and I'll tell you exactly which office to visit and what to bring.`,
      language: isHindi ? 'Hindi' : 'English',
      intent: 'triage_initiation',
      intentCategory: 'PROBLEM_SOLVING',
      display: {
        responsibleUnit: false,
        location: false,
        contact: false,
        documents: false,
        nextSteps: false,
        sources: false,
        relatedTopics: false
      }
    };
  }

  // 2. FOLLOW-UP: "Where to go?" / "Haan kahan jana hai?" / "Yes show location"
  const isAskingLocationFollowUp = 
    q.includes('kahan jana hai') || 
    q.includes('kaha jana hai') || 
    q.includes('where should i go') || 
    q.includes('where to go') ||
    (q === 'haan' || q === 'yes' || q === 'location' || q.includes('batao')) && (lastAssistantMsg.includes('where to go') || lastAssistantMsg.includes('location'));

  if (isAskingLocationFollowUp) {
    if (lastAssistantMsg.includes('scholarship') || lastUserMsg.includes('scholarship')) {
      const office = knowledgeService.getOfficeById('office-scholarship-cell')!;
      const loc = knowledgeService.getLocationById('loc-admin-block')!;
      return {
        answer: isHindi
          ? `इसके लिए आपको **University Scholarship Cell** जाना होगा जो **प्रशासनिक भवन (कमरा नंबर 12)** में स्थित है।`
          : `For this, visit the **University Scholarship & Fellowship Cell** located in **Room No. 12, Main Administrative Block** (Patharia Hills).`,
        language: isHindi ? 'Hindi' : 'English',
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
        display: {
          responsibleUnit: true,
          location: true,
          contact: false,
          documents: false,
          nextSteps: true,
          sources: true,
          relatedTopics: false
        }
      };
    }
  }

  // 3. FOLLOW-UP: "What documents should I take?" / "Kya documents le jaun?"
  if (
    q.includes('document') || 
    q.includes('dastavej') || 
    q.includes('kya le jaun') || 
    q.includes('what should i take') || 
    q.includes('what to bring')
  ) {
    let service = knowledgeService.getServiceById('service-scholarship-support')!;
    if (lastAssistantMsg.includes('marksheet') || lastUserMsg.includes('marksheet')) {
      service = knowledgeService.getServiceById('service-marksheet-correction')!;
    } else if (lastAssistantMsg.includes('hostel') || lastUserMsg.includes('hostel')) {
      service = knowledgeService.getServiceById('service-hostel-allotment')!;
    } else if (lastAssistantMsg.includes('bonafide') || lastUserMsg.includes('bonafide')) {
      service = knowledgeService.getServiceById('service-bonafide-cert')!;
    }

    return {
      answer: isHindi
        ? `इस काम के लिए आपको ये दस्तावेज साथ लेकर जाने होंगे:`
        : `Here are the required documents you should bring:`,
      language: isHindi ? 'Hindi' : 'English',
      intent: 'document_query',
      intentCategory: 'PROCESS',
      requiredDocuments: service.requiredDocuments,
      nextSteps: service.process,
      display: {
        responsibleUnit: false,
        location: false,
        contact: false,
        documents: true,
        nextSteps: true,
        sources: true,
        relatedTopics: false
      }
    };
  }

  // 4. FOLLOW-UP: "Number hai?" / "Contact number" / "Email ID"
  if (
    q.includes('number') || 
    q.includes('contact') || 
    q.includes('phone') || 
    q.includes('helpline') || 
    q.includes('email')
  ) {
    let office = knowledgeService.getOfficeById('office-exam-cell')!;
    if (q.includes('scholarship') || lastAssistantMsg.includes('scholarship') || lastUserMsg.includes('scholarship')) {
      office = knowledgeService.getOfficeById('office-scholarship-cell')!;
    } else if (q.includes('health') || q.includes('medical')) {
      office = knowledgeService.getOfficeById('office-health-centre')!;
    } else if (q.includes('dsw') || q.includes('student welfare')) {
      office = knowledgeService.getOfficeById('office-dsw')!;
    }

    return {
      answer: isHindi
        ? `**${office.name}** के आधिकारिक संपर्क विवरण ये हैं:`
        : `Here are the official contact details for the **${office.name}**:`,
      language: isHindi ? 'Hindi' : 'English',
      intent: 'contact_query',
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
      display: {
        responsibleUnit: true,
        location: false,
        contact: true,
        documents: false,
        nextSteps: false,
        sources: true,
        relatedTopics: false
      }
    };
  }

  // 5. PROBLEM: "Meri scholarship nahi aayi" (Turn 1: Progressive Clarification)
  if (
    q.includes('scholarship nahi aayi') ||
    q.includes('scholarship pending') ||
    q.includes('scholarship ka paisa') ||
    q.includes('scholarship kab milegi') ||
    (q.includes('scholarship') && (q.includes('problem') || q.includes('nahi mila') || q.includes('status')))
  ) {
    return {
      answer: isHindi
        ? `मैं आपकी मदद करता हूँ। क्या आपका स्कॉलरशिप फॉर्म पोर्टल (MP Taas / NSP) पर स्वीकृत (Approved) हो चुका है, या अभी वेरिफिकेशन पेंडिंग है?`
        : `I can help you figure that out. Is your scholarship application already approved on the portal (MP Taas / NSP), or is the verification still showing as pending?`,
      language: isHindi ? 'Hindi/Hinglish' : 'English',
      intent: 'scholarship_issue_triage',
      intentCategory: 'PROBLEM_SOLVING',
      followUpQuestion: 'Is your application approved or pending verification?',
      display: {
        responsibleUnit: false,
        location: false,
        contact: false,
        documents: false,
        nextSteps: false,
        sources: false,
        relatedTopics: false
      }
    };
  }

  // 6. PROBLEM: "Approved hai but payment nahi aayi" (Turn 2)
  if (
    (q.includes('approved') || q.includes('approve ho gaya') || q.includes('paas ho gaya')) &&
    (lastAssistantMsg.includes('scholarship') || lastUserMsg.includes('scholarship') || q.includes('scholarship'))
  ) {
    return {
      answer: isHindi
        ? `समझ गया। अगर फॉर्म अप्रूव हो चुका है और पेमेंट नहीं आया है, तो यह डिस्बर्समेंट या आधार/NPCI बैंक लिंकिंग का मामला हो सकता है।\n\nक्या आप जानना चाहते हैं कि इसके लिए कैंपस में किस ऑफिस जाना होगा?`
        : `Got it. If the application is approved but funds haven't arrived, this is usually related to disbursement processing or Aadhaar/NPCI bank seeding.\n\nWould you like to know which university office handles this?`,
      language: isHindi ? 'Hindi/Hinglish' : 'English',
      intent: 'scholarship_approved_disbursement',
      intentCategory: 'PROBLEM_SOLVING',
      display: {
        responsibleUnit: false,
        location: false,
        contact: false,
        documents: false,
        nextSteps: false,
        sources: false,
        relatedTopics: false
      }
    };
  }

  // 7. PROBLEM: "Marksheet mein correction karwana hai" (Turn 1: Progressive Clarification)
  if (
    q.includes('marksheet') && (q.includes('correction') || q.includes('sudhar') || q.includes('galat') || q.includes('spelling'))
  ) {
    return {
      answer: isHindi
        ? `मार्कशीट में सुधार के लिए सहायता कर सकता हूँ। क्या आपके नाम/माता-पिता के नाम में गलती है, या इंटरनल मार्क्स/विषय कोड में कोई गड़बड़ी है?`
        : `I can help you with your marksheet correction. Is the discrepancy in your personal details (name/roll number) or in the marks/subject codes?`,
      language: isHindi ? 'Hindi/Hinglish' : 'English',
      intent: 'marksheet_correction_triage',
      intentCategory: 'PROBLEM_SOLVING',
      followUpQuestion: 'Is the correction for personal details or marks/subjects?',
      display: {
        responsibleUnit: false,
        location: false,
        contact: false,
        documents: false,
        nextSteps: false,
        sources: false,
        relatedTopics: false
      }
    };
  }

  // 8. DIRECT LOCATION: "Library kaha hai?"
  if (q.includes('library kaha') || q.includes('library kahan') || q.includes('where is the library') || q.includes('central library')) {
    const loc = knowledgeService.getLocationById('loc-central-library')!;
    return {
      answer: isHindi
        ? `**जवाहरलाल नेहरू केंद्रीय पुस्तकालय (Central Library)** कला संकाय और विज्ञान संकाय के बीच केंद्रीय परिसर (Patharia Hills) में स्थित है।\n\nयह सामान्य कार्यदिवसों में सुबह 8:00 से रात 8:00 बजे तक खुलता है। क्या आप इसे मैप पर देखना चाहते हैं?`
        : `The **Jawaharlal Nehru Central Library** is located centrally between the Faculty of Arts and Science Complex on Patharia Hills.\n\nIt is open from 8:00 AM to 8:00 PM on working days. Would you like to view it on the map?`,
      language: isHindi ? 'Hindi' : 'English',
      intent: 'library_location',
      intentCategory: 'LOCATION',
      location: {
        name: loc.name,
        building: loc.building,
        landmark: loc.landmark,
        mapLink: loc.mapLink,
        coordinates: loc.coordinates
      },
      display: {
        responsibleUnit: false,
        location: true,
        contact: false,
        documents: false,
        nextSteps: false,
        sources: true,
        relatedTopics: false
      }
    };
  }

  // 9. DIRECT LOCATION: "MCA department kaha hai?"
  if (q.includes('mca') && (q.includes('kaha') || q.includes('kahan') || q.includes('where') || q.includes('department'))) {
    const dept = knowledgeService.getDepartmentById('dept-cs-applications')!;
    const loc = knowledgeService.getLocationById('loc-csa-building')!;
    return {
      answer: isHindi
        ? `MCA पाठ्यक्रम **कंप्यूटर साइंस एंड एप्लीकेशंस विभाग (CSA Department)** द्वारा संचालित होता है। यह **Valley Campus** में स्थित है।`
        : `The MCA programme is run by the **Department of Computer Science & Applications (CSA)**, located in the **Valley Campus**.`,
      language: isHindi ? 'Hindi' : 'English',
      intent: 'mca_department_location',
      intentCategory: 'LOCATION',
      location: {
        name: dept.building,
        building: dept.building,
        landmark: 'Valley Campus (Gour Nagar)',
        mapLink: dept.mapLink,
        coordinates: loc.coordinates
      },
      display: {
        responsibleUnit: false,
        location: true,
        contact: false,
        documents: false,
        nextSteps: false,
        sources: true,
        relatedTopics: false
      }
    };
  }

  // 10. EXPLORATION: "University mein student ke liye kya-kya facilities hain?"
  if (
    q.includes('facilities') || 
    q.includes('suvidha') || 
    q.includes('kya kya hai') || 
    q.includes('services available') || 
    q.includes('explore campus')
  ) {
    return {
      answer: isHindi
        ? `DHSGSU परिसर में विद्यार्थियों के लिए ये प्रमुख सुविधाएं उपलब्ध हैं:\n\n• **केंद्रीय पुस्तकालय**: 4 लाख से अधिक पुस्तकें और ई-रिसोर्स लैब\n• **छात्रावास**: छात्र एवं छात्राओं हेतु अलग-अलग हॉस्टल परिसर\n• **स्वास्थ्य केंद्र**: निःशुल्क ओपीडी एवं 24x7 एम्बुलेंस सुविधा\n• **स्पोर्ट्स कॉम्प्लेक्स**: स्टेडियम एवं इनडोर व्यायामशाला\n• **छात्रवृत्ति प्रकोष्ठ**: MP Taas एवं NSP छात्रवृत्ति सहायता\n• **एंटी-रैगिंग एवं शिकायत निवारण**: 24x7 सुरक्षा हेल्पलाइन`
        : `Here are the major student facilities available at DHSGSU:\n\n• **Jawaharlal Nehru Central Library**: Over 400,000 volumes & e-resource labs\n• **University Hostels**: Dedicated accommodation for boys & girls\n• **University Health Centre**: Free OPD & 24x7 emergency ambulance\n• **Sports Complex & Gym**: Track, fields, and indoor gymnasium\n• **Scholarship Cell**: MP Taas & National Scholarship Portal support\n• **Anti-Ragging & Grievance**: 24x7 proctorial safety helpline`,
      language: isHindi ? 'Hindi' : 'English',
      intent: 'campus_facilities_exploration',
      intentCategory: 'EXPLORATION',
      relatedTopics: ['Central Library', 'Hostel Admissions', 'University Health Centre', 'Scholarship Cell'],
      display: {
        responsibleUnit: false,
        location: false,
        contact: false,
        documents: false,
        nextSteps: false,
        sources: true,
        relatedTopics: true
      }
    };
  }

  return null;
}
