export interface SourceInfo {
  title: string;
  url: string;
  sourceType: 'official' | 'subdomain' | 'circular' | 'map' | 'web';
  publishedDate?: string;
  verified: boolean;
}

export interface ResponsibleUnit {
  name: string;
  type: 'office' | 'department' | 'cell' | 'committee';
  location?: string;
  contact?: string;
  officeHours?: string;
}

export interface DisplayFlags {
  responsibleUnit?: boolean;
  location?: boolean;
  contact?: boolean;
  documents?: boolean;
  nextSteps?: boolean;
  sources?: boolean;
  relatedTopics?: boolean;
}

export interface StructuredAnswer {
  answer: string;
  language: string;
  intent: string;
  intentCategory?: 'GREETING' | 'CASUAL_CONVERSATION' | 'INFORMATION' | 'LOCATION' | 'CONTACT' | 'PROCESS' | 'PROBLEM_SOLVING' | 'CURRENT_INFORMATION' | 'EXPLORATION';
  display?: DisplayFlags;
  followUpQuestion?: string;
  service?: {
    id: string;
    name: string;
    category: string;
  } | null;
  responsibleUnit?: ResponsibleUnit | null;
  location?: {
    name: string;
    building?: string;
    floor?: string;
    landmark?: string;
    mapLink?: string;
    coordinates?: { lat: number; lng: number };
  } | null;
  contact?: {
    email?: string;
    phone?: string;
    helpline?: string;
    officialWebsite?: string;
  } | null;
  requiredDocuments?: string[] | null;
  nextSteps?: string[] | null;
  sources?: SourceInfo[] | null;
  relatedTopics?: string[] | null;
  isCurrentGrounding?: boolean;
  confidence?: 'verified_official' | 'general_guidance' | 'web_grounded';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  structuredData?: StructuredAnswer;
  timestamp: string;
  isLoading?: boolean;
  error?: boolean;
}

export interface UniversityInfo {
  name: string;
  shortName: string;
  hindiName: string;
  tagline: string;
  establishedYear: number;
  founder: string;
  accreditation: string;
  type: string;
  officialWebsite: string;
  campusArea: string;
  location: {
    address: string;
    city: string;
    district: string;
    state: string;
    pincode: string;
    mapLink: string;
    coordinates: { lat: number; lng: number };
  };
  authorities: {
    visitor: string;
    chancellor: string;
    viceChancellor: string;
    registrar: string;
    financeOfficer: string;
    controllerOfExaminations: string;
    deanStudentsWelfare: string;
    chiefProctor: string;
  };
  helpline: {
    generalEnquiry: string;
    admissionHelpdesk: string;
    examinationHelpdesk: string;
    email: string;
  };
}

export interface School {
  id: string;
  name: string;
  hindiName?: string;
  code: string;
  description: string;
  departments: string[];
}

export interface Department {
  id: string;
  name: string;
  schoolId: string;
  schoolName: string;
  description: string;
  hod?: string;
  programmes: string[];
  location: string;
  building: string;
  contact?: {
    email?: string;
    phone?: string;
  };
  mapLink?: string;
  officialSourceUrl: string;
  services: string[];
  verified: boolean;
}

export interface AdministrativeOffice {
  id: string;
  name: string;
  hindiName?: string;
  category: string;
  responsibilities: string[];
  servicesHandled: string[];
  commonStudentProblems: string[];
  location: string;
  building: string;
  floor?: string;
  contact?: {
    email?: string;
    phone?: string;
    helpline?: string;
  };
  officeHours?: string;
  officialSourceUrl: string;
  verified: boolean;
}

export interface StudentService {
  id: string;
  name: string;
  category: string;
  description: string;
  commonProblems: string[];
  responsibleOfficeId: string;
  responsibleOfficeName: string;
  location: string;
  requiredDocuments: string[];
  process: string[];
  officialSourceUrl: string;
  relatedServices: string[];
  verified: boolean;
}

export interface CampusLocation {
  id: string;
  name: string;
  type: string;
  building: string;
  description: string;
  landmark?: string;
  floor?: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  mapLink: string;
  relatedOffices?: string[];
  relatedDepartments?: string[];
}

export interface NoticeGuideline {
  id: string;
  title: string;
  category: string;
  publishedDate: string;
  summary: string;
  sourceUrl: string;
  sourceType: string;
  verified: boolean;
}
