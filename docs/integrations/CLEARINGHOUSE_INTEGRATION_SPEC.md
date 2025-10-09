# Insurance Clearinghouse Integration Specification

## Overview
This document outlines the specification for integrating with insurance clearinghouses to submit electronic claims (X12 837) and receive remittance advice (X12 835).

## Purpose
Enable automated claim submission and tracking with insurance payers through clearinghouse intermediaries, reducing manual claim processing and improving revenue cycle efficiency.

## Clearinghouse Options

### Primary Options
1. **Change Healthcare** (formerly Emdeon)
   - Market leader, 50%+ market share
   - Strong payer connectivity
   - Real-time eligibility verification
   - Pricing: Per-claim transaction fees

2. **Availity**
   - Free basic services for providers
   - Strong regional payer network
   - Real-time claim status
   - Pricing: Free tier available, premium features paid

3. **Trizetto Gateway**
   - Comprehensive clearinghouse services
   - Advanced analytics and reporting
   - ERA/EOB automation
   - Pricing: Subscription + per-transaction

### Selection Criteria
- Payer network coverage
- Real-time response capabilities
- Integration complexity (API vs. SFTP)
- Cost structure
- Claim scrubbing quality
- Support and reliability

## X12 Transaction Sets

### 837 Professional (837P)
**Purpose**: Submit professional claims (outpatient mental health services)

**Key Segments**:
- ISA/GS: Interchange and group headers
- ST/BHT: Transaction set header
- NM1: Name segments (billing provider, rendering provider, subscriber, patient)
- CLM: Claim information
- DTP: Date/time periods
- REF: Reference identification
- SBR: Subscriber information
- LX: Service line number
- SV1: Professional service

**Example Structure**:
```
ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       *YYMMDD*HHMM*^*00501*000000001*0*P*:~
GS*HC*SENDER*RECEIVER*YYYYMMDD*HHMM*1*X*005010X222A1~
ST*837*0001*005010X222A1~
BHT*0019*00*BATCH123*YYYYMMDD*HHMM*CH~
NM1*41*2*PRACTICE NAME*****46*TAX_ID~
...
SE*100*0001~
GE*1*1~
IEA*1*000000001~
```

### 835 Remittance Advice
**Purpose**: Receive payment and adjustment information from payers

**Key Segments**:
- CLP: Claim payment information
- CAS: Claim adjustment
- SVC: Service payment information
- AMT: Monetary amounts

### 270/271 Eligibility Inquiry/Response
**Purpose**: Verify patient insurance eligibility and benefits

### 276/277 Claim Status Inquiry/Response
**Purpose**: Check status of submitted claims

## Data Requirements

### Provider Information
```typescript
interface ProviderInfo {
  npi: string;              // National Provider Identifier
  taxId: string;            // Tax ID (EIN)
  organizationName: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  taxonomy: string;         // Provider taxonomy code
  // Optional
  medicaidId?: string;
  medicareId?: string;
}
```

### Patient/Subscriber Information
```typescript
interface SubscriberInfo {
  memberId: string;         // Insurance member ID
  firstName: string;
  lastName: string;
  dateOfBirth: string;      // YYYYMMDD
  gender: 'M' | 'F' | 'U';
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  relationship: '18' | '01' | '19' | 'G8'; // Self, Spouse, Child, Other
}
```

### Service Line Information
```typescript
interface ServiceLine {
  procedureCode: string;     // CPT code
  modifiers?: string[];      // CPT modifiers
  diagnosisCodes: string[];  // ICD-10 codes (pointers)
  serviceDate: string;       // YYYYMMDD
  units: number;
  chargeAmount: number;
  placeOfService: string;    // POS code
  renderingProviderId?: string;
}
```

### Claim Information
```typescript
interface ClaimInfo {
  patientControlNumber: string;  // Unique claim identifier
  totalChargeAmount: number;
  provider: ProviderInfo;
  subscriber: SubscriberInfo;
  patient: SubscriberInfo;       // Same as subscriber if self
  serviceLines: ServiceLine[];
  billingProvider?: ProviderInfo; // If different from rendering
  referralNumber?: string;
  priorAuthNumber?: string;
  claimNote?: string;
}
```

## Integration Architecture

### Option 1: REST API Integration
```typescript
interface ClearinghouseAPI {
  // Submit claim
  submitClaim(claim837: string): Promise<{
    success: boolean;
    trackingId: string;
    errors?: ValidationError[];
  }>;
  
  // Check claim status
  getClaimStatus(trackingId: string): Promise<{
    status: ClaimStatus;
    payer: string;
    submittedDate: string;
    lastUpdate: string;
    details?: string;
  }>;
  
  // Retrieve remittance
  getRemittance(startDate: string, endDate: string): Promise<{
    remittances: Remittance835[];
  }>;
  
  // Verify eligibility
  checkEligibility(request270: EligibilityRequest): Promise<{
    eligible: boolean;
    benefits: BenefitDetails[];
    errors?: string[];
  }>;
}

type ClaimStatus = 
  | 'submitted'
  | 'accepted'
  | 'rejected'
  | 'in_process'
  | 'paid'
  | 'denied'
  | 'pending';
```

