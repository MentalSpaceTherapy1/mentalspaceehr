/**
 * Claim Validation and Scrubbing Logic
 *
 * Validates claims before submission to catch errors early
 */

import type { ClaimSubmissionRequest, ClaimServiceLine, ClaimDiagnosis } from './types';

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  code?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  info: ValidationError[];
}

/**
 * Comprehensive claim validation
 */
export function validateClaim(claim: ClaimSubmissionRequest): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const info: ValidationError[] = [];

  // Header Validation
  validateClaimHeader(claim, errors, warnings);

  // Service Lines Validation
  validateServiceLines(claim.serviceLines, claim.statementFromDate, claim.statementToDate, errors, warnings, info);

  // Diagnoses Validation
  validateDiagnoses(claim.diagnoses, errors, warnings);

  // Cross-field Validation
  validateCrossFields(claim, errors, warnings);

  // Payer-specific Rules
  applyPayerRules(claim, warnings, info);

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    info,
  };
}

/**
 * Validate claim header information
 */
function validateClaimHeader(
  claim: ClaimSubmissionRequest,
  errors: ValidationError[],
  warnings: ValidationError[]
): void {
  // Required fields
  if (!claim.patientId) {
    errors.push({
      field: 'patientId',
      message: 'Patient ID is required',
      severity: 'error',
      code: 'REQUIRED_FIELD',
    });
  }

  if (!claim.insuranceId) {
    errors.push({
      field: 'insuranceId',
      message: 'Insurance ID is required',
      severity: 'error',
      code: 'REQUIRED_FIELD',
    });
  }

  if (!claim.billingProviderId) {
    errors.push({
      field: 'billingProviderId',
      message: 'Billing provider is required',
      severity: 'error',
      code: 'REQUIRED_FIELD',
    });
  }

  if (!claim.renderingProviderId) {
    errors.push({
      field: 'renderingProviderId',
      message: 'Rendering provider is required',
      severity: 'error',
      code: 'REQUIRED_FIELD',
    });
  }

  // Date validation
  const fromDate = new Date(claim.statementFromDate);
  const toDate = new Date(claim.statementToDate);
  const today = new Date();

  if (toDate < fromDate) {
    errors.push({
      field: 'statementToDate',
      message: 'Statement to date cannot be before from date',
      severity: 'error',
      code: 'INVALID_DATE_RANGE',
    });
  }

  // Warn if dates are in the future
  if (fromDate > today) {
    warnings.push({
      field: 'statementFromDate',
      message: 'Statement from date is in the future',
      severity: 'warning',
      code: 'FUTURE_DATE',
    });
  }

  // Warn if dates are very old (>1 year)
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  if (fromDate < oneYearAgo) {
    warnings.push({
      field: 'statementFromDate',
      message: 'Claim is over 1 year old - may be subject to timely filing limits',
      severity: 'warning',
      code: 'OLD_CLAIM',
    });
  }

  // Validate claim type
  if (!['Original', 'Replacement', 'Void'].includes(claim.claimType)) {
    errors.push({
      field: 'claimType',
      message: 'Invalid claim type',
      severity: 'error',
      code: 'INVALID_CLAIM_TYPE',
    });
  }
}

/**
 * Validate service lines
 */
