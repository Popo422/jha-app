import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { GoogleGenerativeAI } from '@google/generative-ai';

const JWT_SECRET = process.env.JWT_SECRET!;

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

function authenticateAdmin(request: NextRequest): { admin: any } {
  const adminToken = request.cookies.get('adminAuthToken')?.value || 
                    (request.headers.get('Authorization')?.startsWith('AdminBearer ') ? 
                     request.headers.get('Authorization')?.replace('AdminBearer ', '') : null);
  
  if (!adminToken) {
    throw new Error('Admin authentication required');
  }
  
  try {
    const decoded = jwt.verify(adminToken, JWT_SECRET) as AdminTokenPayload;
    if (!decoded.admin || !decoded.isAdmin) {
      throw new Error('Invalid admin token');
    }
    return { admin: decoded.admin };
  } catch (error) {
    throw new Error('Invalid or expired admin token');
  }
}

async function fetchFileAsBase64(url: string): Promise<{ data: string; mimeType: string }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch file: ${response.statusText}`);
  }
  
  const buffer = await response.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  const mimeType = response.headers.get('content-type') || 'application/octet-stream';
  
  return { data: base64, mimeType };
}

const createBulkExtractionPrompt = (contractorNames: string[]) => `
You are an AI assistant that extracts payroll information from PDF documents and assigns it to specific contractors.

CONTRACTORS TO FILL DATA FOR:
${contractorNames.map((name, index) => `${index + 1}. ${name}`).join('\n')}

CRITICAL INSTRUCTIONS:
1. Extract payroll data from the document
2. Look at the worker names in the document (like "FEGGINS, JAMES", "LEE, ANTWAN", etc.)
3. Try to match each contractor name above to a worker name in the document
4. IMPORTANT: If you cannot find a good name match between a contractor and any worker, assign the FIRST worker's payroll data to that contractor
5. Do NOT assign workers in order - only assign if there's a real name similarity
6. Return exactly ${contractorNames.length} payroll records (one for each contractor)

EXAMPLE:
- If document has "FEGGINS, JAMES" and "LEE, ANTWAN" 
- And contractors are "John Smith" and "Jane Doe"
- Since "John Smith" doesn't match "FEGGINS" or "LEE", give John Smith the FEGGINS data
- Since "Jane Doe" doesn't match "FEGGINS" or "LEE", give Jane Doe the FEGGINS data
- Both contractors get the same first worker's data

Return this exact JSON structure:

{
  "workers": [
    {
      "contractorName": "Name from the contractor list above",
      "workerName": "Name of worker from document (or same as contractorName if using contractor name)",
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
  ]
}

Instructions:
- Return exactly ${contractorNames.length} records for: ${contractorNames.join(', ')}
- Extract monetary values as numbers only (e.g., "25.50" not "$25.50")
- For dates, use YYYY-MM-DD format
- For the three fields ending with "...InGrossPay" and "...PaidToEmployee", extract "yes" or "no" if clearly indicated, otherwise use ""
- Return valid JSON only, no additional text
`;

export async function POST(request: NextRequest) {
  try {
    const auth = authenticateAdmin(request);
    
    const body = await request.json();
    const { fileUrl, contractors } = body;

    if (!fileUrl) {
      return NextResponse.json({ error: 'File URL is required' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 500 });
    }

    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Fetch and convert file to base64
    const { data: base64Data, mimeType } = await fetchFileAsBase64(fileUrl);
    
    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: mimeType
      }
    };

    // Create dynamic prompt with contractor names
    const contractorNames = contractors.map((c: any) => c.name);
    const BULK_EXTRACTION_PROMPT = createBulkExtractionPrompt(contractorNames);

    // Generate AI response
    const result = await model.generateContent([BULK_EXTRACTION_PROMPT, imagePart]);
    const response = await result.response;
    const extractedText = response.text();

    // Log the raw AI response for debugging
    console.log('=== RAW AI RESPONSE ===');
    console.log('Response length:', extractedText.length);
    console.log('Response content:', extractedText);
    console.log('Response first 500 chars:', extractedText.substring(0, 500));
    console.log('Response last 500 chars:', extractedText.substring(Math.max(0, extractedText.length - 500)));
    console.log('=== END AI RESPONSE ===');

    // Clean the AI response by removing markdown code blocks
    let cleanedText = extractedText.trim();
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/^```json\s*/, '');
    }
    if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```\s*/, '');
    }
    if (cleanedText.endsWith('```')) {
      cleanedText = cleanedText.replace(/\s*```$/, '');
    }

    console.log('Cleaned text for parsing:', cleanedText.substring(0, 200) + '...');

    // Parse the JSON response
    let extractedData;
    try {
      extractedData = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.error('Raw response that failed to parse:', extractedText);
      console.error('Cleaned text that failed to parse:', cleanedText);
      return NextResponse.json({ 
        error: 'AI response could not be parsed',
        details: extractedText
      }, { status: 500 });
    }

    if (!extractedData.workers || !Array.isArray(extractedData.workers)) {
      return NextResponse.json({ 
        error: 'Invalid AI response format',
        details: extractedData
      }, { status: 500 });
    }

    // Fix AI results and ensure we have data for all contractors
    const firstWorkerFromPDF = extractedData.workers[0]; // Fallback data
    
    // Create a map to track which contractors got data from AI
    const aiAssignedContractors = new Set();
    const aiResults = extractedData.workers.map((worker: any) => {
      const contractor = contractors.find((c: any) => c.name === worker.contractorName);
      if (contractor) {
        aiAssignedContractors.add(contractor.id);
        return {
          ...worker,
          contractorId: contractor.id
        };
      }
      return null;
    }).filter(Boolean);

    // For contractors not assigned by AI, give them the first worker's data
    const missingContractors = contractors.filter((c: any) => !aiAssignedContractors.has(c.id));
    const fallbackResults = missingContractors.map((contractor: any) => ({
      ...(firstWorkerFromPDF || {}),
      contractorName: contractor.name,
      workerName: firstWorkerFromPDF?.workerName || contractor.name,
      contractorId: contractor.id,
      // Ensure all required fields exist
      federalTax: firstWorkerFromPDF?.federalTax || '',
      socialSecurity: firstWorkerFromPDF?.socialSecurity || '',
      medicare: firstWorkerFromPDF?.medicare || '',
      stateTax: firstWorkerFromPDF?.stateTax || '',
      localTaxesSDI: firstWorkerFromPDF?.localTaxesSDI || '',
      voluntaryPension: firstWorkerFromPDF?.voluntaryPension || '',
      voluntaryMedical: firstWorkerFromPDF?.voluntaryMedical || '',
      vacDues: firstWorkerFromPDF?.vacDues || '',
      travSubs: firstWorkerFromPDF?.travSubs || '',
      allOtherDeductions: firstWorkerFromPDF?.allOtherDeductions || '',
      totalDeduction: firstWorkerFromPDF?.totalDeduction || '',
      rateInLieuOfFringes: firstWorkerFromPDF?.rateInLieuOfFringes || '',
      totalBaseRatePlusFringes: firstWorkerFromPDF?.totalBaseRatePlusFringes || '',
      hwRate: firstWorkerFromPDF?.hwRate || '',
      healthWelfare: firstWorkerFromPDF?.healthWelfare || '',
      pensionRate: firstWorkerFromPDF?.pensionRate || '',
      pension: firstWorkerFromPDF?.pension || '',
      vacHolRate: firstWorkerFromPDF?.vacHolRate || '',
      vacationHoliday: firstWorkerFromPDF?.vacationHoliday || '',
      trainingRate: firstWorkerFromPDF?.trainingRate || '',
      allOtherFringes: firstWorkerFromPDF?.allOtherFringes || '',
      allOtherRate: firstWorkerFromPDF?.allOtherRate || '',
      totalFringeRateToThird: firstWorkerFromPDF?.totalFringeRateToThird || '',
      totalFringesPaidToThird: firstWorkerFromPDF?.totalFringesPaidToThird || '',
      checkNo: firstWorkerFromPDF?.checkNo || '',
      netPaidWeek: firstWorkerFromPDF?.netPaidWeek || '',
      savings: firstWorkerFromPDF?.savings || '',
      payrollPaymentDate: firstWorkerFromPDF?.payrollPaymentDate || '',
      allOrPartOfFringesPaidToEmployee: firstWorkerFromPDF?.allOrPartOfFringesPaidToEmployee || '',
      vacationHolidayDuesInGrossPay: firstWorkerFromPDF?.vacationHolidayDuesInGrossPay || '',
      voluntaryContributionsInGrossPay: firstWorkerFromPDF?.voluntaryContributionsInGrossPay || ''
    }));

    const matchedData = [...aiResults, ...fallbackResults];

    return NextResponse.json({
      success: true,
      extractedData: matchedData
    });

  } catch (error) {
    console.error('Bulk payroll extraction error:', error);
    return NextResponse.json({ 
      error: 'Failed to process bulk payroll extraction',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}