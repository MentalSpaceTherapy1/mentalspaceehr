# Electronic Prescriptions (eRx) & Lab Orders Integration Specification

## Overview
This document outlines the future integration roadmap for electronic prescriptions (eRx) and laboratory orders/results management within the behavioral health EHR system.

## Purpose
Enable providers to:
- Prescribe medications electronically to pharmacies
- Order laboratory tests electronically
- Receive and incorporate lab results into patient charts
- Maintain medication history and interaction checking
- Comply with EPCS (Electronic Prescribing of Controlled Substances) requirements

## Scope
This is a **future integration document** outlining requirements and vendor options for when the practice is ready to implement eRx and lab ordering capabilities. These integrations are typically implemented after core EHR functionality, billing, and basic clinical workflows are established.

---

## Part 1: Electronic Prescriptions (eRx)

### eRx Vendor Options

#### 1. Surescripts
**Overview:** The largest e-prescribing network in the US, connecting to 95%+ of pharmacies

**Services:**
- Electronic prescribing (SCRIPT 2017071 standard)
- Medication history
- Formulary and benefit information
- Prior authorization support
- EPCS certification

**Pros:**
- Industry standard, widest pharmacy coverage
- Real-time benefit check
- Medication adherence features
- Strong security and compliance

**Cons:**
- Higher cost
- Complex integration requirements
- Requires EPCS certification process

**Pricing:**
- Setup fee: $5,000 - $15,000
- Per-transaction fees: $0.10 - $0.50
- Monthly minimum: $200 - $500

#### 2. DrFirst Rcopia
**Overview:** Cloud-based e-prescribing platform with EHR integration

**Services:**
- E-prescribing
- Medication history
- Drug interaction checking
- Medication adherence tools
- EPCS certified

**Pros:**
- User-friendly interface
- Good customer support
- EPCS included
- Mobile app available

**Cons:**
- Smaller pharmacy network than Surescripts
- Higher per-provider pricing

**Pricing:**
- Per-provider/month: $50 - $100
- EPCS add-on: $25/provider/month

#### 3. RxNT
**Overview:** E-prescribing solution for small to medium practices

**Services:**
- Electronic prescribing
- Medication management
- Refill requests
- EPCS capable

**Pros:**
- Lower cost for smaller practices
- Simpler integration
- Good for behavioral health focus

**Cons:**
- Limited advanced features
- Smaller pharmacy network

**Pricing:**
- Per-provider/month: $30 - $60
- EPCS: $15/provider/month

### Recommendation
**Start with Surescripts** for behavioral health practices that:
- Prescribe controlled substances (EPCS required)
- Need comprehensive medication history
- Want formulary/benefit checking
- Plan to grow provider count

**Consider DrFirst** for:
- Smaller practices (1-5 providers)
- Those wanting easier setup
- Mobile prescribing needs

---

## eRx Technical Integration

### NCPDP SCRIPT Standard
E-prescribing uses the NCPDP SCRIPT standard (currently 2017071) for communication between EHR systems and pharmacies via the Surescripts network.

### Message Types

#### NewRx - New Prescription
```xml
<Message>
  <Header>
    <To>Pharmacy</To>
    <From>Prescriber</From>
    <MessageID>MSG123</MessageID>
    <SentTime>2025-10-09T10:30:00Z</SentTime>
  </Header>
  <Body>
    <NewRx>
      <Prescriber>
        <Identification>
          <NPI>1234567890</NPI>
          <DEA>AB1234563</DEA>
        </Identification>
        <Name>
          <LastName>Smith</LastName>
          <FirstName>John</FirstName>
        </Name>
      </Prescriber>
      <Patient>
        <Identification>
          <PatientID>PAT12345</PatientID>
        </Identification>
        <Name>
          <LastName>Doe</LastName>
          <FirstName>Jane</FirstName>
        </Name>
        <DateOfBirth>1985-05-15</DateOfBirth>
        <Gender>F</Gender>
        <Address>
          <AddressLine1>123 Main St</AddressLine1>
          <City>Anytown</City>
          <State>CA</State>
          <ZipCode>12345</ZipCode>
        </Address>
      </Patient>
      <Medication>
        <DrugDescription>Sertraline 50 MG Oral Tablet</DrugDescription>
        <DrugCoded>
          <ProductCode>00378018005</ProductCode>
          <ProductCodeQualifier>ND</ProductCodeQualifier>
        </DrugCoded>
        <Quantity>30</Quantity>
        <DaysSupply>30</DaysSupply>
        <Refills>5</Refills>
        <Substitutions>0</Substitutions> <!-- 0=No substitutions -->
        <WrittenDate>2025-10-09</WrittenDate>
        <Note>Take once daily in morning</Note>
      </Medication>
    </NewRx>
  </Body>
</Message>
```