function validateServiceLines(
  serviceLines: ClaimServiceLine[],
  statementFromDate: string,
  statementToDate: string,
  errors: ValidationError[],
  warnings: ValidationError[],
  info: ValidationError[]
): void {
  if (!serviceLines || serviceLines.length === 0) {
    errors.push({
      field: 'serviceLines',
      message: 'At least one service line is required',
      severity: 'error',
      code: 'REQUIRED_FIELD',
    });
    return;
  }

  const fromDate = new Date(statementFromDate);
  const toDate = new Date(statementToDate);

  serviceLines.forEach((line, index) => {
    const lineNum = index + 1;

    // Service date validation
    if (!line.serviceDate) {
      errors.push({
        field: `serviceLines[${index}].serviceDate`,
        message: `Line ${lineNum}: Service date is required`,
        severity: 'error',
        code: 'REQUIRED_FIELD',
      });
    } else {
      const serviceDate = new Date(line.serviceDate);

      // Must be within statement period
      if (serviceDate < fromDate || serviceDate > toDate) {
        errors.push({
          field: `serviceLines[${index}].serviceDate`,
          message: `Line ${lineNum}: Service date must be within statement period`,
          severity: 'error',
          code: 'DATE_OUT_OF_RANGE',
        });
      }
    }

    // CPT code validation
    if (!line.cptCode) {
      errors.push({
        field: `serviceLines[${index}].cptCode`,
        message: `Line ${lineNum}: CPT code is required`,
        severity: 'error',
        code: 'REQUIRED_FIELD',
      });
    } else if (!/^\d{5}$/.test(line.cptCode)) {
      errors.push({
        field: `serviceLines[${index}].cptCode`,
        message: `Line ${lineNum}: CPT code must be 5 digits`,
        severity: 'error',
        code: 'INVALID_FORMAT',
      });
    }

    // Place of service validation
    if (!line.placeOfService) {
      errors.push({
        field: `serviceLines[${index}].placeOfService`,
        message: `Line ${lineNum}: Place of service is required`,
        severity: 'error',
        code: 'REQUIRED_FIELD',
      });
    } else if (!/^\d{2}$/.test(line.placeOfService)) {
      errors.push({
        field: `serviceLines[${index}].placeOfService`,
        message: `Line ${lineNum}: Place of service must be 2 digits`,
        severity: 'error',
        code: 'INVALID_FORMAT',
      });
    }

    // Units validation
    if (!line.units || line.units < 1) {
      errors.push({
        field: `serviceLines[${index}].units`,
        message: `Line ${lineNum}: Units must be at least 1`,
        severity: 'error',
        code: 'INVALID_VALUE',
      });
    } else if (line.units > 999) {
      warnings.push({
        field: `serviceLines[${index}].units`,
        message: `Line ${lineNum}: Unusually high unit count (${line.units})`,
        severity: 'warning',
        code: 'HIGH_UNITS',
      });
    }

    // Charge validation
    if (!line.unitCharge || line.unitCharge <= 0) {
      errors.push({
        field: `serviceLines[${index}].unitCharge`,
        message: `Line ${lineNum}: Unit charge must be greater than 0`,
        severity: 'error',
        code: 'INVALID_VALUE',
      });
    } else if (line.unitCharge > 10000) {
      warnings.push({
        field: `serviceLines[${index}].unitCharge`,
        message: `Line ${lineNum}: Unusually high charge ($${line.unitCharge})`,
        severity: 'warning',
        code: 'HIGH_CHARGE',
      });
    }

    // Diagnosis pointers validation
    if (!line.diagnosisPointers || line.diagnosisPointers.length === 0) {
      errors.push({
        field: `serviceLines[${index}].diagnosisPointers`,
        message: `Line ${lineNum}: At least one diagnosis pointer is required`,
        severity: 'error',
        code: 'REQUIRED_FIELD',
      });
    }

    // Modifier validation
    if (line.modifiers && line.modifiers.length > 4) {
      errors.push({
        field: `serviceLines[${index}].modifiers`,
        message: `Line ${lineNum}: Maximum of 4 modifiers allowed`,
        severity: 'error',
        code: 'TOO_MANY_MODIFIERS',
      });
    }

    // Check for common CPT code issues
    if (line.cptCode) {
      validateCPTCode(line.cptCode, lineNum, warnings, info);
    }
  });

  // Check for duplicate service lines
  const duplicates = findDuplicateServiceLines(serviceLines);
  if (duplicates.length > 0) {
    warnings.push({
      field: 'serviceLines',
      message: `Possible duplicate service lines: ${duplicates.join(', ')}`,
      severity: 'warning',
      code: 'DUPLICATE_LINES',
    });
  }
}

