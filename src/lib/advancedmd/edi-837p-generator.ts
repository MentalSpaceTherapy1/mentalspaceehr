/**
 * 837P EDI Generation
 *
 * Generates HIPAA-compliant 837P (Professional) EDI files for electronic claim submission
 */

import type { ClaimSubmissionRequest } from './types';

interface EDI837POptions {
  submitterId: string;
  submitterName: string;
  submitterContactName: string;
  submitterContactPhone: string;
  receiverId: string;
  receiverName: string;
  testMode?: boolean;
}

interface EDISegment {
  segment: string;
  elements: string[];
}

/**
 * Generate 837P EDI file from claim data
 */
export function generate837P(
  claim: ClaimSubmissionRequest,
  options: EDI837POptions
): string {
  const segments: EDISegment[] = [];
  const timestamp = new Date();
  const controlNumber = generateControlNumber();

  // ISA - Interchange Control Header
  segments.push(generateISA(options, controlNumber, timestamp));

  // GS - Functional Group Header
  segments.push(generateGS(options, controlNumber, timestamp));

  // ST - Transaction Set Header
  segments.push(generateST(controlNumber));

  // BHT - Beginning of Hierarchical Transaction
  segments.push(generateBHT(claim.claimId, timestamp));

  // 1000A - Submitter Name
  segments.push(...generate1000A(options));

  // 1000B - Receiver Name
  segments.push(...generate1000B(options));

  // 2000A - Billing Provider Hierarchical Level
  segments.push(...generate2000A(claim));

  // 2010AA - Billing Provider Name
  segments.push(...generate2010AA(claim));

  // 2000B - Subscriber Hierarchical Level
  segments.push(...generate2000B(claim));

  // 2010BA - Subscriber Name
  segments.push(...generate2010BA(claim));

  // 2300 - Claim Information
  segments.push(...generate2300(claim));

  // 2310A - Rendering Provider Name
  segments.push(...generate2310A(claim));

  // 2400 - Service Line
  claim.serviceLines.forEach((line, index) => {
    segments.push(...generate2400(line, index + 1));
  });

  // SE - Transaction Set Trailer
  segments.push(generateSE(segments.length + 1, controlNumber));

  // GE - Functional Group Trailer
  segments.push(generateGE(1, controlNumber));

  // IEA - Interchange Control Trailer
  segments.push(generateIEA(1, controlNumber));

  return formatEDI(segments);
}

/**
 * ISA - Interchange Control Header
 */
function generateISA(
  options: EDI837POptions,
  controlNumber: string,
  timestamp: Date
): EDISegment {
  return {
    segment: 'ISA',
    elements: [
      '00', // Authorization Information Qualifier
      '          ', // Authorization Information (10 spaces)
      '00', // Security Information Qualifier
      '          ', // Security Information (10 spaces)
      'ZZ', // Interchange ID Qualifier - Submitter
      padRight(options.submitterId, 15),
      'ZZ', // Interchange ID Qualifier - Receiver
      padRight(options.receiverId, 15),
      formatDate(timestamp, 'yyMMdd'), // Interchange Date
      formatTime(timestamp, 'HHmm'), // Interchange Time
      'U', // Repetition Separator (Deprecated - use ^)
      '00401', // Interchange Control Version Number
      controlNumber.padStart(9, '0'), // Interchange Control Number
      '0', // Acknowledgment Requested
      options.testMode ? 'T' : 'P', // Usage Indicator (T=Test, P=Production)
      ':', // Component Element Separator
    ],
  };
}

/**
 * GS - Functional Group Header
 */
function generateGS(
  options: EDI837POptions,
  controlNumber: string,
  timestamp: Date
): EDISegment {
  return {
    segment: 'GS',
    elements: [
      'HC', // Functional Identifier Code (HC = Health Care Claim)
      options.submitterId,
      options.receiverId,
      formatDate(timestamp, 'yyyyMMdd'),
      formatTime(timestamp, 'HHmm'),
      controlNumber,
      'X', // Responsible Agency Code (X = Accredited Standards Committee)
      '005010X222A1', // Version/Release/Industry Identifier Code
    ],
  };
}