#### RxFill - Prescription Fill Notification
Pharmacy sends notification when prescription is filled

#### RefillRequest - Refill Request from Pharmacy
Pharmacy requests refill authorization from prescriber

#### RxChangeRequest - Change Request from Pharmacy
Pharmacy suggests alternative medication (e.g., formulary, generic)

#### CancelRx - Cancel Prescription
Provider cancels prescription before it's filled

### TypeScript Interface
```typescript
interface Prescription {
  id: string;
  clientId: string;
  providerId: string;
  
  // Medication details
  drugName: string;
  drugCode: string; // NDC code
  drugCodeQualifier: 'ND' | 'GCN' | 'GPI';
  strength: string;
  dosageForm: string; // tablet, capsule, solution
  
  // Prescription details
  quantity: number;
  daysSupply: number;
  refills: number;
  substitutionAllowed: boolean;
  
  // Instructions
  sig: string; // Directions for patient
  notes?: string;
  
  // Pharmacy
  pharmacyNCPDP: string; // Pharmacy identifier
  pharmacyName?: string;
  
  // Diagnosis
  diagnosisCode: string; // ICD-10
  
  // Dates
  writtenDate: string;
  effectiveDate?: string;
  expirationDate?: string;
  
  // Status
  status: PrescriptionStatus;
  
  // EPCS (for controlled substances)
  isControlledSubstance: boolean;
  deaSchedule?: 'II' | 'III' | 'IV' | 'V';
  
  // Timestamps
  createdAt: string;
  sentAt?: string;
  filledAt?: string;
}

type PrescriptionStatus =
  | 'draft'
  | 'pending_approval'
  | 'sent'
  | 'filled'
  | 'partially_filled'
  | 'canceled'
  | 'error';

interface MedicationHistory {
  clientId: string;
  medications: HistoricalMedication[];
  lastUpdated: string;
}

interface HistoricalMedication {
  drugName: string;
  drugCode: string;
  prescribedDate: string;
  lastFilledDate: string;
  prescriber: string;
  pharmacyName: string;
  isActive: boolean;
}

interface DrugInteraction {
  severity: 'severe' | 'moderate' | 'minor';
  description: string;
  drug1: string;
  drug2: string;
  recommendation: string;
}
```

---

## EPCS (Electronic Prescribing of Controlled Substances)

### Requirements
To prescribe Schedule II-V controlled substances electronically, the system must be EPCS-certified and comply with DEA requirements.

### EPCS Certification Requirements

#### 1. Identity Proofing
- Providers must complete in-person or remote identity verification
- Third-party credential service provider (CSP)
- Two-factor authentication requirement

#### 2. Two-Factor Authentication (2FA)
```typescript
interface EPCSAuthentication {
  // "Something you know"
  password: string;
  
  // "Something you have" - one of:
  method: 
    | 'hard_token'      // Physical token device
    | 'soft_token'      // Mobile app token
    | 'biometric'       // Fingerprint, face ID
    | 'smart_card';     // Physical smart card
}
```

#### 3. Audit Requirements
All EPCS prescriptions must log:
- Provider identity
- Authentication method used
- Date/time of prescribing
- Patient identity
- Medication details
- Any modifications

#### 4. Technical Requirements
- End-to-end encryption
- Secure prescription transmission
- Tamper-evident audit logs
- Access controls
- System documentation

### EPCS Implementation Process
1. **Choose EPCS CSP** (Credential Service Provider)
   - Surescripts EPCS
   - DrFirst EPCS
   - RxNT EPCS

2. **Provider Identity Proofing**
   - In-person verification or
   - Remote verification with biometric check

3. **System Certification**
   - Third-party audit of technical controls
   - DEA certification application
   - State-level certification (varies by state)

4. **Provider Registration**
   - Each provider completes identity proofing
   - Receives 2FA credentials
   - Training on EPCS procedures

**Timeline:** 3-6 months for full EPCS implementation

---

## Behavioral Health-Specific Medications

### Common Medication Classes

