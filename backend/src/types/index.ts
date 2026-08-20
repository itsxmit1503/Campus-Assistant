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

export type LocationVerificationStatus = 'VERIFIED' | 'PARTIALLY_VERIFIED' | 'UNVERIFIED' | 'UNKNOWN';

export interface LocationInfo {
  name: string;
  campus?: 'Valley Campus' | 'Upper Campus (Patharia Hills)' | string;
  building?: string;
  floor?: string;
  address?: string;
  landmark?: string;
  mapLink?: string;
  googleMapsUrl?: string;
  googleMapsPlaceId?: string;
  coordinates?: { lat: number; lng: number };
  source?: string;
  verificationStatus?: LocationVerificationStatus;
  verified?: boolean;
}

export interface StructuredAnswer {
  answer: string;
  language: string;
  intent: string;
  intentCategory?: 'GREETING' | 'CASUAL_CONVERSATION' | 'INFORMATION' | 'LOCATION' | 'CONTACT' | 'PROCESS' | 'PROBLEM_SOLVING' | 'CURRENT_INFORMATION' | 'EXPLORATION' | 'TRIAGE';
  display?: DisplayFlags;
  followUpQuestion?: string;
  service?: {
    id: string;
    name: string;
    category: string;
  } | null;
  entity?: {
    name: string;
    type: 'department' | 'office' | 'location' | 'service';
  } | null;
  details?: {
    school?: string;
    programmes?: string[];
    head?: string;
    email?: string;
    phone?: string;
    website?: string;
  } | null;
  responsibleUnit?: ResponsibleUnit | null;
  location?: LocationInfo | null;
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

export interface ChatRequest {
  message: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  language?: string;
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
  dean?: string;
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
  campus: 'Valley Campus' | 'Upper Campus (Patharia Hills)' | string;
  location: string;
  building: string;
  address?: string;
  landmark?: string;
  contact?: {
    email?: string;
    phone?: string;
  };
  mapLink?: string;
  googleMapsUrl?: string;
  coordinates?: { lat: number; lng: number };
  officialSourceUrl: string;
  services: string[];
  verified: boolean;
}

export interface AdministrativeOffice {
  id: string;
  name: string;
  hindiName?: string;
  category: 'Administration' | 'Examination' | 'Finance' | 'Student Welfare' | 'Admissions' | 'Discipline' | 'Health';
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
  category: 'Scholarship' | 'Examination' | 'Hostel' | 'Library' | 'Certificates' | 'Medical' | 'Sports' | 'Grievance' | 'NCC/NSS' | 'Admission';
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
  type: 'administrative' | 'academic' | 'library' | 'hostel' | 'medical' | 'sports' | 'facility' | 'gate';
  campus?: 'Valley Campus' | 'Upper Campus (Patharia Hills)' | string;
  building: string;
  description: string;
  landmark?: string;
  floor?: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  mapLink: string;
  googleMapsUrl?: string;
  relatedOffices?: string[];
  relatedDepartments?: string[];
}

export interface NoticeGuideline {
  id: string;
  title: string;
  category: 'Admissions' | 'Examinations' | 'Scholarships' | 'Hostel' | 'General' | 'Anti-Ragging';
  publishedDate: string;
  summary: string;
  sourceUrl: string;
  sourceType: 'official' | 'circular';
  verified: boolean;
}
