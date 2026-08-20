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
    const timeoutId = setTimeout(() => controller.abort(), 12000);

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
    console.warn('[Frontend API] Express backend unreachable, executing client-side progressive solver:', error);
    return getLocalKnowledgeAnswer(message, language, conversationHistory);
  }
}

/**
 * Client-side fallback solver matching progressive DHSGSU intents
 */
function getLocalKnowledgeAnswer(
  query: string, 
  lang = 'auto', 
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
): StructuredAnswer {
  const q = query.toLowerCase().trim();
  const isHindi = /[\u0900-\u097F]/.test(query) || q.includes('kaha') || q.includes('kya') || q.includes('nahi') || q.includes('kaise');

  const lastUserMsg = conversationHistory.filter(m => m.role === 'user').slice(-2, -1)[0]?.content.toLowerCase() || '';
  const lastAssistantMsg = conversationHistory.filter(m => m.role === 'assistant').slice(-1)[0]?.content.toLowerCase() || '';

  // 1. GREETING
  if (/^(hey|hello|hi|hiya|namaste|what's up|good morning|hey there)(\s|!|\.|\?)*$/i.test(q)) {
    return {
      answer: isHindi ? `नमस्ते! 👋 DHSGSU कैंपस में आपकी क्या मदद करूँ?` : `Hey! 👋 How can I help you around DHSGSU?`,
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

  // 2. PROBLEM: "Meri scholarship nahi aayi" (Turn 1)
  if (q.includes('scholarship') && (q.includes('nahi aayi') || q.includes('pending') || q.includes('paisa') || q.includes('kya karu'))) {
    return {
      answer: isHindi
        ? `मैं आपकी मदद करता हूँ। क्या आपका स्कॉलरशिप फॉर्म पोर्टल (MP Taas / NSP) पर स्वीकृत (Approved) हो चुका है, या वेरिफिकेशन पेंडिंग है?`
        : `I can help you figure that out. Is your scholarship application already approved on the portal, or is verification still pending?`,
      language: isHindi ? 'Hindi/Hinglish' : 'English',
      intent: 'scholarship_triage',
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

  // 3. FOLLOW-UP: "Approved hai" / "Kahan jana hai"
  if (
    q.includes('approved') || 
    q.includes('kahan jana') || 
    q.includes('kaha jana') || 
    q.includes('where to go') ||
    ((q === 'haan' || q === 'yes') && lastAssistantMsg.includes('where'))
  ) {
    const office = officesData.find(o => o.id === 'office-scholarship-cell')!;
    const loc = locationsData.find(l => l.id === 'loc-admin-block')!;
    return {
      answer: isHindi
        ? `इसके लिए आपको **University Scholarship Cell (प्रशासनिक भवन, कमरा नंबर 12)** में संपर्क करना होगा।`
        : `For this, you should visit the **University Scholarship Cell** located in **Room No. 12, Main Administrative Block** (DSW Section).`,
      language: isHindi ? 'Hindi' : 'English',
      intent: 'scholarship_location',
      intentCategory: 'LOCATION',
      responsibleUnit: {
        name: office.name,
        type: 'office',
        location: office.location
      },
      location: {
        name: loc.name,
        building: loc.building,
        floor: 'Ground Floor (Room 12)',
        landmark: loc.landmark,
        mapLink: loc.mapLink
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

  // 4. DIRECT LOCATION: Library
  if (q.includes('library kaha') || q.includes('library kahan') || q.includes('where is the library')) {
    const loc = locationsData.find(l => l.id === 'loc-central-library')!;
    return {
      answer: isHindi
        ? `**केंद्रीय पुस्तकालय (Central Library)** कला और विज्ञान संकाय के बीच केंद्रीय परिसर में स्थित है। यह सुबह 8:00 से रात 8:00 बजे तक खुलता है।`
        : `The **Jawaharlal Nehru Central Library** is centrally located between Faculty of Arts and Science Complex on Patharia Hills. Open 8:00 AM - 8:00 PM on working days.`,
      language: isHindi ? 'Hindi' : 'English',
      intent: 'library_location',
      intentCategory: 'LOCATION',
      location: {
        name: loc.name,
        building: loc.building,
        landmark: loc.landmark,
        mapLink: loc.mapLink
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

  // 5. DIRECT LOCATION: MCA Department
  if (q.includes('mca') && (q.includes('kaha') || q.includes('kahan') || q.includes('department'))) {
    const dept = departmentsData.find(d => d.id === 'dept-cs-applications')!;
    const loc = locationsData.find(l => l.id === 'loc-csa-building')!;
    return {
      answer: isHindi
        ? `MCA विभाग **कंप्यूटर साइंस एंड एप्लीकेशंस (CSA Building)** में स्थित है, जो अपर कैंपस में साइंस ब्लॉक के पास है।`
        : `The MCA programme is located in the **Computer Science & Applications (CSA) Building** on Upper Campus near the Science Block.`,
      language: isHindi ? 'Hindi' : 'English',
      intent: 'mca_location',
      intentCategory: 'LOCATION',
      location: {
        name: dept.building,
        building: dept.building,
        landmark: 'Patharia Hills Campus',
        mapLink: dept.mapLink
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

  // Default clean conversational response
  return {
    answer: isHindi
      ? `मैं DHSGSU कैंपस सहायक हूँ। आप छात्रवृत्ति, अंकसूची, परीक्षा फॉर्म, हॉस्टल या विभाग संबंधी जो भी पूछना चाहें, निसंकोच बताएं।`
      : `I am your DHSGSU Campus Assistant. Tell me what issue you're facing, and I'll guide you to the right place.`,
    language: isHindi ? 'Hindi' : 'English',
    intent: 'general_assistance',
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