### Option 2: SFTP Integration
```typescript
interface SFTPConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  // Directories
  outboundDir: string;  // Where to upload 837 files
  inboundDir: string;   // Where to download 835/277 files
  archiveDir: string;   // Processed files
}
```

## Database Schema

### Claims Submission Tracking
```sql
CREATE TABLE clearinghouse_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id),
  session_id UUID REFERENCES sessions(id),
  
  -- Claim identification
  patient_control_number TEXT NOT NULL UNIQUE,
  clearinghouse_tracking_id TEXT,
  payer_claim_number TEXT,
  
  -- Submission details
  submitted_at TIMESTAMP WITH TIME ZONE,
  claim_837_data JSONB NOT NULL,
  file_name TEXT,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending', -- pending, submitted, accepted, rejected, paid, denied
  last_status_check TIMESTAMP WITH TIME ZONE,
  
  -- Financial
  total_charge_amount DECIMAL(10,2) NOT NULL,
  paid_amount DECIMAL(10,2),
  adjustment_amount DECIMAL(10,2),
  
  -- Response data
  validation_errors JSONB,
  rejection_reason TEXT,
  remittance_835_data JSONB,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_clearinghouse_claims_client ON clearinghouse_claims(client_id);
CREATE INDEX idx_clearinghouse_claims_status ON clearinghouse_claims(status);
CREATE INDEX idx_clearinghouse_claims_submitted ON clearinghouse_claims(submitted_at);
```

### Eligibility Verification
```sql
CREATE TABLE eligibility_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id),
  
  -- Request details
  payer_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  service_date DATE NOT NULL,
  
  -- Response
  is_eligible BOOLEAN,
  benefits JSONB,
  response_270_data JSONB,
  
  -- Metadata
  checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_eligibility_checks_client ON eligibility_checks(client_id);
```

## Implementation Phases

### Phase 1: Data Collection & Validation (Week 1-2)
- [ ] Collect all required provider credentials (NPI, Tax ID, taxonomy)
- [ ] Validate existing client insurance data completeness
- [ ] Implement CPT/ICD-10 code validation
- [ ] Create data quality checks for claim submission readiness

### Phase 2: X12 Generation (Week 3-4)
- [ ] Implement 837P generator (see `src/lib/x12/claim837Generator.ts`)
- [ ] Build claim validation logic
- [ ] Create test 837 files with sample data
- [ ] Implement segment builders for each X12 section

### Phase 3: Clearinghouse Selection & Setup (Week 5)
- [ ] Evaluate clearinghouse options
- [ ] Complete vendor registration process
- [ ] Obtain API credentials / SFTP access
- [ ] Configure test environment

### Phase 4: Integration Development (Week 6-8)
- [ ] Implement API client or SFTP connector
- [ ] Build claim submission workflow
- [ ] Create status polling mechanism
- [ ] Implement 835 remittance parsing
- [ ] Build reconciliation UI

### Phase 5: Testing (Week 9-10)
- [ ] Test with clearinghouse test environment
- [ ] Submit test claims to sandbox payers
- [ ] Validate 835 remittance processing
- [ ] End-to-end testing with sample claims
- [ ] Error handling and edge case testing

### Phase 6: Production Rollout (Week 11-12)
- [ ] Complete payer enrollment (if required)
- [ ] Production credentials setup
- [ ] Pilot with selected clients/sessions
- [ ] Monitor first production submissions
- [ ] Full production rollout

## Testing Strategy

### Unit Tests
- X12 segment generation
- Data validation rules
- Amount calculations
- Code lookup/validation

### Integration Tests
- Full 837 file generation
- Clearinghouse API calls
- 835 parsing
- Database operations

### End-to-End Tests
```typescript
describe('Claim Submission Flow', () => {
  it('should submit claim and track status', async () => {
    // 1. Generate claim from session data
    const claim = await generateClaimFromSession(sessionId);
    
    // 2. Validate claim data
    const validation = validateClaim(claim);
    expect(validation.isValid).toBe(true);
    
    // 3. Generate 837
    const x12Data = generate837(claim);
    expect(x12Data).toContain('ST*837');
    
    // 4. Submit to clearinghouse
    const result = await submitToClearinghouse(x12Data);
    expect(result.success).toBe(true);
    expect(result.trackingId).toBeDefined();
    
    // 5. Poll for status
    const status = await getClaimStatus(result.trackingId);
    expect(status).toBe('accepted' || 'in_process');
  });
});
```

### Validation Tests
- Required fields present
- NPI format valid
- Date formats correct (YYYYMMDD)
- Dollar amounts properly formatted
- Diagnosis code validity
- CPT code validity

## Error Handling