/**
 * ST - Transaction Set Header
 */
function generateST(controlNumber: string): EDISegment {
  return {
    segment: 'ST',
    elements: [
      '837', // Transaction Set Identifier Code
      controlNumber.padStart(4, '0'), // Transaction Set Control Number
      '005010X222A1', // Implementation Convention Reference
    ],
  };
}

/**
 * BHT - Beginning of Hierarchical Transaction
 */
function generateBHT(claimId: string, timestamp: Date): EDISegment {
  return {
    segment: 'BHT',
    elements: [
      '0019', // Hierarchical Structure Code (0019 = Information Source, Subscriber, Dependent)
      '00', // Transaction Set Purpose Code (00 = Original)
      claimId, // Reference Identification (Submitter's Transaction Reference Number)
      formatDate(timestamp, 'yyyyMMdd'), // Date
      formatTime(timestamp, 'HHmmss'), // Time
      'CH', // Transaction Type Code (CH = Chargeable)
    ],
  };
}

/**
 * 1000A - Submitter Name
 */
function generate1000A(options: EDI837POptions): EDISegment[] {
  return [
    {
      segment: 'NM1',
      elements: [
        '41', // Entity Identifier Code (41 = Submitter)
        '2', // Entity Type Qualifier (2 = Non-Person Entity)
        options.submitterName,
        '', // Name First
        '', // Name Middle
        '', // Name Prefix
        '', // Name Suffix
        '46', // Identification Code Qualifier (46 = Electronic Transmitter Identification Number)
        options.submitterId,
      ],
    },
    {
      segment: 'PER',
      elements: [
        'IC', // Contact Function Code (IC = Information Contact)
        options.submitterContactName,
        'TE', // Communication Number Qualifier (TE = Telephone)
        formatPhone(options.submitterContactPhone),
      ],
    },
  ];
}

/**
 * 1000B - Receiver Name
 */
function generate1000B(options: EDI837POptions): EDISegment[] {
  return [
    {
      segment: 'NM1',
      elements: [
        '40', // Entity Identifier Code (40 = Receiver)
        '2', // Entity Type Qualifier (2 = Non-Person Entity)
        options.receiverName,
        '', // Name First
        '', // Name Middle
        '', // Name Prefix
        '', // Name Suffix
        '46', // Identification Code Qualifier
        options.receiverId,
      ],
    },
  ];
}

/**
 * 2000A - Billing Provider Hierarchical Level
 */
function generate2000A(claim: ClaimSubmissionRequest): EDISegment[] {
  return [
    {
      segment: 'HL',
      elements: [
        '1', // Hierarchical ID Number
        '', // Hierarchical Parent ID Number
        '20', // Hierarchical Level Code (20 = Information Source)
        '1', // Hierarchical Child Code (1 = Additional Subordinate HL Present)
      ],
    },
    {
      segment: 'PRV',
      elements: [
        'BI', // Provider Code (BI = Billing)
        'PXC', // Reference Identification Qualifier (PXC = Health Care Provider Taxonomy Code)
        '103T00000X', // Provider Taxonomy Code (103T00000X = Psychologist)
      ],
    },
  ];
}

/**
 * 2010AA - Billing Provider Name
 */
function generate2010AA(claim: ClaimSubmissionRequest): EDISegment[] {
  // In production, this would fetch actual provider data
  return [
    {
      segment: 'NM1',
      elements: [
        '85', // Entity Identifier Code (85 = Billing Provider)
        '2', // Entity Type Qualifier (2 = Non-Person Entity)
        'Mental Space Therapy', // Organization Name
        '', '', '', '', '', // Name components
        'XX', // Identification Code Qualifier (XX = Health Care Financing Administration National Provider Identifier)
        claim.billingProviderId, // Provider NPI
      ],
    },
    {
      segment: 'N3',
      elements: [
        '123 Main Street', // Address Line 1
      ],
    },
    {
      segment: 'N4',
      elements: [
        'San Francisco', // City
        'CA', // State
        '94102', // ZIP Code
      ],
    },
    {
      segment: 'REF',
      elements: [
        'EI', // Reference Identification Qualifier (EI = Employer's Identification Number)
        '123456789', // Tax ID
      ],
    },
  ];
}

