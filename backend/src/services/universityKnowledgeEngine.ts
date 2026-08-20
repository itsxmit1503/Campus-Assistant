import { 
  StructuredAnswer, 
  Department, 
  AdministrativeOffice, 
  CampusLocation, 
  StudentService 
} from '../types/index.js';
import { knowledgeService } from './knowledgeService.js';
import { detectLanguage } from './conversationEngine.js';

export interface EntityMatchResult {
  department?: Department;
  office?: AdministrativeOffice;
  location?: CampusLocation;
  service?: StudentService;
  entityName: string;
  intentType: 'LOCATION' | 'HOD' | 'COURSES' | 'CONTACT' | 'OVERVIEW' | 'PROBLEM' | 'PROCESS' | 'GENERAL';
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function matchesWord(text: string, keyword: string): boolean {
  const reg = new RegExp(`\\b${escapeRegex(keyword.toLowerCase())}\\b`, 'i');
  return reg.test(text.toLowerCase());
}

export class UniversityKnowledgeEngine {
  /**
   * Dynamically search all departments, offices, locations, and services
   */
  findEntityAndIntent(query: string): EntityMatchResult | null {
    const q = query.toLowerCase().trim();
    const depts = knowledgeService.getDepartments();
    const offices = knowledgeService.getOffices();
    const locs = knowledgeService.getLocations();
    const services = knowledgeService.getServices();

    // 1. Detect Intent Type
    let intentType: EntityMatchResult['intentType'] = 'GENERAL';
    if (/\b(kaha|kahan|kidhar|where|location|building|rasta|map|kis jagah|campus mein|direction)\b/i.test(q)) {
      intentType = 'LOCATION';
    } else if (/\b(hod|head|dean|incharge|kaun hai|who is|adhyaksh|director|kul sachiv|kulsachiv|registrar|vc|vice chancellor)\b/i.test(q)) {
      intentType = 'HOD';
    } else if (/\b(course|courses|programme|programmes|degree|kya padhate|branch|eligibility|syllabus)\b/i.test(q)) {
      intentType = 'COURSES';
    } else if (/\b(contact|number|phone|email|helpline|sampark|mail)\b/i.test(q)) {
      intentType = 'CONTACT';
    } else if (/\b(nahi aayi|nahi mila|pending|problem|issue|dikkat|galat|correction|sudhar|allotment)\b/i.test(q)) {
      intentType = 'PROBLEM';
    } else if (/\b(information|infromation|info|baare mein|details|batao|kya hai|se related|kuch puchna)\b/i.test(q)) {
      intentType = 'OVERVIEW';
    }

    // 2. Search Academic Departments
    for (const d of depts) {
      const deptName = d.name.toLowerCase();
      const code = d.id.replace('dept-', '').toLowerCase();
      
      const keywords: string[] = [deptName];

      if (code === 'cs-applications') keywords.push('computer science', 'computer applications', 'csa', 'cse', 'mca', 'cs department');
      else if (code === 'physics') keywords.push('physics', 'bhautik');
      else if (code === 'chemistry') keywords.push('chemistry', 'rasayan');
      else if (code === 'mathematics') keywords.push('maths', 'mathematics', 'ganit');
      else if (code === 'applied-geology') keywords.push('geology', 'bhoovigyan');
      else if (code === 'law') keywords.push('law', 'vidhi', 'llb', 'ba llb', 'llm');
      else if (code === 'business-mgmt') keywords.push('mba', 'bba', 'business management', 'management');
      else if (code === 'commerce') keywords.push('commerce', 'b.com', 'm.com');
      else if (code === 'economics') keywords.push('economics', 'arthashastra');
      else if (code === 'history') keywords.push('history', 'itihaas');
      else if (code === 'psychology') keywords.push('psychology', 'manovigyan');
      else if (code === 'sociology') keywords.push('sociology', 'samajshastra');
      else if (code === 'botany') keywords.push('botany', 'vanaspati');
      else if (code === 'zoology') keywords.push('zoology', 'prani');
      else if (code === 'biotechnology') keywords.push('biotech', 'biotechnology');
      else if (code === 'applied-eng') keywords.push('applied engineering', 'b.tech');

      for (const kw of keywords) {
        if (matchesWord(q, kw)) {
          return {
            department: d,
            entityName: d.name,
            intentType: intentType === 'GENERAL' ? 'OVERVIEW' : intentType
          };
        }
      }
    }

    // 3. Search Administrative Offices
    for (const o of offices) {
      const officeName = o.name.toLowerCase();
      const code = o.id.replace('office-', '').toLowerCase();
      const keywords: string[] = [officeName];

      if (code === 'scholarship-cell') keywords.push('scholarship', 'chhatravritti', 'fellowship', 'mp taas', 'nsp');
      else if (code === 'exam-cell') keywords.push('exam cell', 'examination', 'pariksha', 'marksheet', 'admit card');
      else if (code === 'dsw') keywords.push('dsw', 'dean student welfare', 'student welfare');
      else if (code === 'registrar') keywords.push('registrar', 'kul sachiv', 'kulsachiv');
      else if (code === 'finance') keywords.push('finance officer', 'vitt adhikari', 'fees counter', 'fee counter');
      else if (code === 'health-centre') keywords.push('health centre', 'medical centre', 'dispensary', 'hospital', 'doctor');
      else if (code === 'chief-warden') keywords.push('hostel', 'chhatravas', 'warden', 'room allotment');

      for (const kw of keywords) {
        if (matchesWord(q, kw)) {
          return {
            office: o,
            entityName: o.name,
            intentType: intentType === 'GENERAL' ? 'OVERVIEW' : intentType
          };
        }
      }
    }

    // 4. Search Campus Locations
    for (const l of locs) {
      const locName = l.name.toLowerCase();
      const bldg = (l.building || '').toLowerCase();
      const code = l.id.replace('loc-', '').toLowerCase();
      const keywords: string[] = [locName, bldg];

      if (code === 'central-library') keywords.push('library', 'pustakalaya', 'granthalaya', 'লাইব্রেরি', 'लायब्ररी', 'நூலகம்', 'લાઇબ્રેરી', 'ਨਵਾਂ ਲਾਇਬ੍ਰੇਰੀ');
      else if (code === 'admin-block') keywords.push('admin block', 'administrative block', 'prashasnik bhawan', 'main administrative');
      else if (code === 'pariksha-bhawan') keywords.push('pariksha bhawan', 'examination building');

      for (const kw of keywords) {
        if (matchesWord(q, kw)) {
          return {
            location: l,
            entityName: l.name,
            intentType: 'LOCATION'
          };
        }
      }
    }

    // 5. Search Student Services
    for (const s of services) {
      if (s.commonProblems.some(p => matchesWord(q, p)) || matchesWord(q, s.name)) {
        return {
          service: s,
          entityName: s.name,
          intentType: intentType === 'GENERAL' ? 'PROBLEM' : intentType
        };
      }
    }

    return null;
  }