/**
 * Validate diagnoses
 */
function validateDiagnoses(
  diagnoses: ClaimDiagnosis[],
  errors: ValidationError[],
  warnings: ValidationError[]
): void {
  if (!diagnoses || diagnoses.length === 0) {
    errors.push({
      field: 'diagnoses',
      message: 'At least one diagnosis is required',
      severity: 'error',
      code: 'REQUIRED_FIELD',
    });
    return;
  }

  // Check for primary diagnosis
  const hasPrimary = diagnoses.some((d) => d.diagnosisType === 'primary');
  if (!hasPrimary) {
    errors.push({
      field: 'diagnoses',
      message: 'At least one primary diagnosis is required',
      severity: 'error',
      code: 'MISSING_PRIMARY_DIAGNOSIS',
    });
  }

  // Validate each diagnosis
  diagnoses.forEach((diagnosis, index) => {
    const diagNum = index + 1;

    if (!diagnosis.diagnosisCode) {
      errors.push({
        field: `diagnoses[${index}].diagnosisCode`,
        message: `Diagnosis ${diagNum}: ICD-10 code is required`,
        severity: 'error',
        code: 'REQUIRED_FIELD',
      });
    } else {
      // Validate ICD-10 format (basic)
      if (!/^[A-Z]\d{2}/.test(diagnosis.diagnosisCode)) {
        errors.push({
          field: `diagnoses[${index}].diagnosisCode`,
          message: `Diagnosis ${diagNum}: Invalid ICD-10 format`,
          severity: 'error',
          code: 'INVALID_FORMAT',
        });
      }
    }

    if (!diagnosis.diagnosisPointer) {
      errors.push({
        field: `diagnoses[${index}].diagnosisPointer`,
        message: `Diagnosis ${diagNum}: Diagnosis pointer is required`,
        severity: 'error',
        code: 'REQUIRED_FIELD',
      });
    }
  });

  // Check for duplicate diagnoses
  const duplicates = findDuplicateDiagnoses(diagnoses);
  if (duplicates.length > 0) {
    warnings.push({
      field: 'diagnoses',
      message: `Duplicate diagnosis codes: ${duplicates.join(', ')}`,
      severity: 'warning',
      code: 'DUPLICATE_DIAGNOSES',
    });
  }

  // Maximum diagnoses check
  if (diagnoses.length > 12) {
    warnings.push({
      field: 'diagnoses',
      message: 'More than 12 diagnoses - some payers may not accept all',
      severity: 'warning',
      code: 'TOO_MANY_DIAGNOSES',
    });
  }
}

/**
 * Cross-field validation
 */
function validateCrossFields(
  claim: ClaimSubmissionRequest,
  errors: ValidationError[],
  warnings: ValidationError[]
): void {
  // Validate diagnosis pointers reference valid diagnoses
  claim.serviceLines.forEach((line, index) => {
    line.diagnosisPointers.forEach((pointer) => {
      if (pointer > claim.diagnoses.length) {
        errors.push({
          field: `serviceLines[${index}].diagnosisPointers`,
          message: `Line ${index + 1}: Diagnosis pointer ${pointer} references non-existent diagnosis`,
          severity: 'error',
          code: 'INVALID_DIAGNOSIS_POINTER',
        });
      }
    });
  });

  // Calculate total charges
  const totalCharge = claim.serviceLines.reduce(
    (sum, line) => sum + line.units * line.unitCharge,
    0
  );

  if (totalCharge === 0) {
    errors.push({
      field: 'serviceLines',
      message: 'Total claim amount cannot be $0.00',
      severity: 'error',
      code: 'ZERO_CHARGE',
    });
  } else if (totalCharge > 100000) {
    warnings.push({
      field: 'serviceLines',
      message: `Very high total charge: $${totalCharge.toFixed(2)}`,
      severity: 'warning',
      code: 'HIGH_TOTAL_CHARGE',
    });
  }
}

