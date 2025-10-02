import { db } from '@/lib/db'
import { procoreIntegrations } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

interface ProcoreTokens {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
}

interface ProcoreCompanyInfo {
  id: string
  name: string
}

export class ProcoreAuthService {
  private clientId: string
  private clientSecret: string
  private redirectUri: string
  private baseUrl: string

  constructor() {
    this.clientId = process.env.PROCORE_CLIENT_ID!
    this.clientSecret = process.env.PROCORE_CLIENT_SECRET!
    this.redirectUri = process.env.PROCORE_REDIRECT_URI!
    this.baseUrl = process.env.PROCORE_BASE_URL || 'https://api.procore.com'
    
    // Debug logging
    console.log('Procore Auth Service initialized:');
    console.log('Client ID:', this.clientId);
    console.log('Redirect URI:', this.redirectUri);
    console.log('Base URL:', this.baseUrl);
  }

  // Generate OAuth authorization URL
  getAuthorizationUrl(companyId: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      state: companyId, // Pass company ID as state for security
    })

    // Use sandbox login for sandbox environment
    const loginUrl = this.baseUrl.includes('sandbox') 
      ? 'https://sandbox.procore.com/oauth/authorize'
      : 'https://login.procore.com/oauth/authorize'

    return `${loginUrl}?${params.toString()}`
  }

  // Exchange authorization code for tokens
  async exchangeCodeForTokens(code: string, companyId: string): Promise<void> {
    console.log('Exchanging code for tokens:', { code, companyId });
    
    const tokenUrl = this.baseUrl.includes('sandbox')
      ? 'https://sandbox.procore.com/oauth/token'
      : 'https://login.procore.com/oauth/token'
      
    console.log('Token URL:', tokenUrl);
    
    const requestBody = {
      grant_type: 'authorization_code',
      code,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: this.redirectUri,
    };
    
    console.log('Request body:', { ...requestBody, client_secret: '[REDACTED]' });
      
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    console.log('Token response status:', tokenResponse.status);
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      throw new Error(`Failed to exchange code for tokens: ${tokenResponse.status} - ${errorText}`)
    }

    const tokens: ProcoreTokens = await tokenResponse.json()
    console.log('Got tokens:', { access_token: tokens.access_token?.substring(0, 20) + '...', expires_in: tokens.expires_in });

    // Get Procore company info
    const companyInfo = await this.getProcoreCompanyInfo(tokens.access_token)
    console.log('Got company info:', companyInfo);

    // Calculate expiration date
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)

    // Store or update integration
    await this.storeIntegration(companyId, companyInfo.id, tokens, expiresAt)
    console.log('Integration stored successfully');
  }

  // Get Procore company information
  private async getProcoreCompanyInfo(accessToken: string): Promise<ProcoreCompanyInfo> {
    console.log('Fetching company info from:', `${this.baseUrl}/rest/v1.0/companies`);
    
    const response = await fetch(`${this.baseUrl}/rest/v1.0/companies`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    console.log('Company info response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Company info fetch failed:', errorText);
      throw new Error(`Failed to fetch Procore company info: ${response.status} - ${errorText}`)
    }

    const companies = await response.json()
    console.log('Companies response:', companies);
    
    if (!companies || companies.length === 0) {
      throw new Error('No companies found for this user')
    }
    
    return companies[0] // Return first company user has access to
  }

  // Store integration in database
  private async storeIntegration(
    companyId: string,
    procoreCompanyId: string,
    tokens: ProcoreTokens,
    expiresAt: Date
  ): Promise<void> {
    // Check if integration already exists
    const existing = await db
      .select()
      .from(procoreIntegrations)
      .where(
        and(
          eq(procoreIntegrations.companyId, companyId),
          eq(procoreIntegrations.procoreCompanyId, procoreCompanyId)
        )
      )
      .limit(1)

    if (existing.length > 0) {
      // Update existing integration
      await db
        .update(procoreIntegrations)
        .set({
          procoreAccessToken: tokens.access_token,
          procoreRefreshToken: tokens.refresh_token,
          tokenExpiresAt: expiresAt,
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(procoreIntegrations.id, existing[0].id))
    } else {
      // Create new integration
      await db.insert(procoreIntegrations).values({
        companyId,
        procoreCompanyId,
        procoreAccessToken: tokens.access_token,
        procoreRefreshToken: tokens.refresh_token,
        tokenExpiresAt: expiresAt,
        isActive: true,
      })
    }
  }

  // Refresh access token
  async refreshToken(integrationId: string): Promise<void> {
    const integration = await db
      .select()
      .from(procoreIntegrations)
      .where(eq(procoreIntegrations.id, integrationId))
      .limit(1)

    if (!integration.length) {
      throw new Error('Integration not found')
    }

    const current = integration[0]

    const tokenUrl = this.baseUrl.includes('sandbox')
      ? 'https://sandbox.procore.com/oauth/token'
      : 'https://login.procore.com/oauth/token'
      
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: current.procoreRefreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to refresh token')
    }

    const tokens: ProcoreTokens = await response.json()
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)

    await db
      .update(procoreIntegrations)
      .set({
        procoreAccessToken: tokens.access_token,
        procoreRefreshToken: tokens.refresh_token,
        tokenExpiresAt: expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(procoreIntegrations.id, integrationId))
  }

  // Get active integration for company
  async getActiveIntegration(companyId: string) {
    return await db
      .select()
      .from(procoreIntegrations)
      .where(
        and(
          eq(procoreIntegrations.companyId, companyId),
          eq(procoreIntegrations.isActive, true)
        )
      )
      .limit(1)
  }

  // Disconnect integration
  async disconnectIntegration(companyId: string): Promise<void> {
    await db
      .update(procoreIntegrations)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(procoreIntegrations.companyId, companyId))
  }

  // Check if token needs refresh (expires in next 5 minutes)
  isTokenExpiringSoon(expiresAt: Date): boolean {
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000)
    return expiresAt <= fiveMinutesFromNow
  }

  // Get valid access token (refresh if needed)
  async getValidAccessToken(companyId: string): Promise<string> {
    const integrations = await this.getActiveIntegration(companyId)
    
    if (!integrations.length) {
      throw new Error('No Procore integration found for company')
    }

    const integration = integrations[0]
    
    // Check if token is expiring soon
    if (this.isTokenExpiringSoon(new Date(integration.tokenExpiresAt))) {
      console.log('Token expiring soon, refreshing...')
      await this.refreshToken(integration.id)
      
      // Get the updated integration
      const updatedIntegrations = await this.getActiveIntegration(companyId)
      return updatedIntegrations[0].procoreAccessToken
    }
    
    return integration.procoreAccessToken
  }

  // Make authenticated API call to Procore
  async makeAuthenticatedRequest(companyId: string, endpoint: string, options: RequestInit = {}) {
    const accessToken = await this.getValidAccessToken(companyId)
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    // If token is invalid, try refreshing once
    if (response.status === 401) {
      console.log('Got 401, refreshing token and retrying...')
      
      const integration = await this.getActiveIntegration(companyId)
      await this.refreshToken(integration[0].id)
      
      const newAccessToken = await this.getValidAccessToken(companyId)
      
      return fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Authorization': `Bearer ${newAccessToken}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      })
    }

    return response
  }
}