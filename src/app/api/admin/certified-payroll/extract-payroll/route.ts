import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { GoogleGenerativeAI } from '@google/generative-ai';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

interface AdminTokenPayload {
  admin: {
    id: string;
    employeeId: string;
    name: string;
    role: string;
    companyId: string;
  };
  isAdmin: boolean;
  iat: number;
  exp: number;
}

function authenticateAdmin(request: NextRequest): { admin: AdminTokenPayload['admin'] } {
  const adminToken = request.cookies.get('adminAuthToken')?.value || 
                    (request.headers.get('Authorization')?.startsWith('AdminBearer ') ? 
                     request.headers.get('Authorization')?.replace('AdminBearer ', '') : null);
  
  if (!adminToken) {
    throw new Error('Admin authentication required');
  }
  
  const decoded = jwt.verify(adminToken, JWT_SECRET) as AdminTokenPayload;
  if (!decoded.admin || !decoded.isAdmin) {
    throw new Error('Invalid admin token');
  }
  
  return { admin: decoded.admin };
}

async function fetchFileAsBase64(url: string): Promise<{ data: string; mimeType: string }> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString('base64');
    
    const mimeType = response.headers.get('content-type') || 'application/pdf';

    return {
      data: base64Data,
      mimeType: mimeType
    };
  } catch (error) {
    console.error('Error fetching file:', error);
    throw error;
  }
}

function createPayrollExtractionPrompt(contractorName?: string) {
  return `
You are an AI assistant that extracts payroll information from PDF documents. 

Analyze the provided payroll document and extract the following information in JSON format. If a field is not found or unclear, use an empty string "". 

${contractorName ? 
  `IMPORTANT: This document should contain payroll information for "${contractorName}". If the document contains multiple employees, try to find and extract data specifically for "${contractorName}" (look for exact name matches, partial matches, or similar names). If you cannot find "${contractorName}" in the document, just extract data for the first employee listed.` :
  'If multiple employees are shown, extract data for the first employee only.'
}

Return ONLY a valid JSON object with this exact structure:

{
  "federalTax": "",
  "socialSecurity": "",
  "medicare": "",
  "stateTax": "",
  "localTaxesSDI": "",
  "voluntaryPension": "",
  "voluntaryMedical": "",
  "vacDues": "",
  "travSubs": "",
  "allOtherDeductions": "",
  "totalDeduction": "",
  "rateInLieuOfFringes": "",
  "totalBaseRatePlusFringes": "",
  "hwRate": "",
  "healthWelfare": "",
  "pensionRate": "",
  "pension": "",
  "vacHolRate": "",
  "vacationHoliday": "",
  "trainingRate": "",
  "allOtherFringes": "",
  "allOtherRate": "",
  "totalFringeRateToThird": "",
  "totalFringesPaidToThird": "",
  "checkNo": "",
  "netPaidWeek": "",
  "savings": "",
  "payrollPaymentDate": "",
  "allOrPartOfFringesPaidToEmployee": "",
  "vacationHolidayDuesInGrossPay": "",
  "voluntaryContributionsInGrossPay": ""
}

Instructions:
- Extract monetary values as numbers only (e.g., "25.50" not "$25.50")
- For dates, use YYYY-MM-DD format
- For the three fields ending with "...InGrossPay" and "...PaidToEmployee", extract "yes" or "no" if clearly indicated, otherwise use ""
- Look for common payroll terms like: wages, taxes, deductions, benefits, fringes, rates, etc.
- Be careful to distinguish between rates (per hour) and totals (final amounts)
${contractorName ? 
  `- Focus on finding payroll data for "${contractorName}" specifically` :
  '- If multiple employees are present, use data from the first employee'
}

Return only the JSON object, no additional text or formatting.
`;
}

export async function POST(request: NextRequest) {
  try {
    const auth = authenticateAdmin(request);

    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'AI service is not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { fileUrl, contractorName } = body;

    if (!fileUrl) {
      return NextResponse.json(
        { error: 'File URL is required' },
        { status: 400 }
      );
    }

    // Fetch the file and convert to base64
    const { data: base64Data, mimeType } = await fetchFileAsBase64(fileUrl);

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Prepare the image part for Gemini
    const filePart = {
      inlineData: {
        data: base64Data,
        mimeType: mimeType
      }
    };

    // Generate content using Gemini with contractor name context
    const prompt = createPayrollExtractionPrompt(contractorName);
    const result = await model.generateContent([prompt, filePart]);
    const response = await result.response;
    const text = response.text();

    // Parse the JSON response from Gemini
    let extractedData;
    try {
      // Clean the response text (remove any markdown formatting)
      const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
      extractedData = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', text);
      return NextResponse.json({
        success: false,
        error: 'Failed to parse payroll data from document',
        rawResponse: text
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      extractedData,
      message: 'Payroll data extracted successfully'
    });

  } catch (error) {
    console.error('Error extracting payroll data:', error);
    
    if (error instanceof Error && error.message.includes('authentication')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to extract payroll data from document' },
      { status: 500 }
    );
  }
}