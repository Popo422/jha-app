import { NextRequest, NextResponse } from 'next/server'
import { ProcoreAuthService } from '@/lib/integrations/procore/auth'
import { validateAdminSession } from '@/lib/auth-utils'

const authService = new ProcoreAuthService()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state') // This should be the company ID
    const error = searchParams.get('error')

    if (error) {
      return NextResponse.redirect(
        new URL(`/admin/settings?error=${encodeURIComponent(error)}`, request.url)
      )
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/admin/settings?error=missing_parameters', request.url)
      )
    }

    // Exchange code for tokens and store integration
    await authService.exchangeCodeForTokens(code, state)

    return NextResponse.redirect(
      new URL('/admin/settings?success=connected', request.url)
    )
  } catch (error) {
    console.error('Procore auth error:', error)
    return NextResponse.redirect(
      new URL('/admin/settings?error=auth_failed', request.url)
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await validateAdminSession(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { action } = await request.json()
    const companyId = authResult.admin.companyId

    switch (action) {
      case 'connect':
        const authUrl = authService.getAuthorizationUrl(companyId)
        return NextResponse.json({ authUrl })

      case 'disconnect':
        await authService.disconnectIntegration(companyId)
        return NextResponse.json({ success: true })

      case 'status':
        const integration = await authService.getActiveIntegration(companyId)
        return NextResponse.json({ 
          connected: integration.length > 0,
          integration: integration[0] || null
        })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Procore integration error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}