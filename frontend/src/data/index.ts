import university from '../../../backend/src/data/university.json';
import schoolsAndDepartments from '../../../backend/src/data/schoolsAndDepartments.json';
import administrativeOffices from '../../../backend/src/data/administrativeOffices.json';
import studentServices from '../../../backend/src/data/studentServices.json';
import campusLocations from '../../../backend/src/data/campusLocations.json';
import noticesAndGuidelines from '../../../backend/src/data/noticesAndGuidelines.json';

import {
  UniversityInfo,
  School,
  Department,
  AdministrativeOffice,
  StudentService,
  CampusLocation,
  NoticeGuideline
} from '../types';

export const universityData: UniversityInfo = university as UniversityInfo;
export const schoolsData: School[] = schoolsAndDepartments.schools as School[];
export const departmentsData: Department[] = schoolsAndDepartments.departments as Department[];
export const officesData: AdministrativeOffice[] = administrativeOffices as AdministrativeOffice[];
export const servicesData: StudentService[] = studentServices as StudentService[];
export const locationsData: CampusLocation[] = campusLocations as CampusLocation[];
export const noticesData: NoticeGuideline[] = noticesAndGuidelines as NoticeGuideline[];