/**
 * Apply payer-specific validation rules
 */
function applyPayerRules(
  claim: ClaimSubmissionRequest,
  warnings: ValidationError[],
  info: ValidationError[]
): void {
  // Example payer rules - expand based on actual payer requirements

  // Medicare rules
  // - Typically requires NPI for providers
  // - Specific documentation requirements

  // Medicaid rules
  // - May require prior authorization for certain services
  // - Family income verification

  // Commercial insurance
  // - Network participation status
  // - Referral requirements

  info.push({
    field: 'general',
    message: 'Verify all payer-specific requirements before submission',
    severity: 'info',
    code: 'PAYER_RULES',
  });
}

/**
 * Validate CPT code specifics
 */
function validateCPTCode(
  cptCode: string,
  lineNum: number,
  warnings: ValidationError[],
  info: ValidationError[]
): void {
  // Check for common psychotherapy codes that require specific time documentation
  const timeBased = ['90832', '90834', '90837', '90833', '90836', '90838'];
  if (timeBased.includes(cptCode)) {
    info.push({
      field: 'serviceLines',
      message: `Line ${lineNum}: CPT ${cptCode} is time-based - ensure documentation includes time`,
      severity: 'info',
      code: 'TIME_BASED_CPT',
    });
  }

  // Check for add-on codes that require a primary service
  const addOnCodes = ['90785', '90840'];
  if (addOnCodes.includes(cptCode)) {
    info.push({
      field: 'serviceLines',
      message: `Line ${lineNum}: CPT ${cptCode} is an add-on code - must be billed with primary service`,
      severity: 'info',
      code: 'ADD_ON_CODE',
    });
  }

  // Check for codes requiring prior authorization
  const priorAuthRequired = ['97151', '97152', '97153', '97154', '97155', '97156', '97157', '97158'];
  if (priorAuthRequired.includes(cptCode)) {
    warnings.push({
      field: 'serviceLines',
      message: `Line ${lineNum}: CPT ${cptCode} typically requires prior authorization`,
      severity: 'warning',
      code: 'PRIOR_AUTH_RECOMMENDED',
    });
  }
}

/**
 * Find duplicate service lines
 */
function findDuplicateServiceLines(serviceLines: ClaimServiceLine[]): string[] {
  const seen = new Set<string>();
  const duplicates: string[] = [];

  serviceLines.forEach((line, index) => {
    const key = `${line.serviceDate}-${line.cptCode}-${line.placeOfService}`;
    if (seen.has(key)) {
      duplicates.push(`Line ${index + 1}`);
    }
    seen.add(key);
  });

  return duplicates;
}

/**
 * Find duplicate diagnoses
 */
function findDuplicateDiagnoses(diagnoses: ClaimDiagnosis[]): string[] {
  const seen = new Set<string>();
  const duplicates: string[] = [];

  diagnoses.forEach((diagnosis) => {
    if (seen.has(diagnosis.diagnosisCode)) {
      duplicates.push(diagnosis.diagnosisCode);
    }
    seen.add(diagnosis.diagnosisCode);
  });

  return [...new Set(duplicates)]; // Remove duplicate entries in the duplicates array
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(result: ValidationResult): string {
  const lines: string[] = [];

  if (result.errors.length > 0) {
    lines.push('Errors:');
    result.errors.forEach((error) => {
      lines.push(`  - ${error.message}`);
    });
  }

  if (result.warnings.length > 0) {
    lines.push('Warnings:');
    result.warnings.forEach((warning) => {
      lines.push(`  - ${warning.message}`);
    });
  }

  if (result.info.length > 0) {
    lines.push('Information:');
    result.info.forEach((info) => {
      lines.push(`  - ${info.message}`);
    });
  }

  return lines.join('\n');
}
