import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import { sql } from '@vercel/postgres';
import { companies, contractors, timesheets } from '../src/lib/db/schema';

// Load environment variables
config({ path: '.env.local' });
config({ path: '.env' });

const db = drizzle(sql);

async function main() {
  console.log('🌱 Starting database seed...');
  
  try {
    // Insert company
    console.log('📦 Creating company...');
    const [company] = await db.insert(companies).values({
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Apex Construction LLC',
      contactEmail: 'admin@apexconstruction.com',
      contactPhone: '(555) 123-4567',
      address: '1234 Industrial Ave, Springfield, IL 62701',
    }).onConflictDoNothing().returning();

    console.log('✅ Company created:', company?.name || 'Apex Construction LLC');

    // Insert contractors
    console.log('👷 Creating contractors...');
    const contractorData = [
      { id: 'c1111111-1111-1111-1111-111111111111', firstName: 'John', lastName: 'Smith', email: 'john.smith@email.com', code: 'JS001' },
      { id: 'c2222222-2222-2222-2222-222222222222', firstName: 'Maria', lastName: 'Rodriguez', email: 'maria.rodriguez@email.com', code: 'MR002' },
      { id: 'c3333333-3333-3333-3333-333333333333', firstName: 'Michael', lastName: 'Johnson', email: 'michael.johnson@email.com', code: 'MJ003' },
      { id: 'c4444444-4444-4444-4444-444444444444', firstName: 'Sarah', lastName: 'Williams', email: 'sarah.williams@email.com', code: 'SW004' },
      { id: 'c5555555-5555-5555-5555-555555555555', firstName: 'David', lastName: 'Brown', email: 'david.brown@email.com', code: 'DB005' },
      { id: 'c6666666-6666-6666-6666-666666666666', firstName: 'Jessica', lastName: 'Davis', email: 'jessica.davis@email.com', code: 'JD006' },
      { id: 'c7777777-7777-7777-7777-777777777777', firstName: 'Robert', lastName: 'Miller', email: 'robert.miller@email.com', code: 'RM007' },
      { id: 'c8888888-8888-8888-8888-888888888888', firstName: 'Emily', lastName: 'Wilson', email: 'emily.wilson@email.com', code: 'EW008' },
      { id: 'c9999999-9999-9999-9999-999999999999', firstName: 'James', lastName: 'Taylor', email: 'james.taylor@email.com', code: 'JT009' },
      { id: 'c0000000-0000-0000-0000-000000000000', firstName: 'Amanda', lastName: 'Anderson', email: 'amanda.anderson@email.com', code: 'AA010' },
    ];

    const insertedContractors = await db.insert(contractors).values(
      contractorData.map(contractor => ({
        ...contractor,
        companyId: '123e4567-e89b-12d3-a456-426614174000',
      }))
    ).onConflictDoNothing().returning();

    console.log(`✅ ${insertedContractors.length} contractors created`);

    // Insert timesheets
    console.log('⏰ Creating timesheets...');
    const timesheetData = [
      // John Smith entries
      { userId: 'c1111111-1111-1111-1111-111111111111', date: '2025-01-02', employee: 'John Smith', company: 'Metro Development Corp', projectName: 'Downtown Office Complex - Foundation Work', jobDescription: 'Concrete foundation pouring and reinforcement installation', timeSpent: '8.5' },
      { userId: 'c1111111-1111-1111-1111-111111111111', date: '2025-01-03', employee: 'John Smith', company: 'Metro Development Corp', projectName: 'Downtown Office Complex - Foundation Work', jobDescription: 'Foundation waterproofing and backfill preparation', timeSpent: '7.0' },
      { userId: 'c1111111-1111-1111-1111-111111111111', date: '2025-01-06', employee: 'John Smith', company: 'Riverside Properties', projectName: 'Maple Street Apartments - Structural Framing', jobDescription: 'Steel beam installation and welding', timeSpent: '9.0' },

      // Maria Rodriguez entries
      { userId: 'c2222222-2222-2222-2222-222222222222', date: '2025-01-02', employee: 'Maria Rodriguez', company: 'GreenTech Industries', projectName: 'Solar Farm Project - Electrical Installation', jobDescription: 'Solar panel wiring and connection setup', timeSpent: '8.0' },
      { userId: 'c2222222-2222-2222-2222-222222222222', date: '2025-01-03', employee: 'Maria Rodriguez', company: 'GreenTech Industries', projectName: 'Solar Farm Project - Electrical Installation', jobDescription: 'Inverter installation and testing', timeSpent: '7.5' },
      { userId: 'c2222222-2222-2222-2222-222222222222', date: '2025-01-07', employee: 'Maria Rodriguez', company: 'City Municipal Works', projectName: 'Water Treatment Plant - Plumbing Systems', jobDescription: 'Main water line installation and pressure testing', timeSpent: '8.5' },

      // Michael Johnson entries
      { userId: 'c3333333-3333-3333-3333-333333333333', date: '2025-01-02', employee: 'Michael Johnson', company: 'Highway Department', projectName: 'Interstate 55 Expansion - Road Construction', jobDescription: 'Asphalt laying and road surface preparation', timeSpent: '10.0' },
      { userId: 'c3333333-3333-3333-3333-333333333333', date: '2025-01-03', employee: 'Michael Johnson', company: 'Highway Department', projectName: 'Interstate 55 Expansion - Road Construction', jobDescription: 'Traffic barrier installation and lane marking', timeSpent: '9.5' },
      { userId: 'c3333333-3333-3333-3333-333333333333', date: '2025-01-06', employee: 'Michael Johnson', company: 'Metro Development Corp', projectName: 'Shopping Center Renovation - Demolition Work', jobDescription: 'Interior wall removal and debris cleanup', timeSpent: '8.0' },

      // Sarah Williams entries
      { userId: 'c4444444-4444-4444-4444-444444444444', date: '2025-01-02', employee: 'Sarah Williams', company: 'Residential Builders Inc', projectName: 'Oakwood Subdivision - HVAC Installation', jobDescription: 'Ductwork installation in new homes', timeSpent: '7.5' },
      { userId: 'c4444444-4444-4444-4444-444444444444', date: '2025-01-03', employee: 'Sarah Williams', company: 'Residential Builders Inc', projectName: 'Oakwood Subdivision - HVAC Installation', jobDescription: 'HVAC unit installation and startup', timeSpent: '8.0' },
      { userId: 'c4444444-4444-4444-4444-444444444444', date: '2025-01-07', employee: 'Sarah Williams', company: 'Industrial Solutions LLC', projectName: 'Manufacturing Plant - Equipment Installation', jobDescription: 'Industrial HVAC system maintenance and repair', timeSpent: '6.5' },

      // David Brown entries
      { userId: 'c5555555-5555-5555-5555-555555555555', date: '2025-01-02', employee: 'David Brown', company: 'Metro Development Corp', projectName: 'Downtown Office Complex - Concrete Work', jobDescription: 'Concrete slab pouring for parking garage', timeSpent: '9.0' },
      { userId: 'c5555555-5555-5555-5555-555555555555', date: '2025-01-03', employee: 'David Brown', company: 'Metro Development Corp', projectName: 'Downtown Office Complex - Concrete Work', jobDescription: 'Concrete finishing and curing supervision', timeSpent: '7.0' },
      { userId: 'c5555555-5555-5555-5555-555555555555', date: '2025-01-06', employee: 'David Brown', company: 'Bridge Construction Co', projectName: 'River Bridge Project - Infrastructure Work', jobDescription: 'Bridge deck concrete placement and reinforcement', timeSpent: '11.0' },

      // Jessica Davis entries
      { userId: 'c6666666-6666-6666-6666-666666666666', date: '2025-01-02', employee: 'Jessica Davis', company: 'School District 186', projectName: 'Lincoln Elementary School - Roofing Project', jobDescription: 'Roof membrane installation and sealing', timeSpent: '8.0' },
      { userId: 'c6666666-6666-6666-6666-666666666666', date: '2025-01-03', employee: 'Jessica Davis', company: 'School District 186', projectName: 'Lincoln Elementary School - Roofing Project', jobDescription: 'Gutter installation and roof inspection', timeSpent: '6.5' },
      { userId: 'c6666666-6666-6666-6666-666666666666', date: '2025-01-07', employee: 'Jessica Davis', company: 'Hospital Authority', projectName: 'Memorial Hospital Addition - Specialty Construction', jobDescription: 'Medical gas line installation and testing', timeSpent: '9.5' },

      // Robert Miller entries
      { userId: 'c7777777-7777-7777-7777-777777777777', date: '2025-01-02', employee: 'Robert Miller', company: 'Riverside Properties', projectName: 'Maple Street Apartments - Masonry Work', jobDescription: 'Brick laying and mortar joint finishing', timeSpent: '8.5' },
      { userId: 'c7777777-7777-7777-7777-777777777777', date: '2025-01-03', employee: 'Robert Miller', company: 'Riverside Properties', projectName: 'Maple Street Apartments - Masonry Work', jobDescription: 'Stone veneer installation and cleanup', timeSpent: '7.5' },
      { userId: 'c7777777-7777-7777-7777-777777777777', date: '2025-01-06', employee: 'Robert Miller', company: 'Park District', projectName: 'Community Recreation Center - Landscaping Work', jobDescription: 'Retaining wall construction and drainage', timeSpent: '6.0' },

      // Emily Wilson entries
      { userId: 'c8888888-8888-8888-8888-888888888888', date: '2025-01-02', employee: 'Emily Wilson', company: 'GreenTech Industries', projectName: 'Solar Farm Project - Site Preparation', jobDescription: 'Site surveying and ground preparation', timeSpent: '8.0' },
      { userId: 'c8888888-8888-8888-8888-888888888888', date: '2025-01-03', employee: 'Emily Wilson', company: 'GreenTech Industries', projectName: 'Solar Farm Project - Site Preparation', jobDescription: 'Equipment staging and access road construction', timeSpent: '7.0' },
      { userId: 'c8888888-8888-8888-8888-888888888888', date: '2025-01-07', employee: 'Emily Wilson', company: 'Warehouse Logistics Inc', projectName: 'Distribution Center - Floor Installation', jobDescription: 'Concrete floor polishing and coating application', timeSpent: '9.0' },

      // James Taylor entries
      { userId: 'c9999999-9999-9999-9999-999999999999', date: '2025-01-02', employee: 'James Taylor', company: 'City Municipal Works', projectName: 'Water Treatment Plant - Mechanical Systems', jobDescription: 'Pump installation and piping connections', timeSpent: '8.5' },
      { userId: 'c9999999-9999-9999-9999-999999999999', date: '2025-01-03', employee: 'James Taylor', company: 'City Municipal Works', projectName: 'Water Treatment Plant - Mechanical Systems', jobDescription: 'System testing and calibration', timeSpent: '7.5' },
      { userId: 'c9999999-9999-9999-9999-999999999999', date: '2025-01-06', employee: 'James Taylor', company: 'Industrial Solutions LLC', projectName: 'Manufacturing Plant - Maintenance Work', jobDescription: 'Preventive maintenance on production equipment', timeSpent: '6.0' },

      // Amanda Anderson entries
      { userId: 'c0000000-0000-0000-0000-000000000000', date: '2025-01-02', employee: 'Amanda Anderson', company: 'Residential Builders Inc', projectName: 'Oakwood Subdivision - Finish Carpentry', jobDescription: 'Cabinet installation and trim work', timeSpent: '8.0' },
      { userId: 'c0000000-0000-0000-0000-000000000000', date: '2025-01-03', employee: 'Amanda Anderson', company: 'Residential Builders Inc', projectName: 'Oakwood Subdivision - Finish Carpentry', jobDescription: 'Hardwood flooring installation', timeSpent: '7.0' },
      { userId: 'c0000000-0000-0000-0000-000000000000', date: '2025-01-07', employee: 'Amanda Anderson', company: 'Office Renovation LLC', projectName: 'Corporate Headquarters - Interior Renovation', jobDescription: 'Office space reconfiguration and millwork', timeSpent: '8.5' },
    ];

    const insertedTimesheets = await db.insert(timesheets).values(
      timesheetData.map(timesheet => ({
        ...timesheet,
        companyId: '123e4567-e89b-12d3-a456-426614174000',
      }))
    ).onConflictDoNothing().returning();

    console.log(`✅ ${insertedTimesheets.length} timesheet entries created`);
    console.log('🎉 Database seed completed successfully!');

  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  }
}

main().catch((error) => {
  console.error('❌ Seed failed:', error);
  process.exit(1);
});