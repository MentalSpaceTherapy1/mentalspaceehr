/**
 * X12 837P (Professional) Claim Generator
 * 
 * This stub provides the structure for generating HIPAA-compliant 837P
 * claim files for submission to insurance clearinghouses.
 * 
 * Implementation Status: STUB - Requires full implementation
 * 
 * @see docs/integrations/CLEARINGHOUSE_INTEGRATION_SPEC.md
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface Address {
  street: string;
  city: string;
  state: string;
  zip: string;
}

export interface ProviderInfo {
  npi: string;
  taxId: string;
  organizationName: string;
  address: Address;
  taxonomy: string;
  contactName?: string;
  phone?: string;
  medicaidId?: string;
  medicareId?: string;
}

export interface SubscriberInfo {
  memberId: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  dateOfBirth: string; // YYYYMMDD
  gender: 'M' | 'F' | 'U';
  address: Address;
  relationship: '18' | '01' | '19' | 'G8'; // 18=Self, 01=Spouse, 19=Child, G8=Other
}

export interface ServiceLine {
  procedureCode: string; // CPT code
  modifiers?: string[]; // Up to 4 modifiers
  diagnosisCodes: string[]; // ICD-10 diagnosis pointers (1-12)
  serviceDate: string; // YYYYMMDD
  units: number;
  chargeAmount: number;
  placeOfService: string; // 2-digit POS code
  renderingProviderId?: string; // NPI if different from billing
  lineNote?: string;
}

export interface ClaimInfo {
  patientControlNumber: string; // Unique claim identifier (max 38 chars)
  totalChargeAmount: number;
  provider: ProviderInfo;
  subscriber: SubscriberInfo;
  patient: SubscriberInfo; // Same as subscriber if relationship is "18" (Self)
  serviceLines: ServiceLine[];
  billingProvider?: ProviderInfo; // If different from rendering provider
  payerName: string;
  payerId: string; // Payer ID from clearinghouse
  claimFilingIndicator: string; // 09=Self Pay, 11=Other, 12=PPO, 13=POS, etc.
  
  // Optional fields
  referralNumber?: string;
  priorAuthNumber?: string;
  claimNote?: string;
  acceptAssignment?: boolean; // Default: true
  releaseOfInformation?: 'Y' | 'I' | 'N'; // Y=Yes, I=Informed Consent, N=No
  
  // Dates
  accidentDate?: string; // YYYYMMDD
  onsetDate?: string; // YYYYMMDD
  lastSeenDate?: string; // YYYYMMDD
}

export interface X12GeneratorConfig {
  senderId: string; // ISA06 - Sender ID
  receiverId: string; // ISA08 - Receiver ID (Clearinghouse ID)
  senderQualifier?: string; // ISA05 - Default: "ZZ"
  receiverQualifier?: string; // ISA07 - Default: "ZZ"
  testMode?: boolean; // If true, uses test indicator in ISA15
  version?: string; // Default: "005010X222A1"
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
}

// ============================================================================
// Main Generator Class
// ============================================================================

export class Claim837Generator {
  private config: X12GeneratorConfig;
  private segmentTerminator: string = '~';
  private elementSeparator: string = '*';
  private subelementSeparator: string = ':';
  
  constructor(config: X12GeneratorConfig) {
    this.config = {
      senderQualifier: 'ZZ',
      receiverQualifier: 'ZZ',
      testMode: false,
      version: '005010X222A1',
      ...config
    };
  }

  /**
   * Generate complete 837P file from claim data
   * 
   * @param claims - Array of claims to include in the file
   * @returns X12 837P formatted string
   */
  public generate837P(claims: ClaimInfo[]): string {
    // TODO: Implement full 837P generation
    
    const segments: string[] = [];
    
    // Interchange Control Header
    segments.push(this.generateISA());
    
    // Functional Group Header
    segments.push(this.generateGS(claims.length));
    
    // For each claim
    claims.forEach((claim, index) => {
      segments.push(...this.generateClaimSegments(claim, index + 1));
    });
    
    // Functional Group Trailer
    segments.push(this.generateGE(claims.length));
    
    // Interchange Control Trailer
    segments.push(this.generateIEA());
    
    return segments.join('\n');
  }

  /**
   * Validate claim data before generation
   */
  public validateClaim(claim: ClaimInfo): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Required field validation
    if (!claim.patientControlNumber) {
      errors.push({
        field: 'patientControlNumber',
        message: 'Patient Control Number is required',
        code: 'REQUIRED_FIELD'
      });
    }

    if (!claim.provider.npi || !/^\d{10}$/.test(claim.provider.npi)) {
      errors.push({
        field: 'provider.npi',
        message: 'Provider NPI must be exactly 10 digits',
        code: 'INVALID_NPI'
      });
    }

    if (!claim.subscriber.memberId) {
      errors.push({
        field: 'subscriber.memberId',
        message: 'Subscriber Member ID is required',
        code: 'REQUIRED_FIELD'
      });
    }

    if (claim.serviceLines.length === 0) {
      errors.push({
        field: 'serviceLines',
        message: 'At least one service line is required',
        code: 'REQUIRED_FIELD'
      });
    }

    // Service line validation
    claim.serviceLines.forEach((line, idx) => {
      if (!line.procedureCode || !/^\d{5}$/.test(line.procedureCode)) {
        errors.push({
          field: `serviceLines[${idx}].procedureCode`,
          message: 'Procedure code must be 5 digits',
          code: 'INVALID_CPT'
        });
      }

      if (line.diagnosisCodes.length === 0) {
        errors.push({
          field: `serviceLines[${idx}].diagnosisCodes`,
          message: 'At least one diagnosis code is required',
          code: 'REQUIRED_FIELD'
        });
      }

      if (line.chargeAmount <= 0) {
        errors.push({
          field: `serviceLines[${idx}].chargeAmount`,
          message: 'Charge amount must be greater than 0',
          code: 'INVALID_AMOUNT'
        });
      }

      // Warnings
      if (line.modifiers && line.modifiers.length > 4) {
        warnings.push({
          field: `serviceLines[${idx}].modifiers`,
          message: 'More than 4 modifiers provided, only first 4 will be used'
        });
      }
    });

    // Total charge validation
    const calculatedTotal = claim.serviceLines.reduce(
      (sum, line) => sum + (line.chargeAmount * line.units), 
      0
    );
    if (Math.abs(calculatedTotal - claim.totalChargeAmount) > 0.01) {
      warnings.push({
        field: 'totalChargeAmount',
        message: `Total charge amount (${claim.totalChargeAmount}) does not match sum of service lines (${calculatedTotal})`
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // ============================================================================
  // Segment Generators (Stubs)
  // ============================================================================

  private generateISA(): string {
    // ISA - Interchange Control Header
    // TODO: Implement full ISA segment
    const date = this.formatDate(new Date(), 'YYMMDD');
    const time = this.formatTime(new Date());
    const controlNumber = this.generateControlNumber();
    const usageIndicator = this.config.testMode ? 'T' : 'P';
    
    return `ISA${this.elementSeparator}00${this.elementSeparator}          ${this.elementSeparator}00${this.elementSeparator}          ${this.elementSeparator}${this.config.senderQualifier}${this.elementSeparator}${this.padRight(this.config.senderId, 15)}${this.elementSeparator}${this.config.receiverQualifier}${this.elementSeparator}${this.padRight(this.config.receiverId, 15)}${this.elementSeparator}${date}${this.elementSeparator}${time}${this.elementSeparator}^${this.elementSeparator}00501${this.elementSeparator}${controlNumber}${this.elementSeparator}0${this.elementSeparator}${usageIndicator}${this.elementSeparator}${this.subelementSeparator}${this.segmentTerminator}`;
  }

  private generateGS(claimCount: number): string {
    // GS - Functional Group Header
    // TODO: Implement full GS segment
    const date = this.formatDate(new Date(), 'YYYYMMDD');
    const time = this.formatTime(new Date());
    
    return `GS${this.elementSeparator}HC${this.elementSeparator}${this.config.senderId}${this.elementSeparator}${this.config.receiverId}${this.elementSeparator}${date}${this.elementSeparator}${time}${this.elementSeparator}1${this.elementSeparator}X${this.elementSeparator}${this.config.version}${this.segmentTerminator}`;
  }

  private generateClaimSegments(claim: ClaimInfo, claimNumber: number): string[] {
    // TODO: Implement all claim segments
    const segments: string[] = [];
    
    // ST - Transaction Set Header
    segments.push(this.generateST(claimNumber));
    
    // BHT - Beginning of Hierarchical Transaction
    segments.push(this.generateBHT(claim));
    
    // Billing Provider Hierarchy (HL Loop 2000A)
    // NM1*41 - Billing Provider Name
    // TODO: Implement full billing provider segments
    
    // Subscriber Hierarchy (HL Loop 2000B)
    // NM1*IL - Subscriber Name
    // TODO: Implement full subscriber segments
    
    // Patient Hierarchy (HL Loop 2000C) - if patient != subscriber
    // TODO: Implement patient segments
    
    // Claim Information (CLM Loop 2300)
    segments.push(this.generateCLM(claim));
    
    // Service Lines (LX Loop 2400)
    claim.serviceLines.forEach((line, idx) => {
      segments.push(...this.generateServiceLine(line, idx + 1));
    });
    
    // SE - Transaction Set Trailer
    segments.push(this.generateSE(segments.length + 1, claimNumber));
    
    return segments;
  }

  private generateST(transactionNumber: number): string {
    // ST - Transaction Set Header
    const controlNumber = transactionNumber.toString().padStart(4, '0');
    return `ST${this.elementSeparator}837${this.elementSeparator}${controlNumber}${this.elementSeparator}${this.config.version}${this.segmentTerminator}`;
  }

  private generateBHT(claim: ClaimInfo): string {
    // BHT - Beginning of Hierarchical Transaction
    const date = this.formatDate(new Date(), 'YYYYMMDD');
    const time = this.formatTime(new Date());
    
    return `BHT${this.elementSeparator}0019${this.elementSeparator}00${this.elementSeparator}${claim.patientControlNumber}${this.elementSeparator}${date}${this.elementSeparator}${time}${this.elementSeparator}CH${this.segmentTerminator}`;
  }

  private generateCLM(claim: ClaimInfo): string {
    // CLM - Claim Information
    // TODO: Implement full CLM segment with all required elements
    const amount = this.formatAmount(claim.totalChargeAmount);
    
    return `CLM${this.elementSeparator}${claim.patientControlNumber}${this.elementSeparator}${amount}${this.elementSeparator}${this.elementSeparator}${this.elementSeparator}11${this.subelementSeparator}B${this.subelementSeparator}1${this.elementSeparator}Y${this.elementSeparator}A${this.elementSeparator}Y${this.elementSeparator}Y${this.segmentTerminator}`;
  }

  private generateServiceLine(line: ServiceLine, lineNumber: number): string[] {
    // TODO: Implement full service line segments
    const segments: string[] = [];
    
    // LX - Service Line Number
    segments.push(`LX${this.elementSeparator}${lineNumber}${this.segmentTerminator}`);
    
    // SV1 - Professional Service
    const amount = this.formatAmount(line.chargeAmount);
    segments.push(`SV1${this.elementSeparator}HC${this.subelementSeparator}${line.procedureCode}${this.elementSeparator}${amount}${this.elementSeparator}UN${this.elementSeparator}${line.units}${this.segmentTerminator}`);
    
    // DTP - Service Date
    segments.push(`DTP${this.elementSeparator}472${this.elementSeparator}D8${this.elementSeparator}${line.serviceDate}${this.segmentTerminator}`);
    
    return segments;
  }

  private generateSE(segmentCount: number, transactionNumber: number): string {
    // SE - Transaction Set Trailer
    const controlNumber = transactionNumber.toString().padStart(4, '0');
    return `SE${this.elementSeparator}${segmentCount}${this.elementSeparator}${controlNumber}${this.segmentTerminator}`;
  }

  private generateGE(claimCount: number): string {
    // GE - Functional Group Trailer
    return `GE${this.elementSeparator}${claimCount}${this.elementSeparator}1${this.segmentTerminator}`;
  }

  private generateIEA(): string {
    // IEA - Interchange Control Trailer
    return `IEA${this.elementSeparator}1${this.elementSeparator}000000001${this.segmentTerminator}`;
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private formatDate(date: Date, format: 'YYMMDD' | 'YYYYMMDD'): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    if (format === 'YYMMDD') {
      return `${String(year).slice(-2)}${month}${day}`;
    }
    return `${year}${month}${day}`;
  }

  private formatTime(date: Date): string {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}${minutes}`;
  }

  private formatAmount(amount: number): string {
    return amount.toFixed(2);
  }

  private padRight(str: string, length: number): string {
    return str.padEnd(length, ' ');
  }

  private generateControlNumber(): string {
    // TODO: Implement proper control number generation with persistence
    return Math.floor(Math.random() * 999999999).toString().padStart(9, '0');
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Quick validation function for use in API endpoints
 */
export function validateClaimData(claim: ClaimInfo): ValidationResult {
  const generator = new Claim837Generator({
    senderId: 'TEMP',
    receiverId: 'TEMP'
  });
  return generator.validateClaim(claim);
}

/**
 * Generate 837P file from claim data
 * 
 * @example
 * ```typescript
 * const claim: ClaimInfo = {
 *   patientControlNumber: 'CLAIM001',
 *   totalChargeAmount: 150.00,
 *   provider: { ... },
 *   subscriber: { ... },
 *   patient: { ... },
 *   serviceLines: [ ... ],
 *   payerName: 'Blue Cross',
 *   payerId: '12345',
 *   claimFilingIndicator: '12'
 * };
 * 
 * const x12Data = generateClaim837(claim, config);
 * ```
 */
export function generateClaim837(
  claims: ClaimInfo | ClaimInfo[],
  config: X12GeneratorConfig
): string {
  const generator = new Claim837Generator(config);
  const claimArray = Array.isArray(claims) ? claims : [claims];
  return generator.generate837P(claimArray);
}

/**
 * Parse 837P file (for testing/verification)
 * TODO: Implement 837 parser
 */
export function parse837P(x12Data: string): Partial<ClaimInfo>[] {
  // TODO: Implement parser
  throw new Error('837P parser not yet implemented');
}

// ============================================================================
// Export for Testing
// ============================================================================

export const X12Constants = {
  SEGMENT_TERMINATOR: '~',
  ELEMENT_SEPARATOR: '*',
  SUBELEMENT_SEPARATOR: ':',
  VERSION_837P: '005010X222A1',
  
  // Relationship codes
  RELATIONSHIP_SELF: '18',
  RELATIONSHIP_SPOUSE: '01',
  RELATIONSHIP_CHILD: '19',
  RELATIONSHIP_OTHER: 'G8',
  
  // Gender codes
  GENDER_MALE: 'M',
  GENDER_FEMALE: 'F',
  GENDER_UNKNOWN: 'U',
  
  // Place of Service codes (common)
  POS_OFFICE: '11',
  POS_HOME: '12',
  POS_TELEHEALTH: '02',
  
  // Claim filing indicator codes
  CFI_SELF_PAY: '09',
  CFI_OTHER: '11',
  CFI_PPO: '12',
  CFI_POS: '13',
  CFI_EPO: '14',
  CFI_HMO: '16',
  CFI_MEDICARE: 'MB',
  CFI_MEDICAID: 'MC',
} as const;
