import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { companies, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcrypt'

export async function POST(request: NextRequest) {
  try {
    const { 
      companyName, 
      contactEmail, 
      contactPhone, 
      address,
      adminName,
      adminEmail,
      adminPassword
    } = await request.json()

    // Validate required fields
    if (!companyName || !adminName || !adminEmail || !adminPassword) {
      return NextResponse.json(
        { message: 'Company name, admin name, email, and password are required' },
        { status: 400 }
      )
    }

    // Check if company already exists
    const existingCompany = await db
      .select()
      .from(companies)
      .where(eq(companies.name, companyName))
      .limit(1)

    if (existingCompany.length > 0) {
      return NextResponse.json(
        { message: 'Company with this name already exists' },
        { status: 409 }
      )
    }

    // Check if admin email already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, adminEmail))
      .limit(1)

    if (existingUser.length > 0) {
      return NextResponse.json(
        { message: 'User with this email already exists' },
        { status: 409 }
      )
    }

    // Hash the password
    const saltRounds = 12
    const hashedPassword = await bcrypt.hash(adminPassword, saltRounds)

    // Create company first
    const [newCompany] = await db
      .insert(companies)
      .values({
        name: companyName,
        contactEmail: contactEmail || null,
        contactPhone: contactPhone || null,
        address: address || null,
      })
      .returning()

    // Create super-admin user
    const [newSuperAdmin] = await db
      .insert(users)
      .values({
        email: adminEmail,
        name: adminName,
        password: hashedPassword,
        role: 'super-admin',
        companyId: newCompany.id,
      })
      .returning()

    // Update company with created_by reference
    await db
      .update(companies)
      .set({ createdBy: newSuperAdmin.id })
      .where(eq(companies.id, newCompany.id))

    return NextResponse.json({
      message: 'Company and super-admin created successfully',
      company: {
        id: newCompany.id,
        name: newCompany.name,
      },
      superAdmin: {
        id: newSuperAdmin.id,
        email: newSuperAdmin.email,
        name: newSuperAdmin.name,
      }
    })
  } catch (error) {
    console.error('Onboarding error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}