/**
 * ERA (835) EDI Parser
 * Parses HIPAA-compliant 835 Electronic Remittance Advice files
 */

export interface ERAFile {
  // ISA - Interchange Control Header
  interchangeControlNumber: string;
  interchangeSenderId: string;
  interchangeReceiverId: string;
  interchangeDate: Date;

  // GS - Functional Group Header
  functionalGroupControlNumber: string;

  // ST - Transaction Set Header
  transactionControlNumber: string;

  // BPR - Financial Information
  transactionHandlingCode: string; // I=Payment, D=Remittance
  paymentAmount: number;
  creditDebitFlag: string; // C=Credit, D=Debit
  paymentMethod: 'ACH' | 'Check' | 'Wire' | 'Credit Card' | 'Other';
  paymentFormat: string;
  paymentDate: Date;
  checkEFTNumber?: string;

  // TRN - Reassociation Trace Number
  traceNumber: string;
  originatorId: string;

  // N1 Loops - Payer/Payee Information
  payer: ERAEntity;
  payee: ERAEntity;

  // Claims
  claims: ERAClaim[];

  // PLB - Provider Level Adjustments
  providerAdjustments: ERAProviderAdjustment[];

  // SE - Transaction Set Trailer
  totalSegments: number;
}

export interface ERAEntity {
  entityIdentifierCode: string; // PR=Payer, PE=Payee
  name: string;
  identificationCode: string; // Tax ID, NPI, etc.
  address?: {
    street1?: string;
    street2?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  contact?: {
    name?: string;
    phone?: string;
    email?: string;
  };
}

export interface ERAClaim {
  // CLP - Claim Payment Information
  patientControlNumber: string;
  claimStatusCode: string;
  claimStatusDescription: string;
  billedAmount: number;
  paidAmount: number;
  patientResponsibility: number;
  claimFilingIndicatorCode: string;
  payerClaimControlNumber?: string;
  facilityTypeCode?: string;

  // CAS - Claim Level Adjustments
  claimAdjustments: ERAAdjustment[];

  // NM1 - Patient Information
  patient: {
    firstName: string;
    lastName: string;
    middleName?: string;
    memberId?: string;
    ssn?: string;
  };

  // NM1 - Rendering Provider
  renderingProvider?: {
    npi?: string;
    taxId?: string;
    firstName?: string;
    lastName?: string;
    organizationName?: string;
  };

  // DTM - Dates
  statementFromDate?: Date;
  statementToDate?: Date;
  receivedDate?: Date;

  // Service Lines
  serviceLines: ERAServiceLine[];
}

export interface ERAServiceLine {
  // SVC - Service Payment Information
  procedureCode: string;
  procedureModifiers: string[];
  billedAmount: number;
  paidAmount: number;
  revenueCode?: string;

  // Units
  billedUnits: number;
  paidUnits: number;

  // DTM - Service Date
  serviceDate: Date;

  // CAS - Service Level Adjustments
  adjustments: ERAAdjustment[];

  // AMT - Amounts
  allowedAmount?: number;

  // Calculated amounts
  contractualAdjustment: number;
  deductible: number;
  copay: number;
  coinsurance: number;
  patientResponsibility: number;

  // REF - Line Item Control Number
  lineItemControlNumber?: string;
}

export interface ERAAdjustment {
  adjustmentGroup: 'CO' | 'PR' | 'OA' | 'PI'; // CO=Contractual, PR=Patient Resp, OA=Other, PI=Payer Initiated
  adjustmentReasonCode: string;
  adjustmentAmount: number;
  adjustmentQuantity?: number;
}

export interface ERAProviderAdjustment {
  providerIdentifier: string;
  fiscalPeriodDate: Date;
  adjustmentReasonCode: string;
  adjustmentIdentifier: string;
  adjustmentAmount: number;
}

export interface ParseResult {
  success: boolean;
  data?: ERAFile;
  errors?: string[];
  warnings?: string[];
}

/**
 * Parse 835 EDI file content
 */
export function parse835EDI(content: string): ParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Normalize line endings and split into segments
    const normalizedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const segments = normalizedContent
      .split('~')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (segments.length === 0) {
      errors.push('Empty EDI file');
      return { success: false, errors };
    }