#### 1. Antidepressants (Most Common)
- SSRIs: Sertraline, Fluoxetine, Escitalopram, Citalopram, Paroxetine
- SNRIs: Venlafaxine, Duloxetine, Desvenlafaxine
- Atypicals: Bupropion, Mirtazapine, Trazodone

#### 2. Anxiolytics
- Benzodiazepines (Schedule IV): Alprazolam, Lorazepam, Clonazepam, Diazepam
- Non-benzos: Buspirone, Hydroxyzine

#### 3. Mood Stabilizers
- Lithium
- Anticonvulsants: Valproic Acid, Lamotrigine, Carbamazepine

#### 4. Antipsychotics
- Atypical: Aripiprazole, Quetiapine, Risperidone, Olanzapine, Lurasidone
- Typical: Haloperidol, Perphenazine

#### 5. ADHD Medications
- Stimulants (Schedule II): Methylphenidate, Amphetamine salts, Lisdexamfetamine
- Non-stimulants: Atomoxetine, Guanfacine, Clonidine

#### 6. Sleep Aids
- Z-drugs (Schedule IV): Zolpidem, Eszopiclone, Zaleplon
- Melatonin agonists: Ramelteon
- Orexin antagonists: Suvorexant

### Drug Interaction Checking
Critical for behavioral health medications:
- Serotonin syndrome risk (SSRI + MAOI)
- CNS depression (benzodiazepines + opioids)
- QT prolongation (multiple antipsychotics)
- CYP450 interactions

---

## Part 2: Laboratory Orders & Results

### Lab Integration Vendor Options

#### 1. Labcorp
**Overview:** One of the largest clinical laboratory networks in the US

**Services:**
- Test ordering via HL7 interface
- Electronic result delivery
- Standing orders
- Comprehensive test menu

**Integration:** HL7 v2.x messaging

#### 2. Quest Diagnostics
**Overview:** Major national laboratory network

**Services:**
- Electronic test ordering
- Result integration
- Real-time result notifications
- Patient portal integration

**Integration:** HL7 v2.x or proprietary API

#### 3. Local/Regional Labs
Many regions have local laboratories that offer:
- Lower costs
- Faster turnaround
- Personal service
- HL7 integration

### HL7 Standard for Lab Orders

#### ORM - Order Message
```
MSH|^~\&|EHR|CLINIC|LAB|LABCORP|20251009103000||ORM^O01|MSG123|P|2.5.1
PID|1||PAT12345||Doe^Jane^M||19850515|F||2106-3|123 Main St^^Anytown^CA^12345||555-1234
PV1|1|O|||||DOC123^Smith^John^A|||||||||||||||||||||||||||||||||||20251009
ORC|NW|ORD123|||||^^^20251009103000
OBR|1|ORD123||83036^Hemoglobin A1c^LN|||20251009103000|||||||||DOC123^Smith^John^A
```

#### ORU - Result Message
```
MSH|^~\&|LAB|LABCORP|EHR|CLINIC|20251010083000||ORU^R01|MSG456|P|2.5.1
PID|1||PAT12345||Doe^Jane^M||19850515|F
OBR|1|ORD123|RES123|83036^Hemoglobin A1c^LN|||20251009103000|||||||20251010080000||DOC123^Smith^John^A
OBX|1|NM|83036^Hemoglobin A1c^LN||5.8|%|4.0-6.0|N|||F|||20251010080000
```

### Common Lab Tests for Behavioral Health

#### 1. Baseline Metabolic Panel
- Before starting antipsychotics
- Monitoring lithium therapy
- Regular wellness checks

**Tests:**
- Comprehensive Metabolic Panel (CMP)
- Lipid panel
- Hemoglobin A1c (for antipsychotics)

#### 2. Thyroid Function
- Before diagnosing depression
- Monitoring lithium therapy

**Tests:**
- TSH (Thyroid Stimulating Hormone)
- Free T4
- Free T3 (if indicated)

#### 3. Medication Levels
- Lithium level (therapeutic monitoring)
- Valproic acid level
- Carbamazepine level

#### 4. Kidney/Liver Function
- Before starting medications metabolized by liver
- Monitoring lithium (kidney)
- Monitoring valproic acid (liver)

**Tests:**
- Basic Metabolic Panel (BMP) or CMP
- Liver Function Tests (LFTs)

#### 5. Drug Screening
- Urine drug screen (UDS)
- Pharmacogenetic testing
- Therapeutic drug monitoring

