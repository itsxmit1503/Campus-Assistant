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
    console.warn('[Frontend API] Express backend unreachable or timed out, executing client-side knowledge solver:', error);
    return getLocalKnowledgeAnswer(message, language);
  }
}

/**
 * Client-side fallback solver matching deterministic DHSGSU intents
 */
function getLocalKnowledgeAnswer(query: string, lang = 'auto'): StructuredAnswer {
  const q = query.toLowerCase().trim();
  const isHindi = /[\u0900-\u097F]/.test(query) || q.includes('kaha') || q.includes('kya') || q.includes('nahi') || q.includes('kaise');

  // Scholarship
  if (q.includes('scholarship') || q.includes('paisa') || q.includes('chhatravritti') || q.includes('taas') || q.includes('nsp')) {
    const service = servicesData.find(s => s.id === 'service-scholarship-support')!;
    const office = officesData.find(o => o.id === 'office-scholarship-cell')!;
    const loc = locationsData.find(l => l.id === 'loc-admin-block')!;

    return {
      answer: isHindi
        ? `अगर आपकी छात्रवृत्ति (Scholarship) नहीं आई है, तो विश्वविद्यालय के **University Scholarship Cell (प्रशासनिक भवन, कमरा नं. 12)** या **DSW Office** में संपर्क करें।\n\nअपने आवेदन की प्रति, HOD अग्रेषण (endorsement) और बैंक पासबुक/NPCI विवरण के साथ कमरा नं 12 में जमा करें।`
        : `If your scholarship has not been disbursed, visit the **University Scholarship & Fellowship Cell** located in **Room No. 12, Administrative Block** (in coordination with DSW Office).\n\nSubmit your endorsed MP Taas / NSP application form along with income & caste certificates.`,
      language: isHindi ? 'Hindi/Hinglish' : 'English',
      intent: 'scholarship_issue',
      service: { id: service.id, name: service.name, category: service.category },
      responsibleUnit: {
        name: office.name,
        type: 'office',
        location: office.location,
        contact: office.contact?.phone || '07582-265810'
      },
      location: {
        name: loc.name,
        building: loc.building,
        floor: 'Ground Floor (Room 12)',
        landmark: loc.landmark,
        mapLink: loc.mapLink
      },
      contact: {
        phone: office.contact?.phone,
        email: office.contact?.email,
        officialWebsite: service.officialSourceUrl
      },
      requiredDocuments: service.requiredDocuments,
      nextSteps: service.process,
      sources: [
        {
          title: 'DHSGSU Official Scholarship Portal',
          url: service.officialSourceUrl,
          sourceType: 'official',
          verified: true
        }
      ],
      relatedTopics: ['Dean Students Welfare', 'Fee Assistance', 'Bonafide Certificate'],
      confidence: 'verified_official'
    };
  }

  // Marksheet Correction
  if (q.includes('marksheet') || q.includes('ankpatrika') || q.includes('correction') || q.includes('spelling')) {
    const service = servicesData.find(s => s.id === 'service-marksheet-correction')!;
    const office = officesData.find(o => o.id === 'office-exam-cell')!;
    const loc = locationsData.find(l => l.id === 'loc-pariksha-bhawan')!;

    return {
      answer: isHindi
        ? `मार्कशीट में सुधार हेतु **परीक्षा भवन (Pariksha Bhawan - Examination Cell)** में आवेदन देना होगा। विभागाध्यक्ष (HOD) से हस्ताक्षरित आवेदन और 10वीं की अंकसूची के साथ परीक्षा काउंटर पर संपर्क करें।`
        : `For marksheet corrections or duplicate marksheets, the responsible office is the **Examination Cell** located in **Pariksha Bhawan**.\n\nSubmit a written application endorsed by your Department HOD and Class 10th certificate copy.`,
      language: isHindi ? 'Hindi/Hinglish' : 'English',
      intent: 'marksheet_correction',
      service: { id: service.id, name: service.name, category: service.category },
      responsibleUnit: {
        name: office.name,
        type: 'office',
        location: office.location,
        contact: office.contact?.helpline || '07582-264445'
      },
      location: {
        name: loc.name,
        building: loc.building,
        floor: loc.floor,
        landmark: loc.landmark,
        mapLink: loc.mapLink
      },
      contact: {
        helpline: office.contact?.helpline,
        email: office.contact?.email,
        officialWebsite: office.officialSourceUrl
      },
      requiredDocuments: service.requiredDocuments,
      nextSteps: service.process,
      sources: [
        {
          title: 'DHSGSU Examination Cell',
          url: office.officialSourceUrl,
          sourceType: 'official',
          verified: true
        }
      ],
      relatedTopics: ['Duplicate Marksheet', 'Degree Transcripts', 'Exam Form Resolution'],
      confidence: 'verified_official'
    };
  }

  // Library
  if (q.includes('library') || q.includes('pustakalaya') || q.includes('book')) {
    const service = servicesData.find(s => s.id === 'service-library-access')!;
    const loc = locationsData.find(l => l.id === 'loc-central-library')!;

    return {
      answer: isHindi
        ? `**जवाहरलाल नेहरू केंद्रीय पुस्तकालय (Jawaharlal Nehru Central Library)** कला व विज्ञान संकाय के बीच स्थित है। यह सुबह 8:00 से रात 8:00 बजे तक खुला रहता है।`
        : `The **Jawaharlal Nehru Central Library** is centrally located on Patharia Hills between Faculty of Arts and Science Complex.\n\nOpen 8:00 AM - 8:00 PM on working days.`,
      language: isHindi ? 'Hindi/Hinglish' : 'English',
      intent: 'library_inquiry',
      service: { id: service.id, name: service.name, category: service.category },
      responsibleUnit: {
        name: 'Jawaharlal Nehru Central Library',
        type: 'office',
        location: service.location
      },
      location: {
        name: loc.name,
        building: loc.building,
        landmark: loc.landmark,
        mapLink: loc.mapLink
      },
      requiredDocuments: service.requiredDocuments,
      nextSteps: service.process,
      sources: [
        {
          title: 'DHSGSU Central Library',
          url: service.officialSourceUrl,
          sourceType: 'official',
          verified: true
        }
      ],
      confidence: 'verified_official'
    };
  }

  // Generic fallback
  return {
    answer: isHindi
      ? `मैं डॉ. हरीसिंह गौर विश्वविद्यालय (DHSGSU) का डिजिटल कैंपस सहायक हूँ। आप छात्रवृत्ति, परीक्षा, हॉस्टल, लाइब्रेरी, मेडिकल व विभागों की जानकारी पूछ सकते हैं।`
      : `I am your DHSGSU Campus Assistant. I can help guide you to the right department, administrative office, library, hostel, examination support, or scholarship cell.`,
    language: isHindi ? 'Hindi/Hinglish' : 'English',
    intent: 'general_assistance',
    responsibleUnit: {
      name: 'Main Administrative Block (Prashasnik Bhawan)',
      type: 'office',
      location: 'Patharia Hills, Sagar',
      contact: '07582-265810'
    },
    location: {
      name: 'Prashasnik Bhawan',
      building: 'Administrative Block',
      landmark: 'Patharia Hills Campus',
      mapLink: 'https://maps.google.com/?q=Dr.+Harisingh+Gour+Vishwavidyalaya+Sagar'
    },
    contact: {
      email: 'registrar@dhsgsu.edu.in',
      helpline: '07582-265810',
      officialWebsite: 'https://dhsgsu.edu.in/index.php/en/'
    },
    sources: [
      {
        title: 'DHSGSU Official Website',
        url: 'https://dhsgsu.edu.in/index.php/en/',
        sourceType: 'official',
        verified: true
      }
    ],
    relatedTopics: ['Scholarships', 'Examination Cell', 'Central Library', 'Hostels', 'Departments'],
    confidence: 'general_guidance'
  };
}
