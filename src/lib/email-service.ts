interface EmailServiceConfig {
  url: string;
  apiKey: string;
}

interface ContractorWelcomeEmailData {
  contractorEmail: string;
  contractorName: string;
  contractorCode: string;
  companyName: string;
  adminEmail?: string;
  loginUrl?: string;
}

interface ContractorNotificationData {
  contractorEmail: string;
  contractorName: string;
  companyName: string;
  contractorCode?: string;
  notificationType: 'reminder' | 'announcement' | 'deadline' | 'update' | 'alert' | 'code-update';
  message: string;
  subject?: string;
  adminEmail?: string;
  dueDate?: string;
  priority?: 'low' | 'normal' | 'high';
}

interface EmailResponse {
  success: boolean;
  message: string;
  messageId?: string;
  emailId?: string;
  error?: string;
  details?: string;
}

class EmailService {
  private config: EmailServiceConfig;

  constructor(config: EmailServiceConfig) {
    this.config = config;
  }

  private async makeRequest(endpoint: string, data: any): Promise<EmailResponse> {
    try {
      console.log("data",data)
      const response = await fetch(`${this.config.url}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.config.apiKey,
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}`);
      }

      return result;
    } catch (error) {
      console.error(`Email service error for ${endpoint}:`, error);
      throw error;
    }
  }

  async sendContractorWelcomeEmail(data: ContractorWelcomeEmailData): Promise<EmailResponse> {
    const emailData = {
      ...data,
      loginUrl: data.loginUrl || `${process.env.NEXT_PUBLIC_APP_URL}/login`,
    };

    return this.makeRequest('/email/contractor-welcome', emailData);
  }

  async sendContractorNotification(data: ContractorNotificationData): Promise<EmailResponse> {
    return this.makeRequest('/email/contractor-notification', data);
  }

  async sendBulkNotifications(contractors: Array<{
    email: string;
    name: string;
    companyName: string;
  }>, notificationData: Omit<ContractorNotificationData, 'contractorEmail' | 'contractorName' | 'companyName'>): Promise<EmailResponse[]> {
    const promises = contractors.map(contractor =>
      this.sendContractorNotification({
        ...notificationData,
        contractorEmail: contractor.email,
        contractorName: contractor.name,
        companyName: contractor.companyName,
      })
    );

    return Promise.all(promises);
  }
}

// Create singleton instance
const emailService = new EmailService({
  url: process.env.EMAIL_SERVICE_URL || '',
  apiKey: process.env.EMAIL_SERVICE_API_KEY || '',
});

export { emailService, EmailService };
export type { ContractorWelcomeEmailData, ContractorNotificationData, EmailResponse };