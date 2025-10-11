/**
 * Billing Components
 *
 * Export all billing-related components
 */

// Phase 2: Eligibility
export { EligibilityCheckForm } from './EligibilityCheckForm';
export { BenefitVisualization } from './BenefitVisualization';
export { EligibilityHistory } from './EligibilityHistory';
export { InsuranceCardUpload } from './InsuranceCardUpload';
export { PatientSyncDialog } from './PatientSyncDialog';

// Phase 3: Claims
export { ClaimCreationForm } from './ClaimCreationForm';
export { ClaimsDashboard } from './ClaimsDashboard';
export { DenialManagement } from './DenialManagement';
export { CPTCodeSearch } from './CPTCodeSearch';
export { ICD10CodePicker } from './ICD10CodePicker';

// Phase 4: ERA & Payment Posting
export { ERAUploadProcessor } from './ERAUploadProcessor';
export { PaymentDashboard } from './PaymentDashboard';
export { ManualPaymentForm } from './ManualPaymentForm';
export { PaymentReconciliation } from './PaymentReconciliation';
export { EOBGenerator} from './EOBGenerator';
export { PatientStatementGenerator } from './PatientStatementGenerator';
export { PaymentReversalDialog } from './PaymentReversalDialog';

// Phase 5: Reporting & Analytics
export { ClaimsAgingReport } from './ClaimsAgingReport';
export { PayerPerformanceReport } from './PayerPerformanceReport';
export { RevenueCycleDashboard } from './RevenueCycleDashboard';
