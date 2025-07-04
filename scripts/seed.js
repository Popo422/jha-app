const { db } = require('../src/lib/db');
const { companies, contractors, timesheets } = require('../src/lib/db/schema');

async function seed() {
  try {
    console.log('Starting database seed...');

    // Insert sample company
    const [company] = await db.insert(companies).values({
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Apex Construction LLC',
      contactEmail: 'admin@apexconstruction.com',
      contactPhone: '(555) 123-4567',
      address: '1234 Industrial Ave, Springfield, IL 62701',
    }).onConflictDoNothing().returning();

    console.log('Company created/found:', company?.name || 'Apex Construction LLC');

    // Insert contractors
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

    console.log(`${insertedContractors.length} contractors inserted`);

    // Insert timesheet data
    const timesheetData = [
      { id: 't1111111-1111-1111-1111-111111111111', userId: 'c1111111-1111-1111-1111-111111111111', date: '2025-01-02', employee: 'John Smith', company: 'Metro Development Corp', jobSite: 'Downtown Office Complex', jobName: 'Foundation Work', jobDescription: 'Concrete foundation pouring and reinforcement installation', timeSpent: '8.5' },
      { id: 't2222222-2222-2222-2222-222222222221', userId: 'c2222222-2222-2222-2222-222222222222', date: '2025-01-02', employee: 'Maria Rodriguez', company: 'GreenTech Industries', jobSite: 'Solar Farm Project', jobName: 'Electrical Installation', jobDescription: 'Solar panel wiring and connection setup', timeSpent: '8.0' },
      { id: 't3333333-3333-3333-3333-333333333331', userId: 'c3333333-3333-3333-3333-333333333333', date: '2025-01-02', employee: 'Michael Johnson', company: 'Highway Department', jobSite: 'Interstate 55 Expansion', jobName: 'Road Construction', jobDescription: 'Asphalt laying and road surface preparation', timeSpent: '10.0' },
      { id: 't4444444-4444-4444-4444-444444444441', userId: 'c4444444-4444-4444-4444-444444444444', date: '2025-01-02', employee: 'Sarah Williams', company: 'Residential Builders Inc', jobSite: 'Oakwood Subdivision', jobName: 'HVAC Installation', jobDescription: 'Ductwork installation in new homes', timeSpent: '7.5' },
      { id: 't5555555-5555-5555-5555-555555555551', userId: 'c5555555-5555-5555-5555-555555555555', date: '2025-01-02', employee: 'David Brown', company: 'Metro Development Corp', jobSite: 'Downtown Office Complex', jobName: 'Concrete Work', jobDescription: 'Concrete slab pouring for parking garage', timeSpent: '9.0' },
    ];

    const insertedTimesheets = await db.insert(timesheets).values(
      timesheetData.map(timesheet => ({
        ...timesheet,
        companyId: '123e4567-e89b-12d3-a456-426614174000',
      }))
    ).onConflictDoNothing().returning();

    console.log(`${insertedTimesheets.length} timesheet entries inserted`);
    console.log('Database seed completed successfully!');

  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
}

// Run the seed
seed().catch(console.error);