/**
 * 2000B - Subscriber Hierarchical Level
 */
function generate2000B(claim: ClaimSubmissionRequest): EDISegment[] {
  return [
    {
      segment: 'HL',
      elements: [
        '2', // Hierarchical ID Number
        '1', // Hierarchical Parent ID Number
        '22', // Hierarchical Level Code (22 = Subscriber)
        '0', // Hierarchical Child Code (0 = No Subordinate HL)
      ],
    },
    {
      segment: 'SBR',
      elements: [
        'P', // Payer Responsibility Sequence Number Code (P = Primary)
        '18', // Individual Relationship Code (18 = Self)
        '', // Reference Identification
        '', // Name
        '', // Insurance Type Code
        '', '', '', '', // Reserved
        'CI', // Claim Filing Indicator Code (CI = Commercial Insurance Co.)
      ],
    },
  ];
}

/**
 * 2010BA - Subscriber Name
 */
function generate2010BA(claim: ClaimSubmissionRequest): EDISegment[] {
  // In production, fetch actual patient data
  return [
    {
      segment: 'NM1',
      elements: [
        'IL', // Entity Identifier Code (IL = Insured or Subscriber)
        '1', // Entity Type Qualifier (1 = Person)
        'Doe', // Last Name
        'John', // First Name
        'A', // Middle Name
        '', // Name Prefix
        '', // Name Suffix
        'MI', // Identification Code Qualifier (MI = Member Identification Number)
        'ABC123456789', // Subscriber ID
      ],
    },
    {
      segment: 'DMG',
      elements: [
        'D8', // Date Time Period Format Qualifier
        '19850615', // Date of Birth (CCYYMMDD)
        'M', // Gender Code (M = Male, F = Female, U = Unknown)
      ],
    },
  ];
}

/**
 * 2300 - Claim Information
 */
function generate2300(claim: ClaimSubmissionRequest): EDISegment[] {
  const totalCharge = claim.serviceLines.reduce(
    (sum, line) => sum + line.units * line.unitCharge,
    0
  );

  return [
    {
      segment: 'CLM',
      elements: [
        claim.claimId, // Patient Control Number
        totalCharge.toFixed(2), // Total Claim Charge Amount
        '', // Reserved
        '', // Reserved
        `${claim.serviceLines[0]?.placeOfService}:B:1`, // Facility Code:Frequency:Signature
        'Y', // Provider or Supplier Signature Indicator (Y = Yes)
        'A', // Medicare Assignment Code (A = Assigned)
        'Y', // Benefits Assignment Certification Indicator
        '', // Reserved
        '', // Reserved
      ],
    },
    {
      segment: 'DTP',
      elements: [
        '434', // Date Time Qualifier (434 = Statement)
        'RD8', // Date Time Period Format Qualifier (RD8 = Range of Dates)
        `${claim.statementFromDate.replace(/-/g, '')}-${claim.statementToDate.replace(/-/g, '')}`,
      ],
    },
    // Health Care Diagnosis Codes
    ...claim.diagnoses.map((diagnosis, index) => ({
      segment: 'HI',
      elements: [
        `ABK:${diagnosis.diagnosisCode}`, // Health Care Code Information (ABK = ICD-10)
      ],
    })),
  ];
}

/**
 * 2310A - Rendering Provider Name
 */
function generate2310A(claim: ClaimSubmissionRequest): EDISegment[] {
  return [
    {
      segment: 'NM1',
      elements: [
        '82', // Entity Identifier Code (82 = Rendering Provider)
        '1', // Entity Type Qualifier (1 = Person)
        'Smith', // Last Name
        'Jane', // First Name
        'M', // Middle Name
        '', // Name Prefix
        '', // Name Suffix
        'XX', // Identification Code Qualifier (XX = NPI)
        claim.renderingProviderId, // Rendering Provider NPI
      ],
    },
  ];
}

