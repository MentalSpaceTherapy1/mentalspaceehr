import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

/**
 * Insurance Card OCR Extraction
 *
 * Extracts insurance information from card images using OCR
 * This is a placeholder implementation - integrate with your OCR provider
 * (e.g., Google Cloud Vision, Azure Computer Vision, AWS Textract)
 */

interface ExtractRequest {
  frontImageUrl: string;
  backImageUrl?: string | null;
  clientId: string;
  insuranceId?: string;
}

interface ExtractedData {
  insuranceCompany?: string;
  memberId?: string;
  groupNumber?: string;
  payerId?: string;
  planName?: string;
  effectiveDate?: string;
  copay?: string;
  phoneNumber?: string;
  rxBin?: string;
  rxPcn?: string;
}

serve(async (req) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const { frontImageUrl, backImageUrl, clientId, insuranceId }: ExtractRequest = await req.json();

    console.log('[InsuranceCardOCR] Processing card for client:', clientId);

    // TODO: Integrate with OCR service (Google Cloud Vision, Azure, AWS Textract, etc.)
    // For now, return a mock response
    const extractedData: ExtractedData = await extractFromImage(frontImageUrl, backImageUrl);

    return new Response(JSON.stringify(extractedData), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('[InsuranceCardOCR] Error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to extract insurance card data',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});

/**
 * Extract text from insurance card images
 *
 * TODO: Replace with actual OCR integration
 * Options:
 * - Google Cloud Vision API: https://cloud.google.com/vision/docs/ocr
 * - Azure Computer Vision: https://docs.microsoft.com/en-us/azure/cognitive-services/computer-vision/
 * - AWS Textract: https://aws.amazon.com/textract/
 * - Tesseract.js: https://tesseract.projectnaptha.com/
 */
async function extractFromImage(frontUrl: string, backUrl?: string | null): Promise<ExtractedData> {
  console.log('[InsuranceCardOCR] Extracting from:', frontUrl);

  // This is a placeholder - implement actual OCR here
  // For development/testing, you can return mock data

  // Example with Google Cloud Vision:
  // const visionApiKey = Deno.env.get('GOOGLE_VISION_API_KEY');
  // const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${visionApiKey}`, {
  //   method: 'POST',
  //   body: JSON.stringify({
  //     requests: [{
  //       image: { source: { imageUri: frontUrl } },
  //       features: [{ type: 'TEXT_DETECTION' }]
  //     }]
  //   })
  // });
  // const data = await response.json();
  // const text = data.responses[0]?.fullTextAnnotation?.text || '';
  // return parseInsuranceText(text);

  // Mock data for now
  return {
    insuranceCompany: 'Blue Cross Blue Shield',
    memberId: 'ABC123456789',
    groupNumber: 'GRP001',
    planName: 'PPO Gold Plan',
  };
}

/**
 * Parse extracted text to identify insurance fields
 */
function parseInsuranceText(text: string): ExtractedData {
  const data: ExtractedData = {};

  // Common patterns for insurance cards
  const patterns = {
    memberId: /(?:member|id|subscriber)[\s#:]*([A-Z0-9]{6,15})/i,
    groupNumber: /(?:group|grp)[\s#:]*([A-Z0-9]{4,12})/i,
    rxBin: /(?:rx\s*bin|bin)[\s#:]*(\d{6})/i,
    rxPcn: /(?:rx\s*pcn|pcn)[\s#:]*([A-Z0-9]{4,10})/i,
    phone: /(\d{3}[-.]?\d{3}[-.]?\d{4})/,
  };

  // Extract using regex patterns
  for (const [field, pattern] of Object.entries(patterns)) {
    const match = text.match(pattern);
    if (match) {
      data[field as keyof ExtractedData] = match[1];
    }
  }

  // Extract insurance company (usually at the top)
  const lines = text.split('\n');
  if (lines.length > 0) {
    data.insuranceCompany = lines[0].trim();
  }

  return data;
}
