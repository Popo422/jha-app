import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { companies, users } from '@/lib/db/schema'
import { eq, or } from 'drizzle-orm'
import bcrypt from 'bcrypt'
import { put } from '@vercel/blob'
import { verifyMembershipAccess } from '@/lib/membership-helper'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    
    const companyName = formData.get('companyName') as string
    const contactEmail = formData.get('contactEmail') as string
    const contactPhone = formData.get('contactPhone') as string
    const address = formData.get('address') as string
    const adminName = formData.get('adminName') as string
    const adminEmail = formData.get('adminEmail') as string
    const adminPassword = formData.get('adminPassword') as string
    const logoFile = formData.get('logoFile') as File | null

    // Validate required fields
    if (!companyName || !adminName || !adminEmail || !adminPassword) {
      return NextResponse.json(
        { message: 'Company name, admin name, email, and password are required' },
        { status: 400 }
      )
    }

    // Get WordPress user ID from token
    const JWT_SECRET = process.env.WORDPRESS_JWT_SECRET || 'your-wordpress-jwt-secret-here'
    const accessToken = request.cookies.get('access_token')?.value
    let wordpressUserId = null
    
    if (accessToken) {
      const membershipResult = verifyMembershipAccess(JWT_SECRET, accessToken)
      if (membershipResult.isValid && membershipResult.user?.id) {
        wordpressUserId = membershipResult.user.id.toString()
      }
    }

    // Check if company already exists by name or WordPress user ID
    const whereConditions = [eq(companies.name, companyName)]
    if (wordpressUserId) {
      whereConditions.push(eq(companies.wordpressUserId, wordpressUserId))
    }

    const existingCompany = await db
      .select()
      .from(companies)
      .where(or(...whereConditions))
      .limit(1)

    if (existingCompany.length > 0) {
      // Check if it's a WordPress user conflict
      if (wordpressUserId && existingCompany[0].wordpressUserId === wordpressUserId) {
        return NextResponse.json(
          { 
            message: 'Company already exists for this user',
            redirectTo: '/admin/login'
          },
          { status: 409 }
        )
      }
      
      // Otherwise it's a company name conflict
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
        logoUrl: null, // Will be updated after logo upload
        wordpressUserId: wordpressUserId,
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

    // Handle logo upload if provided
    let logoUrl: string | null = null
    if (logoFile && logoFile.size > 0) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      if (!allowedTypes.includes(logoFile.type)) {
        return NextResponse.json(
          { message: 'Logo must be a valid image file (PNG, JPG, GIF, or WebP)' },
          { status: 400 }
        )
      }

      // Validate file size (5MB limit)
      const maxSize = 5 * 1024 * 1024 // 5MB
      if (logoFile.size > maxSize) {
        return NextResponse.json(
          { message: 'Logo file size must be less than 5MB' },
          { status: 400 }
        )
      }

      try {
        // Create company-specific path for logo: companyId/logo/filename
        const timestamp = Date.now()
        const sanitizedCompanyName = companyName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
        const fileExtension = logoFile.name.split('.').pop()
        const blobPath = `${newCompany.id}/logo/${sanitizedCompanyName}_${timestamp}.${fileExtension}`
        
        const blob = await put(blobPath, logoFile, {
          access: 'public',
          addRandomSuffix: false, // We're already adding timestamp for uniqueness
        })
        
        logoUrl = blob.url

        // Update company with logo URL
        await db
          .update(companies)
          .set({ logoUrl: logoUrl })
          .where(eq(companies.id, newCompany.id))
      } catch (error) {
        console.error('Logo upload error:', error)
        // Don't fail the entire onboarding process for logo upload failure
        console.warn('Logo upload failed, but continuing with company creation')
      }
    }

    return NextResponse.json({
      message: 'Company and super-admin created successfully',
      company: {
        id: newCompany.id,
        name: newCompany.name,
        logoUrl: logoUrl, // Use the uploaded logo URL
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