/**
 * 2400 - Service Line
 */
function generate2400(line: any, lineNumber: number): EDISegment[] {
  const lineCharge = line.units * line.unitCharge;

  return [
    {
      segment: 'LX',
      elements: [lineNumber.toString()], // Assigned Number (Line Counter)
    },
    {
      segment: 'SV1',
      elements: [
        `HC:${line.cptCode}${line.modifiers?.length ? ':' + line.modifiers.join(':') : ''}`, // Composite Medical Procedure
        lineCharge.toFixed(2), // Line Item Charge Amount
        'UN', // Unit or Basis for Measurement Code (UN = Unit)
        line.units.toString(), // Service Unit Count
        line.placeOfService, // Place of Service Code
        '', // Reserved
        line.diagnosisPointers.join(':'), // Diagnosis Code Pointers
      ],
    },
    {
      segment: 'DTP',
      elements: [
        '472', // Date Time Qualifier (472 = Service)
        'D8', // Date Time Period Format Qualifier
        line.serviceDate.replace(/-/g, ''), // Service Date (CCYYMMDD)
      ],
    },
  ];
}

/**
 * SE - Transaction Set Trailer
 */
function generateSE(segmentCount: number, controlNumber: string): EDISegment {
  return {
    segment: 'SE',
    elements: [
      segmentCount.toString(), // Number of Included Segments
      controlNumber.padStart(4, '0'), // Transaction Set Control Number
    ],
  };
}

/**
 * GE - Functional Group Trailer
 */
function generateGE(transactionCount: number, controlNumber: string): EDISegment {
  return {
    segment: 'GE',
    elements: [
      transactionCount.toString(), // Number of Transaction Sets Included
      controlNumber, // Group Control Number
    ],
  };
}

/**
 * IEA - Interchange Control Trailer
 */
function generateIEA(groupCount: number, controlNumber: string): EDISegment {
  return {
    segment: 'IEA',
    elements: [
      groupCount.toString(), // Number of Included Functional Groups
      controlNumber.padStart(9, '0'), // Interchange Control Number
    ],
  };
}

/**
 * Format EDI segments into proper EDI file format
 */
function formatEDI(segments: EDISegment[]): string {
  return segments.map((seg) => {
    const elements = [seg.segment, ...seg.elements];
    return elements.join('*') + '~\n';
  }).join('');
}

/**
 * Generate unique control number
 */
function generateControlNumber(): string {
  return Date.now().toString().slice(-9);
}

/**
 * Format date for EDI
 */
function formatDate(date: Date, format: string): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');

  switch (format) {
    case 'yyMMdd':
      return `${year.toString().slice(-2)}${month}${day}`;
    case 'yyyyMMdd':
      return `${year}${month}${day}`;
    default:
      return `${year}${month}${day}`;
  }
}

/**
 * Format time for EDI
 */
function formatTime(date: Date, format: string): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');

  switch (format) {
    case 'HHmm':
      return `${hours}${minutes}`;
    case 'HHmmss':
      return `${hours}${minutes}${seconds}`;
    default:
      return `${hours}${minutes}`;
  }
}

/**
 * Format phone number for EDI
 */
function formatPhone(phone: string): string {
  return phone.replace(/\D/g, '').slice(0, 10);
}

/**
 * Pad string to right with spaces
 */
function padRight(str: string, length: number): string {
  return str.slice(0, length).padEnd(length, ' ');
}

/**
 * Validate 837P EDI file
 */
export function validate837P(ediContent: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check for required segments
  const requiredSegments = ['ISA', 'GS', 'ST', 'BHT', 'SE', 'GE', 'IEA'];
  requiredSegments.forEach((segment) => {
    if (!ediContent.includes(`${segment}*`)) {
      errors.push(`Missing required segment: ${segment}`);
    }
  });

  // Check segment terminator
  if (!ediContent.includes('~')) {
    errors.push('Missing segment terminator (~)');
  }

  // Check element separator
  if (!ediContent.includes('*')) {
    errors.push('Missing element separator (*)');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