  /**
   * Generate clean, natural response from verified university knowledge (Zero Gemini needed)
   */
  resolveKnowledgeQuery(match: EntityMatchResult, query: string, lang = 'auto'): StructuredAnswer {
    const detectedLang = detectLanguage(query);
    const isEnglish = detectedLang === 'english';
    const isHindi = detectedLang === 'hindi';
    const isBengali = detectedLang === 'bengali';
    const isMarathi = detectedLang === 'marathi';
    const isTamil = detectedLang === 'tamil';

    // A. ACADEMIC DEPARTMENT
    if (match.department) {
      const d = match.department;
      
      // A1. Location
      if (match.intentType === 'LOCATION') {
        let answer = `**${d.name}** ${d.location || d.building} mein sthit hai.`;
        if (isEnglish) answer = `The **${d.name}** is located at ${d.location || d.building}.`;
        else if (isHindi) answer = `**${d.name}** ${d.location || d.building} में स्थित है।`;
        else if (isBengali) answer = `**${d.name}** ${d.location || d.building}-এ অবস্থিত।`;
        else if (isMarathi) answer = `**${d.name}** ${d.location || d.building} येथे स्थित आहे।`;

        return {
          answer,
          language: detectedLang,
          intent: 'department_location',
          intentCategory: 'LOCATION',
          responsibleUnit: { name: d.name, type: 'department', location: d.location },
          location: { name: d.building || d.name, building: d.building, landmark: 'DHSGSU Campus', mapLink: d.mapLink },
          display: { responsibleUnit: false, location: true, contact: false, documents: false, nextSteps: false, sources: true, relatedTopics: false }
        };
      }

      // A2. HOD / Head
      if (match.intentType === 'HOD') {
        let answer = `**${d.name}** ke Head (HOD) **${d.hod}** hain.`;
        if (isEnglish) answer = `The Head of the **${d.name}** is **${d.hod}**.`;
        else if (isHindi) answer = `**${d.name}** के विभागाध्यक्ष (HOD) **${d.hod}** हैं।`;

        return {
          answer,
          language: detectedLang,
          intent: 'department_hod',
          intentCategory: 'INFORMATION',
          responsibleUnit: { name: d.name, type: 'department', location: d.location },
          display: { responsibleUnit: true, location: false, contact: false, documents: false, nextSteps: false, sources: true, relatedTopics: false }
        };
      }

      // A3. Courses
      if (match.intentType === 'COURSES') {
        const progList = d.programmes.join(', ');
        let answer = `**${d.name}** mein yeh programmes offer hote hain: **${progList}**.`;
        if (isEnglish) answer = `The **${d.name}** offers the following programmes: **${progList}**.`;
        else if (isHindi) answer = `**${d.name}** में निम्नलिखित पाठ्यक्रम उपलब्ध हैं: **${progList}**।`;

        return {
          answer,
          language: detectedLang,
          intent: 'department_courses',
          intentCategory: 'INFORMATION',
          responsibleUnit: { name: d.name, type: 'department', location: d.location },
          display: { responsibleUnit: true, location: false, contact: false, documents: false, nextSteps: false, sources: true, relatedTopics: false }
        };
      }

      // A4. Contact
      if (match.intentType === 'CONTACT') {
        let answer = `**${d.name}** ka contact: Phone: **${d.contact?.phone || 'N/A'}**, Email: **${d.contact?.email || 'N/A'}**.`;
        if (isEnglish) answer = `Contact details for **${d.name}**: Phone: **${d.contact?.phone || 'N/A'}**, Email: **${d.contact?.email || 'N/A'}**.`;

        return {
          answer,
          language: detectedLang,
          intent: 'department_contact',
          intentCategory: 'CONTACT',
          responsibleUnit: { name: d.name, type: 'department', location: d.location },
          contact: { phone: d.contact?.phone, email: d.contact?.email, officialWebsite: d.officialSourceUrl },
          display: { responsibleUnit: true, location: false, contact: true, documents: false, nextSteps: false, sources: true, relatedTopics: false }
        };
      }

      // A5. General Department Overview
      let answer = `Haan, bilkul. **${d.name}** (${d.schoolName}) ke baare mein location, courses (${d.programmes.join(', ')}), HOD ya contact details me se kis cheez ke baare mein janna hai?`;
      if (isEnglish) answer = `Sure! For the **${d.name}** (${d.schoolName}), I can help with location, courses (${d.programmes.join(', ')}), HOD, or contact details. What would you like to know?`;
      else if (isHindi) answer = `हाँ बिल्कुल। **${d.name}** के बारे में स्थान, पाठ्यक्रम (${d.programmes.join(', ')}), HOD या संपर्क विवरण में से आप क्या जानना चाहते हैं?`;

      return {
        answer,
        language: detectedLang,
        intent: 'department_overview',
        intentCategory: 'INFORMATION',
        responsibleUnit: { name: d.name, type: 'department', location: d.location },
        display: { responsibleUnit: true, location: false, contact: false, documents: false, nextSteps: false, sources: true, relatedTopics: false }
      };
    }

    // B. CAMPUS LOCATION (e.g. Central Library)
    if (match.location) {
      const l = match.location;
      let answer = `**${l.name}** ${l.building} (${l.landmark || 'Patharia Hills Campus'}) mein sthit hai.`;
      if (isEnglish) answer = `The **${l.name}** is located at ${l.building} (${l.landmark || 'Patharia Hills Campus'}).`;
      else if (isHindi) answer = `**${l.name}** ${l.building} (${l.landmark || 'पठारिया हिल्स परिसर'}) में स्थित है।`;
      else if (isBengali) answer = `**${l.name}** ${l.building}-এ (${l.landmark || 'Patharia Hills'}) অবস্থিত।`;
      else if (isMarathi) answer = `**${l.name}** ${l.building} येथे स्थित आहे।`;
      else if (isTamil) answer = `**${l.name}** வளாகத்தில் ${l.building} இல் அமைந்துள்ளது.`;

      return {
        answer,
        language: detectedLang,
        intent: 'location_info',
        intentCategory: 'LOCATION',
        location: { name: l.name, building: l.building, landmark: l.landmark, mapLink: l.mapLink, coordinates: l.coordinates },
        display: { responsibleUnit: false, location: true, contact: false, documents: false, nextSteps: false, sources: true, relatedTopics: false }
      };
    }

    // C. ADMINISTRATIVE OFFICE
    if (match.office) {
      const o = match.office;
      if (match.intentType === 'LOCATION') {
        let answer = `**${o.name}** ${o.location} (${o.building}) mein sthit hai.`;
        if (isEnglish) answer = `The **${o.name}** is located at ${o.location} (${o.building}).`;
        return {
          answer,
          language: detectedLang,
          intent: 'office_location',
          intentCategory: 'LOCATION',
          responsibleUnit: { name: o.name, type: 'office', location: o.location, officeHours: o.officeHours },
          location: { name: o.building || o.name, building: o.building, floor: o.floor, mapLink: o.officialSourceUrl },
          display: { responsibleUnit: true, location: true, contact: false, documents: false, nextSteps: false, sources: true, relatedTopics: false }
        };
      }

      if (match.intentType === 'CONTACT') {
        let answer = `**${o.name}** ka contact: Phone: **${o.contact?.phone || o.contact?.helpline || 'N/A'}**, Email: **${o.contact?.email || 'N/A'}**.`;
        if (isEnglish) answer = `Contact details for **${o.name}**: Phone: **${o.contact?.phone || o.contact?.helpline || 'N/A'}**, Email: **${o.contact?.email || 'N/A'}**.`;
        return {
          answer,
          language: detectedLang,
          intent: 'office_contact',
          intentCategory: 'CONTACT',
          responsibleUnit: { name: o.name, type: 'office', location: o.location },
          contact: { phone: o.contact?.phone, helpline: o.contact?.helpline, email: o.contact?.email, officialWebsite: o.officialSourceUrl },
          display: { responsibleUnit: true, location: false, contact: true, documents: false, nextSteps: false, sources: true, relatedTopics: false }
        };
      }

      let answer = `**${o.name}** (${o.location}). Aap yahan se related location, contact ya services ke baare mein pooch sakte hain.`;
      if (isEnglish) answer = `**${o.name}** (${o.location}). You can ask about its location, contact, or services handled.`;
      return {
        answer,
        language: detectedLang,
        intent: 'office_overview',
        intentCategory: 'INFORMATION',
        responsibleUnit: { name: o.name, type: 'office', location: o.location, officeHours: o.officeHours },
        display: { responsibleUnit: true, location: false, contact: false, documents: false, nextSteps: false, sources: true, relatedTopics: false }
      };
    }

    return {
      answer: `Main is vishay mein aapki madad kar sakta hoon. Kripya bataiye aapko kis baare mein janna hai.`,
      language: detectedLang,
      intent: 'general_info',
      intentCategory: 'INFORMATION',
      display: { responsibleUnit: false, location: false, contact: false, documents: false, nextSteps: false, sources: false, relatedTopics: false }
    };
  }
}

export const universityKnowledgeEngine = new UniversityKnowledgeEngine();
