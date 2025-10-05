import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ComplianceCheckResult {
  compliant: boolean;
  issues: string[];
  warnings: string[];
  details: {
    requirementsMet: boolean;
    attestationComplete: boolean;
    providerMatch: boolean;
    documentsComplete: boolean;
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { incidentToBillingId } = await req.json();

    if (!incidentToBillingId) {
      throw new Error('incident_to_billing_id is required');
    }

    console.log(`Verifying compliance for incident-to billing: ${incidentToBillingId}`);

    // Fetch incident-to billing record
    const { data: billingRecord, error: fetchError } = await supabaseClient
      .from('incident_to_billing')
      .select('*')
      .eq('id', incidentToBillingId)
      .single();

    if (fetchError) throw fetchError;

    const issues: string[] = [];
    const warnings: string[] = [];
    const details = {
      requirementsMet: false,
      attestationComplete: false,
      providerMatch: false,
      documentsComplete: false,
    };

    // Check 1: All 5 requirements must be met
    const requirements = billingRecord.requirements_met || {};
    const allRequirementsMet = 
      requirements.initialServiceByProvider &&
      requirements.establishedPlanOfCare &&
      requirements.providerAvailableForSupervision &&
      requirements.clientEstablished &&
      requirements.superviseeQualified;

    if (!allRequirementsMet) {
      issues.push('Not all Medicare incident-to requirements are met');
      if (!requirements.initialServiceByProvider) issues.push('Initial service by provider not documented');
      if (!requirements.establishedPlanOfCare) issues.push('Established plan of care not documented');
      if (!requirements.providerAvailableForSupervision) issues.push('Provider availability for supervision not documented');
      if (!requirements.clientEstablished) issues.push('Client not documented as established patient');
      if (!requirements.superviseeQualified) issues.push('Supervisee qualifications not verified');
    } else {
      details.requirementsMet = true;
    }

    // Check 2: Provider attestation must be complete
    const attestation = billingRecord.provider_attestation || {};
    const attestationComplete =
      attestation.wasAvailableForSupervision &&
      attestation.locationOfProvider &&
      attestation.establishedTreatmentPlan &&
      attestation.serviceProvidedPerPlan &&
      attestation.attested;

    if (!attestationComplete) {
      issues.push('Provider attestation is incomplete');
      if (!attestation.wasAvailableForSupervision) issues.push('Provider availability attestation missing');
      if (!attestation.locationOfProvider) issues.push('Provider location not documented');
      if (!attestation.establishedTreatmentPlan) issues.push('Treatment plan establishment not attested');
      if (!attestation.serviceProvidedPerPlan) issues.push('Service per plan attestation missing');
      if (!attestation.attested) issues.push('Final attestation not completed');
    } else {
      details.attestationComplete = true;
    }

    // Check 3: Billed under provider ID must match supervising provider
    if (billingRecord.billed_under_provider_id !== billingRecord.supervising_provider_id) {
      issues.push('Billing provider ID does not match supervising provider ID');
    } else {
      details.providerMatch = true;
    }

    // Check 4: Documentation must be marked complete
    if (!billingRecord.documentation_complete) {
      warnings.push('Documentation not marked as complete');
    } else {
      details.documentsComplete = true;
    }

    // Check supervision relationship eligibility
    const { data: relationship } = await supabaseClient
      .from('supervision_relationships')
      .select('can_bill_incident_to, incident_to_start_date')
      .eq('supervisee_id', billingRecord.rendering_provider_id)
      .eq('supervisor_id', billingRecord.supervising_provider_id)
      .eq('status', 'Active')
      .maybeSingle();

    if (!relationship) {
      issues.push('No active supervision relationship found');
    } else if (!relationship.can_bill_incident_to) {
      issues.push('Supervisee not qualified for incident-to billing in supervision relationship');
    } else if (relationship.incident_to_start_date) {
      const startDate = new Date(relationship.incident_to_start_date);
      const today = new Date();
      if (startDate > today) {
        issues.push(`Incident-to eligibility starts on ${startDate.toLocaleDateString()}`);
      }
    }

    const compliant = issues.length === 0;
    const complianceStatus = compliant ? 'compliant' : (warnings.length > 0 && issues.length === 0 ? 'warning' : 'non_compliant');

    // Update the billing record with compliance status
    await supabaseClient
      .from('incident_to_billing')
      .update({
        billing_compliant: compliant,
        compliance_check_date: new Date().toISOString(),
      })
      .eq('id', incidentToBillingId);

    // Log the compliance check in audit log
    const { data: { user } } = await supabaseClient.auth.getUser(
      req.headers.get('Authorization')?.replace('Bearer ', '') || ''
    );

    await supabaseClient
      .from('incident_to_audit_log')
      .insert({
        incident_to_billing_id: incidentToBillingId,
        note_id: billingRecord.note_id,
        action_type: 'compliance_check',
        performed_by: user?.id || billingRecord.supervising_provider_id,
        compliance_status: complianceStatus,
        compliance_issues: { issues, warnings },
        notes: `Compliance check performed: ${compliant ? 'PASSED' : 'FAILED'}`,
      });

    const result: ComplianceCheckResult = {
      compliant,
      issues,
      warnings,
      details,
    };

    console.log(`Compliance check result: ${compliant ? 'COMPLIANT' : 'NON-COMPLIANT'}`);
    console.log(`Issues: ${issues.length}, Warnings: ${warnings.length}`);

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in verify-incident-to-compliance:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