    // Parse segments
    const parsedSegments = segments.map((seg) => {
      const elements = seg.split('*');
      return {
        segment: elements[0],
        elements: elements.slice(1),
      };
    });

    // Validate structure
    const firstSegment = parsedSegments[0];
    if (firstSegment.segment !== 'ISA') {
      errors.push('EDI file must start with ISA segment');
      return { success: false, errors };
    }

    // Parse ISA
    const isa = parseISA(parsedSegments[0]);
    const elementDelimiter = '*';
    const segmentDelimiter = '~';

    // Parse remaining segments
    let currentIndex = 1;
    let gs: any = null;
    let st: any = null;
    let bpr: any = null;
    let trn: any = null;
    let payer: ERAEntity | null = null;
    let payee: ERAEntity | null = null;
    const claims: ERAClaim[] = [];
    const providerAdjustments: ERAProviderAdjustment[] = [];

    while (currentIndex < parsedSegments.length) {
      const seg = parsedSegments[currentIndex];

      switch (seg.segment) {
        case 'GS':
          gs = parseGS(seg);
          break;
        case 'ST':
          st = parseST(seg);
          break;
        case 'BPR':
          bpr = parseBPR(seg);
          break;
        case 'TRN':
          trn = parseTRN(seg);
          break;
        case 'N1':
          const entity = parseN1Loop(parsedSegments, currentIndex);
          if (entity.data.entityIdentifierCode === 'PR') {
            payer = entity.data;
          } else if (entity.data.entityIdentifierCode === 'PE') {
            payee = entity.data;
          }
          currentIndex = entity.nextIndex - 1; // -1 because we increment at end
          break;
        case 'LX':
          // Start of claim - parse entire claim
          const claimResult = parseClaimLoop(parsedSegments, currentIndex);
          if (claimResult.data) {
            claims.push(claimResult.data);
          }
          currentIndex = claimResult.nextIndex - 1;
          break;
        case 'PLB':
          const plb = parsePLB(seg);
          if (plb) {
            providerAdjustments.push(plb);
          }
          break;
      }

      currentIndex++;
    }

    // Validate required fields
    if (!bpr) {
      errors.push('Missing BPR (Financial Information) segment');
    }
    if (!payer) {
      errors.push('Missing payer information (N1*PR loop)');
    }
    if (!payee) {
      warnings.push('Missing payee information (N1*PE loop)');
    }

    if (errors.length > 0) {
      return { success: false, errors, warnings };
    }

    // Build ERAFile
    const eraFile: ERAFile = {
      interchangeControlNumber: isa.interchangeControlNumber,
      interchangeSenderId: isa.interchangeSenderId,
      interchangeReceiverId: isa.interchangeReceiverId,
      interchangeDate: isa.interchangeDate,
      functionalGroupControlNumber: gs?.functionalGroupControlNumber || '',
      transactionControlNumber: st?.transactionControlNumber || '',
      transactionHandlingCode: bpr.transactionHandlingCode,
      paymentAmount: bpr.paymentAmount,
      creditDebitFlag: bpr.creditDebitFlag,
      paymentMethod: bpr.paymentMethod,
      paymentFormat: bpr.paymentFormat,
      paymentDate: bpr.paymentDate,
      checkEFTNumber: bpr.checkEFTNumber,
      traceNumber: trn?.traceNumber || '',
      originatorId: trn?.originatorId || '',
      payer: payer!,
      payee: payee || ({} as ERAEntity),
      claims,
      providerAdjustments,
      totalSegments: parsedSegments.length,
    };

