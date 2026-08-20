import { StructuredAnswer } from '../types/index.js';
import { knowledgeService } from './knowledgeService.js';

export function classifyAndSolveDeterministic(query: string, lang = 'auto'): StructuredAnswer | null {
  const q = query.toLowerCase().trim();

  // 1. Scholarship Intent
  if (
    q.includes('scholarship') ||
    q.includes('chhatravritti') ||
    q.includes('taas') ||
    q.includes('nsp') ||
    (q.includes('paisa') && (q.includes('aaya') || q.includes('aayi') || q.includes('milega')))
  ) {
    const service = knowledgeService.getServiceById('service-scholarship-support')!;
    const office = knowledgeService.getOfficeById('office-scholarship-cell')!;
    const loc = knowledgeService.getLocationById('loc-admin-block')!;

    const isHindiOrHinglish = /[\u0900-\u097F]/.test(query) || q.includes('kya') || q.includes('kaha') || q.includes('kare') || q.includes('nahi') || q.includes('batao');

    const answer = isHindiOrHinglish
      ? `अगर आपकी स्कॉलरशिप नहीं आई है या पोर्टल पर वेरिफिकेशन पेंडिंग है, तो आपको **University Scholarship Cell (प्रशासनिक भवन, कमरा नंबर 12)** या **DSW Office** में संपर्क करना होगा।\n\nअपने आवेदन की हार्ड कॉपी, HOD से अग्रेषित (forwarded) करवाकर, सभी आवश्यक दस्तावेजों के साथ छात्रवृत्ति प्रकोष्ठ में जमा करें।`
      : `If your scholarship payment has not arrived or verification is pending, your case is handled by the **University Scholarship & Fellowship Cell** located in the **Administrative Block (Room No. 12)** in coordination with the Dean of Students' Welfare (DSW) Office.\n\nTake a printout of your MP Taas / NSP application form endorsed by your Department Head (HOD) along with required certificates for physical verification.`;

    return {
      answer,
      language: isHindiOrHinglish ? 'Hinglish/Hindi' : 'English',
      intent: 'scholarship_issue',
      service: {
        id: service.id,
        name: service.name,
        category: service.category
      },
      responsibleUnit: {
        name: office.name,
        type: 'office',
        location: office.location,
        contact: office.contact?.phone || '07582-265810',
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
      contact: {
        email: office.contact?.email,
        phone: office.contact?.phone,
        helpline: '07582-265810',
        officialWebsite: 'https://dhsgsu.edu.in/index.php/en/student-services/scholarships'
      },
      requiredDocuments: service.requiredDocuments,
      nextSteps: service.process,
      sources: [
        {
          title: 'DHSGSU Official Website — Scholarship Cell',
          url: service.officialSourceUrl,
          sourceType: 'official',
          verified: true
        }
      ],
      relatedTopics: ['Fee Assistance', 'Dean Students Welfare (DSW)', 'Bonafide Certificate for Scholarship', 'Student Grievance'],
      confidence: 'verified_official'
    };
  }

  // 2. Marksheet Correction & Duplicate Marksheet
  if (
    q.includes('marksheet') ||
    q.includes('ankpatrika') ||
    q.includes('spelling') ||
    q.includes('correction') ||
    (q.includes('mark') && q.includes('galat'))
  ) {
    const service = knowledgeService.getServiceById('service-marksheet-correction')!;
    const office = knowledgeService.getOfficeById('office-exam-cell')!;
    const loc = knowledgeService.getLocationById('loc-pariksha-bhawan')!;

    const isHindi = /[\u0900-\u097F]/.test(query) || q.includes('karna') || q.includes('karwana') || q.includes('kaha') || q.includes('hai');

    const answer = isHindi
      ? `मार्कशीट में नाम, रोल नंबर या विषय संशोधन (Correction) के लिए आपको **परीक्षा भवन (Pariksha Bhawan - Examination Cell)** जाना होगा।\n\nअपने विभागाध्यक्ष (HOD) से हस्ताक्षरित आवेदन पत्र, 10वीं की मार्कशीट की प्रति और निर्धारित शुल्क की चालान रसीद के साथ परीक्षा प्रकोष्ठ काउंटर पर जमा करें।`
      : `For marksheet corrections (such as typographical errors in student name, father's name, or internal marks mismatch), the responsible office is the **Examination Cell (Office of the Controller of Examinations)** located in **Pariksha Bhawan**.\n\nSubmit a written application endorsed by your Department HOD along with a copy of your Class 10th certificate and the prescribed correction fee receipt.`;

    return {
      answer,
      language: isHindi ? 'Hindi/Hinglish' : 'English',
      intent: 'marksheet_correction',
      service: {
        id: service.id,
        name: service.name,
        category: service.category
      },
      responsibleUnit: {
        name: office.name,
        type: 'office',
        location: office.location,
        contact: office.contact?.helpline || '07582-264445',
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
      contact: {
        email: office.contact?.email,
        helpline: office.contact?.helpline,
        officialWebsite: office.officialSourceUrl
      },
      requiredDocuments: service.requiredDocuments,
      nextSteps: service.process,
      sources: [
        {
          title: 'DHSGSU Examination Cell Portal',
          url: office.officialSourceUrl,
          sourceType: 'official',
          verified: true
        }
      ],
      relatedTopics: ['Duplicate Marksheet Procedure', 'Provisional Degree', 'Examination Form Resolution'],
      confidence: 'verified_official'
    };
  }

  // 3. Department Location & Inquiries (e.g. MCA / Computer Science, Physics, etc.)
  if (
    q.includes('mca') ||
    q.includes('computer science') ||
    q.includes('csa') ||
    q.includes('physics') ||
    q.includes('chemistry') ||
    q.includes('law department') ||
    q.includes('department kaha') ||
    q.includes('department kahan')
  ) {
    let dept = knowledgeService.getDepartmentById('dept-cs-applications')!;
    if (q.includes('physics')) dept = knowledgeService.getDepartmentById('dept-physics')!;
    else if (q.includes('chemistry')) dept = knowledgeService.getDepartmentById('dept-chemistry')!;
    else if (q.includes('law')) dept = knowledgeService.getDepartmentById('dept-law')!;
    else if (q.includes('mba') || q.includes('management')) dept = knowledgeService.getDepartmentById('dept-business-mgmt')!;

    const loc = knowledgeService.getLocationById(dept.id === 'dept-cs-applications' ? 'loc-csa-building' : 'loc-admin-block') || knowledgeService.getLocations()[0];

    const isHindi = /[\u0900-\u097F]/.test(query) || q.includes('kaha') || q.includes('hai') || q.includes('batao');

    const answer = isHindi
      ? `**${dept.name}** विवि के **${dept.location}** में स्थित है। यह ${dept.schoolName} के अंतर्गत आता है।\n\nयहाँ संचालित प्रमुख पाठ्यक्रम: ${dept.programmes.join(', ')}। विभागीय संपर्क: ${dept.contact?.email || 'csa@dhsgsu.edu.in'}।`
      : `The **${dept.name}** is located at **${dept.location}** under the **${dept.schoolName}**.\n\nKey Programmes offered: ${dept.programmes.join(', ')}.\nContact: ${dept.contact?.email || 'N/A'}.`;

    return {
      answer,
      language: isHindi ? 'Hindi/Hinglish' : 'English',
      intent: 'department_inquiry',
      responsibleUnit: {
        name: dept.name,
        type: 'department',
        location: dept.location,
        contact: dept.contact?.email || dept.contact?.phone
      },
      location: {
        name: dept.building,
        building: dept.building,
        landmark: 'Patharia Hills Campus',
        mapLink: dept.mapLink,
        coordinates: loc.coordinates
      },
      contact: {
        email: dept.contact?.email,
        phone: dept.contact?.phone,
        officialWebsite: dept.officialSourceUrl
      },
      nextSteps: [
        'Visit during academic working hours (10:00 AM - 5:30 PM)',
        'Check the departmental notice board for timetables and faculty consultation slots'
      ],
      sources: [
        {
          title: `DHSGSU Official Academic Page — ${dept.name}`,
          url: dept.officialSourceUrl,
          sourceType: 'official',
          verified: true
        }
      ],
      relatedTopics: ['Programmes Offered', 'Department Notices', 'Faculty & HOD Contact', 'Campus Map'],
      confidence: 'verified_official'
    };
  }

  // 4. Central Library
  if (q.includes('library') || q.includes('pustakalaya') || q.includes('kitab') || q.includes('book')) {
    const service = knowledgeService.getServiceById('service-library-access')!;
    const loc = knowledgeService.getLocationById('loc-central-library')!;

    const isHindi = /[\u0900-\u097F]/.test(query) || q.includes('kaha') || q.includes('kab') || q.includes('khuli');

    const answer = isHindi
      ? `**जवाहरलाल नेहरू केंद्रीय पुस्तकालय (Jawaharlal Nehru Central Library)** कला संकाय और विज्ञान संकाय के बीच केंद्रीय परिसर में स्थित है।\n\n• **समय**: सामान्य कार्यदिवसों में सुबह 8:00 बजे से रात 8:00 बजे तक।\n• **रविवार/अवकाश**: रीडिंग हॉल सीमित समय के लिए खुला रहता है, हालांकि सर्कुलेशन/बुक इशू काउंटर अवकाश के दिन बंद रहता है।\n• **कार्ड बनवाने हेतु**: विभाग HOD से हस्ताक्षरित फॉर्म और 2 फोटो सर्कुलेशन डेस्क पर जमा करें।`
      : `The **Jawaharlal Nehru Central Library** is centrally located between the Faculty of Arts and the Science Complex on Patharia Hills.\n\n• **General Hours**: 8:00 AM to 8:00 PM on regular academic working days.\n• **Sundays & Holidays**: The Reading Hall is accessible during scheduled study hours, while book circulation/issue counters remain closed.\n• **Library Card**: Submit the library application form endorsed by your Department HOD along with 2 photographs at the Circulation Desk.`;

    return {
      answer,
      language: isHindi ? 'Hindi/Hinglish' : 'English',
      intent: 'library_inquiry',
      service: {
        id: service.id,
        name: service.name,
        category: service.category
      },
      responsibleUnit: {
        name: 'Jawaharlal Nehru Central Library',
        type: 'office',
        location: service.location,
        officeHours: '8:00 AM - 8:00 PM (Reading Hall)'
      },
      location: {
        name: loc.name,
        building: loc.building,
        landmark: loc.landmark,
        mapLink: loc.mapLink,
        coordinates: loc.coordinates
      },
      contact: {
        officialWebsite: service.officialSourceUrl
      },
      requiredDocuments: service.requiredDocuments,
      nextSteps: service.process,
      sources: [
        {
          title: 'DHSGSU Official Central Library Portal',
          url: service.officialSourceUrl,
          sourceType: 'official',
          verified: true
        }
      ],
      relatedTopics: ['E-Journals & DELNET Access', 'Reading Hall Guidelines', 'Book Renewal Policy'],
      confidence: 'verified_official'
    };
  }

  // 5. Hostel Admission & Accommodation
  if (q.includes('hostel') || q.includes('chatrawas') || q.includes('room') || q.includes('mess')) {
    const service = knowledgeService.getServiceById('service-hostel-allotment')!;
    const office = knowledgeService.getOfficeById('office-hostel-chief-warden')!;
    const loc = knowledgeService.getLocationById('loc-tagore-hostel')!;

    const isHindi = /[\u0900-\u097F]/.test(query) || q.includes('kaise') || q.includes('milega') || q.includes('kaha');

    const answer = isHindi
      ? `विश्वविद्यालय में हॉस्टल आवंटन (Hostel Allotment) प्रवेश के बाद मेरिट और दूरी के आधार पर किया जाता है। इसकी व्यवस्था **मुख्य संरक्षक कार्यालय (Chief Warden Office - Tagore Hostel परिसर)** एवं **DSW Office** द्वारा की जाती है।\n\nएडमिशन के बाद विवि पोर्टल पर हॉस्टल हेतु आवेदन करें, मेरिट सूची में नाम आने पर मूल दस्तावेजों और एंटी-रैगिंग शपथ-पत्र के साथ वार्डन कार्यालय में रिपोर्ट करें।`
      : `Hostel accommodation at DHSGSU is allotted based on admission merit rank and distance criteria under the **Chief Warden Office (located at Tagore Hostel Complex)** and the **Dean of Students' Welfare (DSW)**.\n\nAfter securing admission, apply online on the university portal. Once shortlisted in the published merit list, report to the Chief Warden Office with original admission receipt, distance proof, and parent undertaking.`;

    return {
      answer,
      language: isHindi ? 'Hindi/Hinglish' : 'English',
      intent: 'hostel_inquiry',
      service: {
        id: service.id,
        name: service.name,
        category: service.category
      },
      responsibleUnit: {
        name: office.name,
        type: 'office',
        location: office.location,
        contact: office.contact?.email,
        officeHours: office.officeHours
      },
      location: {
        name: loc.name,
        building: loc.building,
        landmark: loc.landmark,
        mapLink: loc.mapLink,
        coordinates: loc.coordinates
      },
      contact: {
        email: office.contact?.email,
        officialWebsite: office.officialSourceUrl
      },
      requiredDocuments: service.requiredDocuments,
      nextSteps: service.process,
      sources: [
        {
          title: 'DHSGSU Official Hostel Administration',
          url: service.officialSourceUrl,
          sourceType: 'official',
          verified: true
        }
      ],
      relatedTopics: ['Hostel Mess Rules', 'Health Centre Assistance', 'Anti-Ragging Undertaking'],
      confidence: 'verified_official'
    };
  }

  // 6. Medical Facility
  if (q.includes('medical') || q.includes('health') || q.includes('doctor') || q.includes('dawa') || q.includes('chikitsa')) {
    const service = knowledgeService.getServiceById('service-medical-assistance')!;
    const office = knowledgeService.getOfficeById('office-health-centre')!;
    const loc = knowledgeService.getLocationById('loc-health-centre')!;

    const isHindi = /[\u0900-\u097F]/.test(query) || q.includes('hai kya') || q.includes('suvidha');

    const answer = isHindi
      ? `हाँ, विश्वविद्यालय परिसर में पूर्ण **विश्वविद्यालय स्वास्थ्य केंद्र (University Health Centre)** उपलब्ध है जो टैगोर हॉस्टल के समीप स्थित है।\n\nयहाँ सभी विद्यार्थियों के लिए निःशुल्क ओपीडी परामर्श (OPD Consultation), प्राथमिक उपचार और आवश्यक दवाएं उपलब्ध हैं। आपातकालीन एम्बुलेंस सेवा 24x7 उपलब्ध रहती है।`
      : `Yes, the university provides dedicated healthcare facilities through the **University Health Centre** situated near the Hostel Complex on Patharia Hills.\n\nIt offers free OPD consultations, emergency first-aid, essential generic medicines, and 24x7 ambulance dispatch for enrolled students upon showing a valid Student ID.`;

    return {
      answer,
      language: isHindi ? 'Hindi/Hinglish' : 'English',
      intent: 'medical_facility',
      service: {
        id: service.id,
        name: service.name,
        category: service.category
      },
      responsibleUnit: {
        name: office.name,
        type: 'office',
        location: office.location,
        contact: office.contact?.phone || '07582-265825',
        officeHours: office.officeHours
      },
      location: {
        name: loc.name,
        building: loc.building,
        landmark: loc.landmark,
        mapLink: loc.mapLink,
        coordinates: loc.coordinates
      },
      contact: {
        phone: office.contact?.phone,
        email: office.contact?.email,
        officialWebsite: office.officialSourceUrl
      },
      requiredDocuments: service.requiredDocuments,
      nextSteps: service.process,
      sources: [
        {
          title: 'DHSGSU Health Centre Facilities',
          url: service.officialSourceUrl,
          sourceType: 'official',
          verified: true
        }
      ],
      relatedTopics: ['Hostel Medical Fitness', 'Emergency Ambulance Contact', 'Dean Students Welfare'],
      confidence: 'verified_official'
    };
  }

  // 7. Bonafide / Certificates
  if (q.includes('bonafide') || q.includes('certificate') || q.includes('praman patra') || q.includes('migration')) {
    const service = knowledgeService.getServiceById('service-bonafide-cert')!;
    const office = knowledgeService.getOfficeById('office-registrar-academic')!;
    const loc = knowledgeService.getLocationById('loc-admin-block')!;

    const isHindi = /[\u0900-\u097F]/.test(query) || q.includes('kaha') || q.includes('milega') || q.includes('kaise');

    const answer = isHindi
      ? `बोनाफाइड (Bonafide) या चरित्र प्रमाण पत्र प्राप्त करने के लिए आपको अपने **संबंधित विभाग (Department Office)** से फॉर्म अग्रसारित करवाकर **शैक्षणिक अनुभाग (Academic Section - कुलसचिव कार्यालय, प्रशासनिक भवन प्रथम तल)** में जमा करना होता है।`
      : `To obtain a Bonafide Study Certificate or Migration Certificate, collect the application from your department office, obtain your Department Head's endorsement, and submit it at the **Academic Section (Registrar Office, 1st Floor, Administrative Building)**.`;

    return {
      answer,
      language: isHindi ? 'Hindi/Hinglish' : 'English',
      intent: 'certificate_request',
      service: {
        id: service.id,
        name: service.name,
        category: service.category
      },
      responsibleUnit: {
        name: office.name,
        type: 'office',
        location: office.location,
        officeHours: office.officeHours
      },
      location: {
        name: loc.name,
        building: loc.building,
        floor: 'First Floor',
        landmark: loc.landmark,
        mapLink: loc.mapLink,
        coordinates: loc.coordinates
      },
      contact: {
        email: office.contact?.email,
        officialWebsite: office.officialSourceUrl
      },
      requiredDocuments: service.requiredDocuments,
      nextSteps: service.process,
      sources: [
        {
          title: 'DHSGSU Academic Section & Certificates',
          url: service.officialSourceUrl,
          sourceType: 'official',
          verified: true
        }
      ],
      relatedTopics: ['Migration Certificate', 'Scholarship Verification', 'Student ID Card'],
      confidence: 'verified_official'
    };
  }

  // 8. New Student Guidance ("I'm new here", "Naya student hu")
  if (
    q.includes('new here') ||
    q.includes('new student') ||
    q.includes('admission ke baad') ||
    q.includes('naya student') ||
    q.includes('first year')
  ) {
    const dsw = knowledgeService.getOfficeById('office-dsw')!;
    const loc = knowledgeService.getLocationById('loc-admin-block')!;

    const isHindi = /[\u0900-\u097F]/.test(query) || q.includes('kya karu') || q.includes('karna chahiye');

    const answer = isHindi
      ? `विश्वविद्यालय में आपका स्वागत है! प्रवेश (Admission) के बाद सबसे पहले ये प्रमुख चरण पूरे करें:\n\n1. **विभागीय सत्यापन**: अपने संबंधित विभाग में जाकर दस्तावेज़ सत्यापन और रोल नंबर/टाइमटेबल प्राप्त करें।\n2. **आईडी कार्ड एवं लाइब्रेरी कार्ड**: डी.एस.डब्ल्यू और केंद्रीय पुस्तकालय में आवेदन जमा करें।\n3. **हॉस्टल (यदि आवश्यक हो)**: चीफ वार्डन कार्यालय (टैगोर हॉस्टल) में मेरिट सूची और कमरा आवंटन देखें।\n4. **छात्रवृत्ति**: यदि पात्र हैं तो प्रशासनिक भवन कमरा नं. 12 (स्कॉलरशिप सेल) से जानकारी प्राप्त करें।`
      : `Welcome to Dr. Harisingh Gour Vishwavidyalaya (DHSGSU)! Here is your essential step-by-step checklist after taking admission:\n\n1. **Department Reporting**: Visit your allotted academic department for original document verification, subject enrollment, and collecting your class timetable.\n2. **Student ID & Central Library Card**: Complete enrollment at DSW and apply for your RFID library card at the Jawaharlal Nehru Central Library.\n3. **Hostel Allotment (if applicable)**: Check hostel merit lists at the Chief Warden Office (Tagore Hostel Complex).\n4. **Scholarships & State Schemes**: Contact the Scholarship Cell (Admin Block, Room 12) for MP Taas / NSP verification.`;

    return {
      answer,
      language: isHindi ? 'Hindi/Hinglish' : 'English',
      intent: 'new_student_orientation',
      responsibleUnit: {
        name: dsw.name,
        type: 'office',
        location: dsw.location,
        officeHours: dsw.officeHours
      },
      location: {
        name: loc.name,
        building: loc.building,
        landmark: 'Patharia Hills, Sagar',
        mapLink: loc.mapLink,
        coordinates: loc.coordinates
      },
      contact: {
        helpline: '07582-265810',
        email: 'registrar@dhsgsu.edu.in',
        officialWebsite: 'https://dhsgsu.edu.in/index.php/en/'
      },
      requiredDocuments: [
        'CUET / University Allotment Letter',
        'Fee Payment Receipt',
        'Original Academic Marksheets & Transfer Certificate (TC/Migration)',
        'Aadhaar & Passport Photographs'
      ],
      nextSteps: [
        'Report to your Academic Department for document verification',
        'Get your Student Identity Card endorsed by DSW',
        'Apply for Jawaharlal Nehru Central Library Card',
        'Submit Hostel/Scholarship documents if applicable'
      ],
      sources: [
        {
          title: 'DHSGSU Official Portal — New Student Guidelines',
          url: 'https://dhsgsu.edu.in/index.php/en/',
          sourceType: 'official',
          verified: true
        }
      ],
      relatedTopics: ['Campus Map & Landmarks', 'Central Library Membership', 'Hostel Admission', 'Scholarship Cell'],
      confidence: 'verified_official'
    };
  }

  return null;
}