### Common Rejection Reasons
1. **Invalid NPI**: Provider NPI not recognized
2. **Missing Prior Auth**: Service requires authorization
3. **Eligibility Issue**: Patient not covered on service date
4. **Duplicate Claim**: Same claim already submitted
5. **Invalid Codes**: CPT or ICD-10 code not recognized
6. **Missing Information**: Required field empty

### Error Recovery Strategies
```typescript
interface ErrorRecovery {
  errorCode: string;
  description: string;
  autoRetryable: boolean;
  resolution: string;
  notificationRequired: boolean;
}

const errorHandlers: Record<string, ErrorRecovery> = {
  'INVALID_NPI': {
    errorCode: 'INVALID_NPI',
    description: 'Provider NPI not recognized',
    autoRetryable: false,
    resolution: 'Update provider NPI in system settings',
    notificationRequired: true
  },
  'DUPLICATE_CLAIM': {
    errorCode: 'DUPLICATE_CLAIM',
    description: 'Claim already submitted',
    autoRetryable: false,
    resolution: 'Check for existing claim with same PCN',
    notificationRequired: true
  },
  // ... more error handlers
};
```

## Security Considerations

### Data Protection
- [ ] Encrypt X12 files at rest and in transit
- [ ] Use secure SFTP/HTTPS connections
- [ ] Implement access controls for clearinghouse credentials
- [ ] Audit all claim submissions
- [ ] PHI handling compliance (HIPAA)

### Credential Management
- [ ] Store clearinghouse credentials in secrets management
- [ ] Rotate credentials regularly
- [ ] Use least-privilege access
- [ ] Monitor for unauthorized access attempts

## Monitoring & Alerts

### Metrics to Track
```typescript
interface ClearinghouseMetrics {
  // Volume
  claimsSubmittedToday: number;
  claimsAcceptedToday: number;
  claimsRejectedToday: number;
  
  // Performance
  averageSubmissionTime: number; // ms
  averageStatusUpdateLatency: number; // hours
  
  // Financial
  totalChargesSubmitted: number;
  totalPaidAmount: number;
  averageDaysToPay: number;
  
  // Quality
  firstPassAcceptanceRate: number; // %
  rejectionRate: number; // %
  
  // Status distribution
  claimsByStatus: Record<ClaimStatus, number>;
}
```

### Alert Conditions
- Rejection rate > 10%
- Submission failures > 5 in 1 hour
- No status updates for > 24 hours
- Clearinghouse API downtime
- Invalid credentials error
- Data validation errors > threshold

## Compliance Requirements

### HIPAA Requirements
- [ ] Business Associate Agreement (BAA) with clearinghouse
- [ ] Encryption of PHI in transit and at rest
- [ ] Access logging and audit trails
- [ ] Minimum necessary data transmission
- [ ] Breach notification procedures

### Billing Compliance
- [ ] Accurate coding (CPT/ICD-10)
- [ ] Medical necessity documentation
- [ ] Timely filing requirements
- [ ] Correct place of service codes
- [ ] Modifier usage rules

## Future Enhancements

### Phase 2 Features
- Real-time eligibility verification at scheduling
- Automatic claim resubmission for correctable rejections
- ERA (Electronic Remittance Advice) auto-posting
- Denial management workflow
- Appeals tracking
- Secondary/tertiary claim submission
- Patient responsibility calculation
- Payment variance analysis

### Reporting
- Claims aging report
- Payer performance dashboard
- Denial trends analysis
- Revenue cycle KPIs
- Claim scrubbing effectiveness

## Resources

### X12 Standards
- [ASC X12 Standards](https://x12.org/)
- [005010X222A1 837P Implementation Guide](https://x12.org/products/standards/837-professional)

### Clearinghouse Documentation
- Change Healthcare API Docs
- Availity Integration Guide
- Trizetto Gateway Documentation

### Code Sets
- [CMS CPT Codes](https://www.cms.gov/medicare/coding-billing/cpt)
- [ICD-10 Codes](https://www.cms.gov/medicare/coding-billing/icd-10-codes)
- [NPI Registry](https://npiregistry.cms.hhs.gov/)

### Testing Resources
- [WEDI SNIP Testing](https://www.wedi.org/snip/)
- Clearinghouse test environments
- Sample 837 files

## Support & Escalation

### Internal Team
- **Integration Lead**: Responsible for technical implementation
- **Revenue Cycle Manager**: Business requirements and workflow
- **Compliance Officer**: HIPAA and billing compliance review

### External Partners
- **Clearinghouse Support**: Technical integration assistance
- **Billing Consultant**: Coding and compliance expertise
- **Legal/Compliance**: BAA review and risk assessment

## Next Steps

1. Review and approve this specification
2. Select clearinghouse vendor
3. Begin Phase 1: Data collection and validation
4. Set up development/test environment
5. Implement X12 generator (stub created in `src/lib/x12/claim837Generator.ts`)
6. Schedule weekly status reviews

---

**Document Version**: 1.0  
**Last Updated**: 2025-10-09  
**Status**: Ready for Review