    return {
      success: true,
      data: eraFile,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    errors.push(`Parse error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { success: false, errors };
  }
}

// Helper parsing functions
function parseISA(seg: { segment: string; elements: string[] }): any {
  return {
    authorizationQualifier: seg.elements[0],
    authorizationInfo: seg.elements[1],
    securityQualifier: seg.elements[2],
    securityInfo: seg.elements[3],
    interchangeSenderIdQualifier: seg.elements[4],
    interchangeSenderId: seg.elements[5],
    interchangeReceiverIdQualifier: seg.elements[6],
    interchangeReceiverId: seg.elements[7],
    interchangeDate: parseEDIDate(seg.elements[8], seg.elements[9]),
    interchangeControlStandardsId: seg.elements[10],
    interchangeControlVersionNumber: seg.elements[11],
    interchangeControlNumber: seg.elements[12],
    acknowledgmentRequested: seg.elements[13],
    testIndicator: seg.elements[14],
  };
}

function parseGS(seg: { segment: string; elements: string[] }): any {
  return {
    functionalIdentifierCode: seg.elements[0],
    applicationSenderCode: seg.elements[1],
    applicationReceiverCode: seg.elements[2],
    date: parseEDIDate(seg.elements[3]),
    time: seg.elements[4],
    functionalGroupControlNumber: seg.elements[5],
    responsibleAgencyCode: seg.elements[6],
    versionReleaseCode: seg.elements[7],
  };
}

function parseST(seg: { segment: string; elements: string[] }): any {
  return {
    transactionSetIdentifierCode: seg.elements[0],
    transactionControlNumber: seg.elements[1],
  };
}

function parseBPR(seg: { segment: string; elements: string[] }): any {
  const paymentMethodMap: Record<string, 'ACH' | 'Check' | 'Wire' | 'Credit Card' | 'Other'> = {
    'ACH': 'ACH',
    'CHK': 'Check',
    'FWT': 'Wire',
    'CCP': 'Credit Card',
  };

  return {
    transactionHandlingCode: seg.elements[0],
    paymentAmount: parseFloat(seg.elements[1]) || 0,
    creditDebitFlag: seg.elements[2],
    paymentMethod: paymentMethodMap[seg.elements[3]] || 'Other',
    paymentFormat: seg.elements[4],
    checkEFTNumber: seg.elements[7],
    paymentDate: parseEDIDate(seg.elements[15]),
  };
}

function parseTRN(seg: { segment: string; elements: string[] }): any {
  return {
    traceTypeCode: seg.elements[0],
    traceNumber: seg.elements[1],
    originatorId: seg.elements[2],
  };
}

function parseN1Loop(
  segments: Array<{ segment: string; elements: string[] }>,
  startIndex: number
): { data: ERAEntity; nextIndex: number } {
  const n1 = segments[startIndex];
  const entity: ERAEntity = {
    entityIdentifierCode: n1.elements[0],
    name: n1.elements[1] || '',
    identificationCode: n1.elements[3] || '',
  };

  let currentIndex = startIndex + 1;

  // Parse N3 (Address) if present
  if (currentIndex < segments.length && segments[currentIndex].segment === 'N3') {
    const n3 = segments[currentIndex];
    entity.address = {
      street1: n3.elements[0],
      street2: n3.elements[1],
    };
    currentIndex++;
  }

  // Parse N4 (City/State/ZIP) if present
  if (currentIndex < segments.length && segments[currentIndex].segment === 'N4') {
    const n4 = segments[currentIndex];
    entity.address = {
      ...entity.address,
      city: n4.elements[0],
      state: n4.elements[1],
      zip: n4.elements[2],
    };
    currentIndex++;
  }

  // Parse PER (Contact) if present
  if (currentIndex < segments.length && segments[currentIndex].segment === 'PER') {
    const per = segments[currentIndex];
    entity.contact = {
      name: per.elements[1],
      phone: per.elements[3],
      email: per.elements[5],
    };
    currentIndex++;
  }

  return { data: entity, nextIndex: currentIndex };
}

function parseClaimLoop(
  segments: Array<{ segment: string; elements: string[] }>,
  startIndex: number
): { data: ERAClaim | null; nextIndex: number } {
  let currentIndex = startIndex + 1; // Skip LX

  // Find CLP segment
  if (currentIndex >= segments.length || segments[currentIndex].segment !== 'CLP') {
    return { data: null, nextIndex: currentIndex };
  }

  const clp = segments[currentIndex];
  const claim: ERAClaim = {
    patientControlNumber: clp.elements[0],
    claimStatusCode: clp.elements[1],
    claimStatusDescription: getClaimStatusDescription(clp.elements[1]),
    billedAmount: parseFloat(clp.elements[2]) || 0,
    paidAmount: parseFloat(clp.elements[3]) || 0,
    patientResponsibility: parseFloat(clp.elements[4]) || 0,
    claimFilingIndicatorCode: clp.elements[5],
    payerClaimControlNumber: clp.elements[6],
    facilityTypeCode: clp.elements[7],
    claimAdjustments: [],
    patient: {
      firstName: '',
      lastName: '',
    },
    serviceLines: [],
  };

  currentIndex++;

  // Parse claim-level segments
  while (currentIndex < segments.length) {
    const seg = segments[currentIndex];

    if (seg.segment === 'LX' || seg.segment === 'SE' || seg.segment === 'PLB') {
      // Next claim or end
      break;
    }

    switch (seg.segment) {
      case 'CAS':
        const adjustments = parseCAS(seg);
        claim.claimAdjustments.push(...adjustments);
        break;
      case 'NM1':
        if (seg.elements[0] === 'QC') {
          // Patient
          claim.patient = {
            firstName: seg.elements[4] || '',
            lastName: seg.elements[2] || '',
            middleName: seg.elements[3],
            memberId: seg.elements[8],
          };
        } else if (seg.elements[0] === '82') {
          // Rendering Provider
          claim.renderingProvider = {
            npi: seg.elements[8],
            firstName: seg.elements[4],
            lastName: seg.elements[2],
            organizationName: seg.elements[2],
          };
        }
        break;
      case 'DTM':
        if (seg.elements[0] === '232') {
          claim.statementFromDate = parseEDIDate(seg.elements[1]);
        } else if (seg.elements[0] === '233') {
          claim.statementToDate = parseEDIDate(seg.elements[1]);
        } else if (seg.elements[0] === '050') {
          claim.receivedDate = parseEDIDate(seg.elements[1]);
        }
        break;
      case 'SVC':
        const serviceLineResult = parseServiceLineLoop(segments, currentIndex);
        if (serviceLineResult.data) {
          claim.serviceLines.push(serviceLineResult.data);
        }
        currentIndex = serviceLineResult.nextIndex - 1;
        break;
    }

    currentIndex++;
  }

  return { data: claim, nextIndex: currentIndex };
}

function parseServiceLineLoop(
  segments: Array<{ segment: string; elements: string[] }>,
  startIndex: number
): { data: ERAServiceLine | null; nextIndex: number } {
  const svc = segments[startIndex];
  const procedureInfo = svc.elements[0].split(':');

  const serviceLine: ERAServiceLine = {
    procedureCode: procedureInfo[1] || '',
    procedureModifiers: procedureInfo.slice(2),
    billedAmount: parseFloat(svc.elements[1]) || 0,
    paidAmount: parseFloat(svc.elements[2]) || 0,
    revenueCode: procedureInfo[0] === 'HC' ? undefined : procedureInfo[0],
    billedUnits: parseFloat(svc.elements[4]) || 0,
    paidUnits: parseFloat(svc.elements[5]) || 0,
    serviceDate: new Date(),
    adjustments: [],
    contractualAdjustment: 0,
    deductible: 0,
    copay: 0,
    coinsurance: 0,
    patientResponsibility: 0,
  };

  let currentIndex = startIndex + 1;

  // Parse service line segments
  while (currentIndex < segments.length) {
    const seg = segments[currentIndex];

    if (seg.segment === 'SVC' || seg.segment === 'LX' || seg.segment === 'SE' || seg.segment === 'PLB') {
      break;
    }

    switch (seg.segment) {
      case 'DTM':
        if (seg.elements[0] === '472') {
          serviceLine.serviceDate = parseEDIDate(seg.elements[1]);
        }
        break;
      case 'CAS':
        const adjustments = parseCAS(seg);
        serviceLine.adjustments.push(...adjustments);

        // Calculate specific adjustment types
        adjustments.forEach((adj) => {
          if (adj.adjustmentGroup === 'CO') {
            serviceLine.contractualAdjustment += adj.adjustmentAmount;
          } else if (adj.adjustmentGroup === 'PR') {
            if (['1', '2', '3'].includes(adj.adjustmentReasonCode)) {
              serviceLine.deductible += adj.adjustmentAmount;
            } else if (adj.adjustmentReasonCode === '2') {
              serviceLine.coinsurance += adj.adjustmentAmount;
            } else if (adj.adjustmentReasonCode === '3') {
              serviceLine.copay += adj.adjustmentAmount;
            }
            serviceLine.patientResponsibility += adj.adjustmentAmount;
          }
        });
        break;
      case 'AMT':
        if (seg.elements[0] === 'B6') {
          serviceLine.allowedAmount = parseFloat(seg.elements[1]) || 0;
        }
        break;
      case 'REF':
        if (seg.elements[0] === '6R') {
          serviceLine.lineItemControlNumber = seg.elements[1];
        }
        break;
    }

    currentIndex++;
  }

  return { data: serviceLine, nextIndex: currentIndex };
}

function parseCAS(seg: { segment: string; elements: string[] }): ERAAdjustment[] {
  const adjustments: ERAAdjustment[] = [];
  const adjustmentGroup = seg.elements[0] as 'CO' | 'PR' | 'OA' | 'PI';

  // CAS can have multiple adjustments (up to 6 sets of 3 elements)
  for (let i = 1; i < seg.elements.length; i += 3) {
    if (seg.elements[i]) {
      adjustments.push({
        adjustmentGroup,
        adjustmentReasonCode: seg.elements[i],
        adjustmentAmount: parseFloat(seg.elements[i + 1]) || 0,
        adjustmentQuantity: seg.elements[i + 2] ? parseFloat(seg.elements[i + 2]) : undefined,
      });
    }
  }

  return adjustments;
}

function parsePLB(seg: { segment: string; elements: string[] }): ERAProviderAdjustment | null {
  if (seg.elements.length < 4) return null;

  return {
    providerIdentifier: seg.elements[0],
    fiscalPeriodDate: parseEDIDate(seg.elements[1]),
    adjustmentReasonCode: seg.elements[2],
    adjustmentIdentifier: seg.elements[3],
    adjustmentAmount: parseFloat(seg.elements[4]) || 0,
  };
}

function parseEDIDate(dateStr: string, timeStr?: string): Date {
  if (!dateStr) return new Date();

  // YYMMDD or YYYYMMDD format
  let year: number, month: number, day: number;

  if (dateStr.length === 8) {
    year = parseInt(dateStr.substring(0, 4));
    month = parseInt(dateStr.substring(4, 6)) - 1;
    day = parseInt(dateStr.substring(6, 8));
  } else if (dateStr.length === 6) {
    year = parseInt(dateStr.substring(0, 2));
    year += year > 50 ? 1900 : 2000;
    month = parseInt(dateStr.substring(2, 4)) - 1;
    day = parseInt(dateStr.substring(4, 6));
  } else {
    return new Date();
  }

  if (timeStr) {
    const hour = parseInt(timeStr.substring(0, 2));
    const minute = parseInt(timeStr.substring(2, 4));
    return new Date(year, month, day, hour, minute);
  }

  return new Date(year, month, day);
}

function getClaimStatusDescription(code: string): string {
  const statusMap: Record<string, string> = {
    '1': 'Processed as Primary',
    '2': 'Processed as Secondary',
    '3': 'Processed as Tertiary',
    '4': 'Denied',
    '5': 'Pended',
    '19': 'Processed as Primary, Forwarded to Additional Payer',
    '20': 'Processed as Secondary, Forwarded to Additional Payer',
    '21': 'Processed as Tertiary, Forwarded to Additional Payer',
    '22': 'Reversal of Previous Payment',
    '23': 'Not Our Claim, Forwarded to Additional Payer',
  };

  return statusMap[code] || `Unknown Status (${code})`;
}

/**
 * Get CARC (Claim Adjustment Reason Code) description
 */
export function getCARCDescription(code: string): string {
  const carcMap: Record<string, string> = {
    '1': 'Deductible Amount',
    '2': 'Coinsurance Amount',
    '3': 'Co-payment Amount',
    '4': 'The procedure code is inconsistent with the modifier used',
    '5': 'The procedure code/modifier is inconsistent with the place of service',
    '16': 'Claim/service lacks information',
    '18': 'Exact duplicate claim/service',
    '22': 'Payment adjusted because this care may be covered by another payer',
    '23': 'Impact of prior payer(s) adjudication',
    '24': 'Charges are covered under a capitation agreement/managed care plan',
    '29': 'Time limit for filing has expired',
    '31': 'Patient cannot be identified as our insured',
    '45': 'Charge exceeds fee schedule/maximum allowable',
    '50': 'Non-covered service',
    '96': 'Non-covered charges',
    '97': 'Payment adjusted because the benefit for this service is included in another service',
    '109': 'Claim not covered by this payer/contractor',
    '204': 'Service is not covered by this payer',
  };

  return carcMap[code] || `Adjustment Code ${code}`;
}
