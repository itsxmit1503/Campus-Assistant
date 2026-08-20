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
      const keywords = [name, code, l.building?.toLowerCase() || ''];

      if (code === 'central-library') keywords.push('library', 'pustakalaya', 'granthalaya', 'লাইব্রেরি', 'लायब्ररी');
      else if (code === 'admin-block') keywords.push('admin block', 'administrative block', 'prashasnik bhawan');
      else if (code === 'pariksha-bhawan') keywords.push('pariksha bhawan', 'exam building');

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
   * Generates rich, complete, targeted context snippet for Gemini
   */
  getCompactContextForQuery(query: string, history: Array<{ role: 'user' | 'assistant'; content: string }> = []): string {
    const { matchedServices, matchedOffices, matchedDepartments, matchedLocations } = this.findRelevantContext(query, history);

    const parts: string[] = [
      `University: ${this.university.name} (${this.university.shortName}, est. ${this.university.establishedYear}), Sagar, MP. Official: ${this.university.officialWebsite}`,
      `Campus Structure: 11 Schools, ${this.departments.length} Academic Departments, Central Library, Pariksha Bhawan, Administrative Block, Health Centre, Hostels on Patharia Hills Campus.`
    ];

    if (matchedDepartments.length > 0) {
      parts.push(`MATCHED ACADEMIC DEPARTMENTS:\n` + matchedDepartments.map(d => 
        `• Department: ${d.name}
  - School: ${d.schoolName}
  - Description: ${d.description}
  - Location/Building: ${d.location || d.building}
  - Head of Department (HOD): ${d.hod}
  - Programmes/Courses: ${d.programmes.join(', ')}
  - Contact Phone: ${d.contact?.phone || 'N/A'}, Email: ${d.contact?.email || 'N/A'}
  - Map Link: ${d.mapLink || 'N/A'}
  - Official URL: ${d.officialSourceUrl || 'N/A'}`
      ).join('\n\n'));
    }

    if (matchedOffices.length > 0) {
      parts.push(`MATCHED ADMINISTRATIVE OFFICES:\n` + matchedOffices.map(o => 
        `• Office: ${o.name}
  - Location: ${o.location} (${o.building}, Floor: ${o.floor || 'Ground'})
  - Office Hours: ${o.officeHours}
  - Contact: Phone ${o.contact?.phone || 'N/A'}, Helpline ${o.contact?.helpline || 'N/A'}, Email ${o.contact?.email || 'N/A'}
  - Responsibilities: ${o.responsibilities.join('; ')}`
      ).join('\n\n'));
    }

    if (matchedLocations.length > 0) {
      parts.push(`MATCHED CAMPUS LOCATIONS:\n` + matchedLocations.map(l => 
        `• Location: ${l.name}
  - Building: ${l.building}
  - Landmark: ${l.landmark || 'Patharia Hills Campus'}
  - Map Link: ${l.mapLink || 'N/A'}`
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