### TypeScript Interface
```typescript
interface LabOrder {
  id: string;
  clientId: string;
  providerId: string;
  
  // Order details
  orderNumber: string;
  tests: OrderedTest[];
  
  // Lab information
  labName: string;
  labId: string; // Lab's identifier
  
  // Clinical
  diagnosisCodes: string[]; // ICD-10
  clinicalNotes?: string;
  
  // Status
  status: LabOrderStatus;
  
  // Dates
  orderedAt: string;
  collectedAt?: string;
  resultedAt?: string;
  
  // Results
  results?: LabResult[];
}

interface OrderedTest {
  testCode: string; // LOINC code
  testName: string;
  specimenType: string; // Blood, urine, saliva
  urgent: boolean;
}

type LabOrderStatus =
  | 'draft'
  | 'ordered'
  | 'collected'
  | 'in_progress'
  | 'resulted'
  | 'canceled';

interface LabResult {
  id: string;
  orderTestId: string;
  
  // Test identification
  testCode: string; // LOINC
  testName: string;
  
  // Result
  value: string;
  unit: string;
  referenceRange: string;
  
  // Flags
  abnormalFlag?: 'L' | 'H' | 'LL' | 'HH' | 'A'; // Low, High, Critical Low, Critical High, Abnormal
  
  // Status
  status: 'preliminary' | 'final' | 'corrected' | 'amended';
  
  // Timing
  collectedAt: string;
  resultedAt: string;
  
  // Provider review
  reviewedBy?: string;
  reviewedAt?: string;
  providerNotes?: string;
}
```

---

## Database Schema

### Prescriptions
```sql
CREATE TABLE prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id),
  provider_id UUID NOT NULL REFERENCES users(id),
  
  -- Medication
  drug_name TEXT NOT NULL,
  drug_code TEXT NOT NULL, -- NDC
  drug_code_qualifier TEXT DEFAULT 'ND',
  strength TEXT,
  dosage_form TEXT,
  
  -- Prescription details
  quantity DECIMAL(10,2) NOT NULL,
  days_supply INTEGER NOT NULL,
  refills INTEGER NOT NULL DEFAULT 0,
  substitution_allowed BOOLEAN DEFAULT true,
  
  -- Instructions
  sig TEXT NOT NULL, -- Directions
  notes TEXT,
  
  -- Pharmacy
  pharmacy_ncpdp TEXT,
  pharmacy_name TEXT,
  
  -- Clinical
  diagnosis_code TEXT, -- ICD-10
  
  -- EPCS
  is_controlled_substance BOOLEAN DEFAULT false,
  dea_schedule TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft',
  
  -- Dates
  written_date DATE NOT NULL,
  effective_date DATE,
  expiration_date DATE,
  sent_at TIMESTAMP WITH TIME ZONE,
  filled_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_prescriptions_client ON prescriptions(client_id);
CREATE INDEX idx_prescriptions_provider ON prescriptions(provider_id);
CREATE INDEX idx_prescriptions_status ON prescriptions(status);
```

### Lab Orders
```sql
CREATE TABLE lab_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id),
  provider_id UUID NOT NULL REFERENCES users(id),
  
  -- Order details
  order_number TEXT UNIQUE NOT NULL,
  lab_name TEXT NOT NULL,
  lab_id TEXT,
  
  -- Clinical
  diagnosis_codes TEXT[],
  clinical_notes TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft',
  
  -- Dates
  ordered_at TIMESTAMP WITH TIME ZONE,
  collected_at TIMESTAMP WITH TIME ZONE,
  resulted_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE lab_order_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_order_id UUID NOT NULL REFERENCES lab_orders(id) ON DELETE CASCADE,
  
  -- Test details
  test_code TEXT NOT NULL, -- LOINC
  test_name TEXT NOT NULL,
  specimen_type TEXT,
  urgent BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE lab_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_order_test_id UUID NOT NULL REFERENCES lab_order_tests(id),
  
  -- Test identification
  test_code TEXT NOT NULL,
  test_name TEXT NOT NULL,
  
  -- Result
  value TEXT,
  unit TEXT,
  reference_range TEXT,
  abnormal_flag TEXT, -- L, H, LL, HH, A
  
  -- Status
  status TEXT NOT NULL DEFAULT 'preliminary',
  
  -- Timing
  collected_at TIMESTAMP WITH TIME ZONE,
  resulted_at TIMESTAMP WITH TIME ZONE,
  
  -- Provider review
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  provider_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_lab_orders_client ON lab_orders(client_id);
CREATE INDEX idx_lab_results_abnormal ON lab_results(abnormal_flag) WHERE abnormal_flag IS NOT NULL;
```

