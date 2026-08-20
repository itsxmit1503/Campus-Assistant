import universityData from '../data/university.json' with { type: 'json' };
import schoolsDepartmentsData from '../data/schoolsAndDepartments.json' with { type: 'json' };
import officesData from '../data/administrativeOffices.json' with { type: 'json' };
import servicesData from '../data/studentServices.json' with { type: 'json' };
import locationsData from '../data/campusLocations.json' with { type: 'json' };
import noticesData from '../data/noticesAndGuidelines.json' with { type: 'json' };

import {
  UniversityInfo,
  School,
  Department,
  AdministrativeOffice,
  StudentService,
  CampusLocation,
  NoticeGuideline
} from '../types/index.js';

export class KnowledgeService {
  private university: UniversityInfo = universityData as UniversityInfo;
  private schools: School[] = schoolsDepartmentsData.schools as School[];
  private departments: Department[] = schoolsDepartmentsData.departments as Department[];
  private offices: AdministrativeOffice[] = officesData as AdministrativeOffice[];
  private services: StudentService[] = servicesData as StudentService[];
  private locations: CampusLocation[] = locationsData as CampusLocation[];
  private notices: NoticeGuideline[] = noticesData as NoticeGuideline[];

  getUniversityInfo(): UniversityInfo {
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
   * Search knowledge base for relevant context based on query keywords
   */
  findRelevantContext(query: string): {
    matchedServices: StudentService[];
    matchedOffices: AdministrativeOffice[];
    matchedDepartments: Department[];
    matchedLocations: CampusLocation[];
  } {
    const q = query.toLowerCase();

    const matchedServices = this.services.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q) ||
      s.commonProblems.some(p => p.toLowerCase().includes(q) || q.includes(p.toLowerCase())) ||
      q.split(' ').some(word => word.length > 3 && s.description.toLowerCase().includes(word))
    );

    const matchedOffices = this.offices.filter(o =>
      o.name.toLowerCase().includes(q) ||
      o.category.toLowerCase().includes(q) ||
      o.commonStudentProblems.some(p => p.toLowerCase().includes(q) || q.includes(p.toLowerCase())) ||
      q.split(' ').some(word => word.length > 3 && o.responsibilities.some(r => r.toLowerCase().includes(word)))
    );

    const matchedDepartments = this.departments.filter(d =>
      d.name.toLowerCase().includes(q) ||
      d.programmes.some(p => p.toLowerCase().includes(q)) ||
      (q.includes('mca') && d.id === 'dept-cs-applications') ||
      (q.includes('mba') && d.id === 'dept-business-mgmt') ||
      (q.includes('law') && d.id === 'dept-law') ||
      (q.includes('physics') && d.id === 'dept-physics') ||
      (q.includes('chemistry') && d.id === 'dept-chemistry')
    );

    const matchedLocations = this.locations.filter(l =>
      l.name.toLowerCase().includes(q) ||
      l.building.toLowerCase().includes(q) ||
      (l.landmark && l.landmark.toLowerCase().includes(q))
    );

    return {
      matchedServices,
      matchedOffices,
      matchedDepartments,
      matchedLocations
    };
  }

  /**
   * Generates a compact, highly-targeted context snippet for Gemini (saves 80%+ tokens)
   */
  getCompactContextForQuery(query: string): string {
    const { matchedServices, matchedOffices, matchedDepartments, matchedLocations } = this.findRelevantContext(query);

    const parts: string[] = [
      `University: ${this.university.name} (${this.university.shortName}), Sagar, MP. Official Website: ${this.university.officialWebsite}`
    ];

    if (matchedServices.length > 0) {
      parts.push(`Relevant Services:\n` + matchedServices.slice(0, 2).map(s => 
        `- ${s.name} (${s.responsibleOfficeName}, Location: ${s.location}). Docs: ${s.requiredDocuments.join(', ')}`
      ).join('\n'));
    }

    if (matchedOffices.length > 0) {
      parts.push(`Relevant Offices:\n` + matchedOffices.slice(0, 2).map(o => 
        `- ${o.name} (Location: ${o.location}, Helpline: ${o.contact?.helpline || 'N/A'})`
      ).join('\n'));
    }

    if (matchedDepartments.length > 0) {
      parts.push(`Relevant Departments:\n` + matchedDepartments.slice(0, 2).map(d => 
        `- ${d.name} (${d.schoolName}, Location: ${d.location})`
      ).join('\n'));
    }

    if (matchedLocations.length > 0) {
      parts.push(`Relevant Places:\n` + matchedLocations.slice(0, 2).map(l => 
        `- ${l.name} (${l.building}, Landmark: ${l.landmark || 'Patharia Hills'})`
      ).join('\n'));
    }

    return parts.join('\n\n');
  }
}

export const knowledgeService = new KnowledgeService();
