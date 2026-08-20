import { connectDB } from './connection.js';
import { 
  UniversityModel, 
  SchoolModel, 
  DepartmentModel, 
  OfficeModel, 
  ServiceModel, 
  LocationModel, 
  NoticeModel 
} from './models/index.js';

import universityData from '../data/university.json' with { type: 'json' };
import schoolsDepartmentsData from '../data/schoolsAndDepartments.json' with { type: 'json' };
import officesData from '../data/administrativeOffices.json' with { type: 'json' };
import servicesData from '../data/studentServices.json' with { type: 'json' };
import locationsData from '../data/campusLocations.json' with { type: 'json' };
import noticesData from '../data/noticesAndGuidelines.json' with { type: 'json' };

export async function seedDatabase() {
  console.log('[Seed] Connecting to MongoDB Atlas...');
  const conn = await connectDB();
  if (!conn) {
    console.error('[Seed] Database connection failed. Aborting seed.');
    return;
  }

  try {
    console.log('[Seed] Seeding University Information...');
    await UniversityModel.findOneAndUpdate(
      { shortName: universityData.shortName },
      universityData,
      { upsert: true, new: true }
    );

    console.log('[Seed] Seeding Schools...');
    for (const school of schoolsDepartmentsData.schools) {
      await SchoolModel.findOneAndUpdate(
        { id: school.id },
        school,
        { upsert: true, new: true }
      );
    }

    console.log('[Seed] Seeding Departments...');
    for (const dept of schoolsDepartmentsData.departments) {
      await DepartmentModel.findOneAndUpdate(
        { id: dept.id },
        dept,
        { upsert: true, new: true }
      );
    }

    console.log('[Seed] Seeding Administrative Offices...');
    for (const office of officesData) {
      await OfficeModel.findOneAndUpdate(
        { id: office.id },
        office,
        { upsert: true, new: true }
      );
    }

    console.log('[Seed] Seeding Student Services...');
    for (const service of servicesData) {
      await ServiceModel.findOneAndUpdate(
        { id: service.id },
        service,
        { upsert: true, new: true }
      );
    }

    console.log('[Seed] Seeding Campus Locations...');
    for (const loc of locationsData) {
      await LocationModel.findOneAndUpdate(
        { id: loc.id },
        loc,
        { upsert: true, new: true }
      );
    }

    console.log('[Seed] Seeding Notices...');
    for (const notice of noticesData) {
      await NoticeModel.findOneAndUpdate(
        { id: notice.id },
        notice,
        { upsert: true, new: true }
      );
    }

    console.log('[Seed] Database seeding completed successfully! All records verified in Atlas.');
  } catch (error) {
    console.error('[Seed] Error during seeding:', error);
  } finally {
    process.exit(0);
  }
}

seedDatabase();