---

## Implementation Timeline

### Phase 1: eRx Implementation (3-6 months)
**Month 1-2: Planning & Setup**
- [ ] Select eRx vendor
- [ ] Complete vendor contracts
- [ ] Provider identity proofing (if EPCS)
- [ ] Obtain API credentials

**Month 2-3: Integration Development**
- [ ] Implement NCPDP SCRIPT messaging
- [ ] Build prescription workflow UI
- [ ] Implement medication history retrieval
- [ ] Add drug interaction checking
- [ ] Build pharmacy search

**Month 3-4: EPCS Certification (if applicable)**
- [ ] Complete 2FA implementation
- [ ] Audit logging setup
- [ ] Third-party security audit
- [ ] DEA application

**Month 4-6: Testing & Launch**
- [ ] Test prescribing workflows
- [ ] Test EPCS workflows (if applicable)
- [ ] Provider training
- [ ] Pilot with selected providers
- [ ] Full production rollout

### Phase 2: Lab Integration (2-4 months)
**Month 1: Setup**
- [ ] Select lab partner(s)
- [ ] Complete lab contracts
- [ ] HL7 interface setup

**Month 2-3: Development**
- [ ] Implement HL7 messaging
- [ ] Build lab order UI
- [ ] Build result viewing UI
- [ ] Implement abnormal result alerts

**Month 3-4: Testing & Launch**
- [ ] Test order transmission
- [ ] Test result reception
- [ ] Provider training
- [ ] Production rollout

---

## Compliance & Security

### Prescription Security
- [ ] Audit all prescription creation/modifications
- [ ] Implement prescriber verification
- [ ] Controlled substance tracking (PDMP integration)
- [ ] Secure prescription transmission (TLS 1.2+)
- [ ] Access controls (only prescribers can write)

### Lab Result Security
- [ ] PHI protection for lab results
- [ ] Secure result transmission (HL7 over VPN or HTTPS)
- [ ] Provider acknowledgment of abnormal results
- [ ] Patient portal access controls
- [ ] Result retention policies

### HIPAA Compliance
- [ ] Business Associate Agreements with vendors
- [ ] Encryption in transit and at rest
- [ ] Access logging
- [ ] Minimum necessary access
- [ ] Breach notification procedures

---

## Future Enhancements

### eRx Phase 2
- [ ] Prior authorization workflow
- [ ] Medication adherence tracking
- [ ] Patient medication portal
- [ ] Pharmacogenetic decision support
- [ ] Prescription analytics and insights
- [ ] PDMP (Prescription Drug Monitoring Program) integration

### Lab Phase 2
- [ ] Standing orders (recurring labs)
- [ ] Lab trending and graphing
- [ ] Integration with clinical decision support
- [ ] Patient lab result portal
- [ ] Lab-to-lab result consolidation
- [ ] Research data export

---

## Cost Estimates

### eRx (Annual)
- **Setup:** $5,000 - $15,000 (one-time)
- **Per Provider:** $600 - $1,200/year
- **EPCS Add-on:** $300 - $500/provider/year
- **Transaction Fees:** $0.10 - $0.50 per prescription
- **Total (5 providers):** ~$10,000 - $25,000/year

### Lab Integration
- **Setup:** $2,000 - $10,000 (one-time)
- **Per Lab Partner:** $500 - $2,000/year
- **Transaction Fees:** Usually included in lab test cost
- **Total:** ~$3,000 - $15,000/year

---

## Resources

### eRx Resources
- [Surescripts Documentation](https://surescripts.com/resources/)
- [NCPDP SCRIPT Standard](https://www.ncpdp.org/NCPDP/media/pdf/SCRIPT-Standard-Implementation-Guide.pdf)
- [DEA EPCS Requirements](https://www.deadiversion.usdoj.gov/ecomm/e_rx/)

### Lab Resources
- [HL7 v2.x Documentation](https://www.hl7.org/implement/standards/product_brief.cfm?product_id=185)
- [LOINC Code System](https://loinc.org/)
- [Labcorp Integration Guide](https://www.labcorp.com/)

---

**Document Version**: 1.0  
**Last Updated**: 2025-10-09  
**Status**: Future Planning - Not for Immediate Implementation
