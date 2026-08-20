import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { 
  UniversityInfo, 
  School, 
  Department, 
  AdministrativeOffice, 
  StudentService, 
  CampusLocation, 
  NoticeGuideline 
} from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, '../data');

function loadJson<T>(filename: string): T {
  const filePath = path.join(dataDir, filename);
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

export class KnowledgeService {
  private university: UniversityInfo;
  private schools: School[];
  private departments: Department[];
  private offices: AdministrativeOffice[];
  private services: StudentService[];
  private locations: CampusLocation[];
  private notices: NoticeGuideline[];

  constructor() {
    this.university = loadJson<UniversityInfo>('university.json');
    const schoolsAndDepts = loadJson<any>('schoolsAndDepartments.json');
    this.schools = schoolsAndDepts.schools as School[];
    this.departments = schoolsAndDepts.departments as Department[];
    this.offices = loadJson<AdministrativeOffice[]>('administrativeOffices.json');
    this.services = loadJson<StudentService[]>('studentServices.json');
    this.locations = loadJson<CampusLocation[]>('campusLocations.json');
    this.notices = loadJson<NoticeGuideline[]>('noticesAndGuidelines.json');
  }

  getUniversityInfo(): UniversityInfo {
    return this.university;
  }

  getUniversity(): UniversityInfo {
    return this.university;
  }

  getSchools(): School[] {
    return this.schools;
  }

  getDepartments(): Department[] {
    return this.departments;
  }

  getDepartmentById(id: string): Department | undefined {
    return this.departments.find(d => d.id === id || d.name.toLowerCase().includes(id.toLowerCase()));
  }

  getOffices(): AdministrativeOffice[] {
    return this.offices;
  }

  getOfficeById(id: string): AdministrativeOffice | undefined {
    return this.offices.find(o => o.id === id || o.name.toLowerCase().includes(id.toLowerCase()));
  }

  getServices(): StudentService[] {
    return this.services;
  }

  getServiceById(id: string): StudentService | undefined {
    return this.services.find(s => s.id === id || s.name.toLowerCase().includes(id.toLowerCase()));
  }

  getLocations(): CampusLocation[] {
    return this.locations;
  }

  getLocationById(id: string): CampusLocation | undefined {
    return this.locations.find(l => l.id === id || l.name.toLowerCase().includes(id.toLowerCase()));
  }

  getNotices(): NoticeGuideline[] {
    return this.notices;
  }

  /**
   * Search knowledge base for relevant context based on query and conversation history
   */
  findRelevantContext(query: string, history: Array<{ role: 'user' | 'assistant'; content: string }> = []): {
    matchedServices: StudentService[];
    matchedOffices: AdministrativeOffice[];
    matchedDepartments: Department[];
    matchedLocations: CampusLocation[];
  } {
    const combinedText = (query + ' ' + history.map(h => h.content).join(' ')).toLowerCase();

    // Check all departments dynamically
    const matchedDepartments = this.departments.filter(d => {
      const name = d.name.toLowerCase();
      const code = d.id.replace('dept-', '').toLowerCase();
      const keywords = [name, code];

      if (code === 'cs-applications') keywords.push('computer science', 'computer applications', 'csa', 'cse', 'mca', 'cs department');
      else if (code === 'physics') keywords.push('physics', 'bhautik');
      else if (code === 'chemistry') keywords.push('chemistry', 'rasayan');
      else if (code === 'criminology-forensic') keywords.push('criminology', 'forensic', 'forensic science', 'crim');
      else if (code === 'pharmacy') keywords.push('pharmacy', 'pharmaceutical', 'b.pharm', 'm.pharm', 'aushadhi');
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

      return keywords.some(kw => {
        const reg = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        return reg.test(combinedText);
      }) || d.programmes.some(p => combinedText.includes(p.toLowerCase()));
    });

    // Check all offices dynamically
    const matchedOffices = this.offices.filter(o => {
      const name = o.name.toLowerCase();
      const code = o.id.replace('office-', '').toLowerCase();
      const keywords = [name, code];

      if (code === 'scholarship-cell') keywords.push('scholarship', 'chhatravritti', 'fellowship', 'mp taas', 'nsp');
      else if (code === 'exam-cell') keywords.push('exam cell', 'examination', 'pariksha', 'marksheet', 'admit card');
      else if (code === 'dsw') keywords.push('dsw', 'dean student welfare', 'student welfare');
      else if (code === 'registrar') keywords.push('registrar', 'kul sachiv', 'kulsachiv');
      else if (code === 'finance') keywords.push('finance', 'vitt adhikari', 'fees', 'fee');
      else if (code === 'health-centre') keywords.push('health centre', 'medical centre', 'dispensary', 'hospital', 'doctor');
      else if (code === 'chief-warden') keywords.push('hostel', 'chhatravas', 'warden', 'allotment');

      return keywords.some(kw => {
        const reg = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        return reg.test(combinedText);
      }) || o.commonStudentProblems.some(p => combinedText.includes(p.toLowerCase()));
    });

    // Check all campus locations
    const matchedLocations = this.locations.filter(l => {
      const name = l.name.toLowerCase();
      const code = l.id.replace('loc-', '').toLowerCase();
      const keywords = [name, code, l.building?.toLowerCase() || '', l.type.toLowerCase()];

      if (code === 'central-library' || l.type === 'library') {
        keywords.push('library', 'pustakalaya', 'granthalaya', 'libraries', 'reading room', 'লাইব্রেরি', 'लायब्ररी');
      } else if (l.type === 'hostel') {
        keywords.push('hostel', 'hostels', 'chhatravas', 'boys hostel', 'girls hostel', 'tagore', 'raman', 'vivekananda', 'gour hostel', 'saraswati', 'laxmibai', 'nivedita', 'priyadarshini');
      } else if (code === 'admin-block') {
        keywords.push('admin block', 'administrative block', 'prashasnik bhawan');
      } else if (code === 'pariksha-bhawan') {
        keywords.push('pariksha bhawan', 'exam building');
      }

      return keywords.some(kw => {
        if (!kw) return false;
        const reg = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        return reg.test(combinedText);
      });
    });

    // Check student services
    const matchedServices = this.services.filter(s =>
      s.commonProblems.some(p => combinedText.includes(p.toLowerCase())) ||
      combinedText.includes(s.name.toLowerCase()) ||
      combinedText.includes(s.category.toLowerCase())
    );

    return {
      matchedServices,
      matchedOffices,
      matchedDepartments,
      matchedLocations
    };
  }

  /**
   * Detects if the student is asking an exhaustive count/list query (e.g. how many, list all, all hostels, etc.)
   */
  isExhaustiveQuery(query: string): { isExhaustive: boolean; category?: 'boys_hostel' | 'girls_hostel' | 'hostel' | 'library' | 'campus' | 'department' | 'school' } {
    const q = query.toLowerCase();
    const isCountOrList = /\b(how many|total|number of|list all|all|kitne|kitna|kaun kaun se|saare|sabhi|kya kya)\b/i.test(q) ||
                          /\b(only one|sirf ek|ek hi)\b/i.test(q);

    if (/\b(boys hostel|boys' hostel|boys hostels|men's hostel|chhatra chhatravas)\b/i.test(q)) {
      return { isExhaustive: true, category: 'boys_hostel' };
    }
    if (/\b(girls hostel|girls' hostel|girls hostels|women's hostel|chhatraayein chhatravas)\b/i.test(q)) {
      return { isExhaustive: true, category: 'girls_hostel' };
    }
    if (/\b(hostel|hostels|chhatravas)\b/i.test(q) && (isCountOrList || q.includes('hostel'))) {
      return { isExhaustive: isCountOrList, category: 'hostel' };
    }
    if (/\b(library|libraries|pustakalaya|granthalaya)\b/i.test(q) && (isCountOrList || q.includes('library') || q.includes('libraries'))) {
      return { isExhaustive: isCountOrList, category: 'library' };
    }
    if (/\b(campus|campuses|parisar)\b/i.test(q)) {
      return { isExhaustive: true, category: 'campus' };
    }
    if (/\b(departments|all departments|kitne department|kul vibhag)\b/i.test(q)) {
      return { isExhaustive: true, category: 'department' };
    }
    if (/\b(schools|all schools|kitne school|kul sankay)\b/i.test(q)) {
      return { isExhaustive: true, category: 'school' };
    }

    return { isExhaustive: false };
  }

  /**
   * Generates rich, complete, targeted context snippet for Gemini
   */
  getCompactContextForQuery(query: string, history: Array<{ role: 'user' | 'assistant'; content: string }> = []): string {
    const exhaustive = this.isExhaustiveQuery(query);
    const { matchedServices, matchedOffices, matchedDepartments, matchedLocations } = this.findRelevantContext(query, history);

    const parts: string[] = [
      `University: ${this.university.name} (${this.university.shortName}, est. ${this.university.establishedYear}), Sagar, MP. Official: ${this.university.officialWebsite}`,
      `Campus Structure: 2 Primary Campuses:
1. Valley Campus (Gour Nagar): Contains Department of Computer Science & Applications (CSA) & specific lower campus facilities.
2. Upper Campus (Patharia Hills): Main administrative block (Prashasnik Bhawan), Pariksha Bhawan, Central Library, Science complex (Physics, Chemistry, Botany), Law, Management, DSW, University Health Centre, Hostels, Stadium.`
    ];

    // ── Exhaustive Category Handling ──────────────────────────────────────────
    if (exhaustive.category === 'boys_hostel') {
      const boysHostels = this.locations.filter(l => l.type === 'hostel' && l.name.toLowerCase().includes("boys"));
      parts.push(`OFFICIAL VERIFIED BOYS' HOSTELS COUNT: ${boysHostels.length}
List of all ${boysHostels.length} Boys' Hostels:
${boysHostels.map((h, i) => `${i + 1}. **${h.name}** (Building: ${h.building}, Location: ${h.campus || 'Upper Campus, Patharia Hills'}, Landmark: ${h.landmark})`).join('\n')}
* Hostel Administration: Chief Warden Office is situated at Tagore Hostel Complex.`);
    } else if (exhaustive.category === 'girls_hostel') {
      const girlsHostels = this.locations.filter(l => l.type === 'hostel' && l.name.toLowerCase().includes("girls"));
      parts.push(`OFFICIAL VERIFIED GIRLS' HOSTELS COUNT: ${girlsHostels.length}
List of all ${girlsHostels.length} Girls' Hostels:
${girlsHostels.map((h, i) => `${i + 1}. **${h.name}** (Building: ${h.building}, Location: ${h.campus || 'Upper Campus, Patharia Hills'}, Landmark: ${h.landmark})`).join('\n')}
* 24x7 Security and female warden supervision available.`);
    } else if (exhaustive.category === 'hostel') {
      const allHostels = this.locations.filter(l => l.type === 'hostel');
      const boys = allHostels.filter(h => h.name.toLowerCase().includes('boys'));
      const girls = allHostels.filter(h => h.name.toLowerCase().includes('girls'));
      parts.push(`OFFICIAL VERIFIED HOSTELS SUMMARY (Total: ${allHostels.length} Hostels - ${boys.length} Boys' Hostels & ${girls.length} Girls' Hostels):
• Boys' Hostels (${boys.length}):
${boys.map((h, i) => `  ${i + 1}. **${h.name}** (${h.campus || 'Upper Campus, Patharia Hills'})`).join('\n')}
• Girls' Hostels (${girls.length}):
${girls.map((h, i) => `  ${i + 1}. **${h.name}** (${h.campus || 'Upper Campus, Patharia Hills'})`).join('\n')}
• Administration: Chief Warden Office (Tagore Hostel Complex).`);
    } else if (exhaustive.category === 'library') {
      const libraries = this.locations.filter(l => l.type === 'library');
      parts.push(`OFFICIAL VERIFIED LIBRARIES IN UNIVERSITY:
1. **Jawaharlal Nehru Central Library**: The primary central university library with >400,000 volumes, e-resource labs (DELNET, e-ShodhSindhu), and reading halls on Upper Campus.
2. **Departmental Libraries & Reading Rooms**: Specialized departmental libraries and reading collections maintained across academic departments (Science, Law, Management, CSA, etc.).
* IMPORTANT TRUTH: The Central Library is the main library, but it is NOT the only library on campus because departmental libraries also operate.`);
    } else if (exhaustive.category === 'campus') {
      parts.push(`OFFICIAL VERIFIED CAMPUSES (Total: 2 Campuses):
1. **Valley Campus (Gour Nagar)**: Located at the base, houses Department of Computer Science & Applications (CSA) and specific computing facilities.
2. **Upper Campus (Patharia Hills)**: The main hilltop campus housing Administrative Block (Prashasnik Bhawan), Pariksha Bhawan, Central Library, Science Complex, Law, Management, Hostels, and Health Centre.`);
    }

    if (matchedDepartments.length > 0) {
      parts.push(`MATCHED ACADEMIC DEPARTMENTS:\n` + matchedDepartments.map(d => 
        `• Department: ${d.name}
  - School: ${d.schoolName}
  - Description: ${d.description}
  - Campus: ${d.campus || (d.id === 'dept-cs-applications' ? 'Valley Campus' : 'Upper Campus (Patharia Hills)')}
  - Building: ${d.building}
  - Exact Address: ${d.address || `${d.building}, ${d.location}`}
  - Landmark: ${d.landmark || (d.id === 'dept-cs-applications' ? 'Valley Campus (Gour Nagar)' : 'Patharia Hills')}
  - Head of Department (HOD): ${d.hod || 'Head of Department'}
  - Programmes/Courses: ${d.programmes.join(', ')}
  - Contact Phone: ${d.contact?.phone || 'N/A'}, Email: ${d.contact?.email || 'N/A'}
  - Google Maps URL: ${d.googleMapsUrl || d.mapLink || 'N/A'}
  - Official URL: ${d.officialSourceUrl || 'N/A'}`
      ).join('\n\n'));
    }

    if (matchedOffices.length > 0) {
      parts.push(`MATCHED ADMINISTRATIVE OFFICES:\n` + matchedOffices.map(o => 
        `• Office: ${o.name}
  - Location: ${o.location} (${o.building}, Floor: ${o.floor || 'Ground'})
  - Office Hours: ${o.officeHours}
  - Contact: Phone ${o.contact?.phone || 'N/A'}, Helpline ${o.contact?.helpline || 'N/A'}, Email ${o.contact?.email || 'N/A'}
  - Responsibilities: ${o.responsibilities.join('; ')}
  - Official URL: ${o.officialSourceUrl || 'N/A'}`
      ).join('\n\n'));
    }

    if (matchedLocations.length > 0 && !exhaustive.category) {
      parts.push(`MATCHED CAMPUS LOCATIONS:\n` + matchedLocations.map(l => 
        `• Location: ${l.name}
  - Type: ${l.type}
  - Campus: ${l.campus || (l.id === 'loc-csa-building' ? 'Valley Campus' : 'Upper Campus (Patharia Hills)')}
  - Building: ${l.building}
  - Landmark: ${l.landmark || 'Patharia Hills Campus'}
  - Google Maps URL: ${l.googleMapsUrl || l.mapLink || 'N/A'}`
      ).join('\n\n'));
    }

    if (matchedServices.length > 0) {
      parts.push(`MATCHED STUDENT SERVICES:\n` + matchedServices.map(s => 
        `• Service: ${s.name}
  - Responsible Office: ${s.responsibleOfficeName} (Location: ${s.location})
  - Required Documents: ${s.requiredDocuments.join(', ')}
  - Process: ${s.process.join(' -> ')}`
      ).join('\n\n'));
    }

    return parts.join('\n\n');
  }

  getStructuredKnowledgePrompt(): string {
    return this.getCompactContextForQuery('');
  }
}

export const knowledgeService = new KnowledgeService();
