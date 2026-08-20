import mongoose, { Schema, Document } from 'mongoose';
import { 
  UniversityInfo, 
  School as ISchool, 
  Department as IDepartment, 
  AdministrativeOffice as IOffice, 
  StudentService as IService, 
  CampusLocation as ILocation, 
  NoticeGuideline as INotice 
} from '../../types/index.js';

// 1. University Schema
const UniversitySchema = new Schema({
  name: { type: String, required: true },
  shortName: { type: String, required: true },
  hindiName: { type: String },
  tagline: { type: String },
  establishedYear: { type: Number },
  founder: { type: String },
  accreditation: { type: String },
  type: { type: String },
  officialWebsite: { type: String, required: true },
  campusArea: { type: String },
  location: {
    address: String,
    city: String,
    district: String,
    state: String,
    pincode: String,
    mapLink: String,
    coordinates: { lat: Number, lng: Number }
  },
  authorities: {
    visitor: String,
    chancellor: String,
    viceChancellor: String,
    registrar: String,
    financeOfficer: String,
    controllerOfExaminations: String,
    deanStudentsWelfare: String,
    chiefProctor: String
  },
  helpline: {
    generalEnquiry: String,
    admissionHelpdesk: String,
    examinationHelpdesk: String,
    email: String
  }
}, { timestamps: true });

// 2. School Schema
const SchoolSchema = new Schema({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  hindiName: { type: String },
  code: { type: String },
  description: { type: String },
  departments: [{ type: String }]
}, { timestamps: true });

// 3. Department Schema
const DepartmentSchema = new Schema({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true, index: true },
  schoolId: { type: String, required: true },
  schoolName: { type: String, required: true },
  description: { type: String },
  hod: { type: String },
  programmes: [{ type: String }],
  location: { type: String },
  building: { type: String },
  contact: {
    email: String,
    phone: String
  },
  mapLink: { type: String },
  officialSourceUrl: { type: String, required: true },
  services: [{ type: String }],
  verified: { type: Boolean, default: true }
}, { timestamps: true });

// 4. Administrative Office Schema
const OfficeSchema = new Schema({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true, index: true },
  hindiName: { type: String },
  category: { type: String, required: true },
  responsibilities: [{ type: String }],
  servicesHandled: [{ type: String }],
  commonStudentProblems: [{ type: String }],
  location: { type: String },
  building: { type: String },
  floor: { type: String },
  contact: {
    email: String,
    phone: String,
    helpline: String
  },
  officeHours: { type: String },
  officialSourceUrl: { type: String, required: true },
  verified: { type: Boolean, default: true }
}, { timestamps: true });

// 5. Student Service Schema
const ServiceSchema = new Schema({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true, index: true },
  category: { type: String, required: true },
  description: { type: String },
  commonProblems: [{ type: String }],
  responsibleOfficeId: { type: String, required: true },
  responsibleOfficeName: { type: String, required: true },
  location: { type: String },
  requiredDocuments: [{ type: String }],
  process: [{ type: String }],
  officialSourceUrl: { type: String, required: true },
  relatedServices: [{ type: String }],
  verified: { type: Boolean, default: true }
}, { timestamps: true });

// 6. Campus Location Schema
const LocationSchema = new Schema({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true, index: true },
  type: { type: String, required: true },
  building: { type: String },
  description: { type: String },
  landmark: { type: String },
  floor: { type: String },
  coordinates: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  mapLink: { type: String, required: true },
  relatedOffices: [{ type: String }],
  relatedDepartments: [{ type: String }]
}, { timestamps: true });

// 7. Notice Guideline Schema
const NoticeSchema = new Schema({
  id: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  category: { type: String, required: true },
  publishedDate: { type: String },
  summary: { type: String },
  sourceUrl: { type: String, required: true },
  sourceType: { type: String, default: 'official' },
  verified: { type: Boolean, default: true }
}, { timestamps: true });

export const UniversityModel = mongoose.models.University || mongoose.model('University', UniversitySchema);
export const SchoolModel = mongoose.models.School || mongoose.model('School', SchoolSchema);
export const DepartmentModel = mongoose.models.Department || mongoose.model('Department', DepartmentSchema);
export const OfficeModel = mongoose.models.Office || mongoose.model('Office', OfficeSchema);
export const ServiceModel = mongoose.models.Service || mongoose.model('Service', ServiceSchema);
export const LocationModel = mongoose.models.Location || mongoose.model('Location', LocationSchema);
export const NoticeModel = mongoose.models.Notice || mongoose.model('Notice', NoticeSchema);
