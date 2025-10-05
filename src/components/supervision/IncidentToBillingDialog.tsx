import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle2, XCircle, AlertTriangle, ClipboardCheck, HelpCircle, ExternalLink } from "lucide-react";

interface IncidentToBillingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: IncidentToBillingData) => void;
  initialData?: IncidentToBillingData;
}

export interface IncidentToBillingData {
  isIncidentTo: boolean;
  requirementsMet: {
    initialServiceByProvider: boolean;
    establishedPlanOfCare: boolean;
    providerAvailableForSupervision: boolean;
    clientEstablished: boolean;
    superviseeQualified: boolean;
  };
  providerAttestation: {
    wasAvailableForSupervision: boolean;
    locationOfProvider: string;
    establishedTreatmentPlan: boolean;
    serviceProvidedPerPlan: boolean;
    attested: boolean;
  };
  attestationText: string;
}

export function IncidentToBillingDialog({
  open,
  onOpenChange,
  onConfirm,
  initialData
}: IncidentToBillingDialogProps) {
  const [requirements, setRequirements] = useState({
    initialServiceByProvider: initialData?.requirementsMet.initialServiceByProvider ?? false,
    establishedPlanOfCare: initialData?.requirementsMet.establishedPlanOfCare ?? false,
    providerAvailableForSupervision: initialData?.requirementsMet.providerAvailableForSupervision ?? false,
    clientEstablished: initialData?.requirementsMet.clientEstablished ?? false,
    superviseeQualified: initialData?.requirementsMet.superviseeQualified ?? false,
  });

  const [attestation, setAttestation] = useState({
    wasAvailableForSupervision: initialData?.providerAttestation.wasAvailableForSupervision ?? false,
    locationOfProvider: initialData?.providerAttestation.locationOfProvider ?? "",
    establishedTreatmentPlan: initialData?.providerAttestation.establishedTreatmentPlan ?? false,
    serviceProvidedPerPlan: initialData?.providerAttestation.serviceProvidedPerPlan ?? false,
    attested: initialData?.providerAttestation.attested ?? false,
  });

  const [attestationText, setAttestationText] = useState(
    initialData?.attestationText ?? 
    "I attest that I was available to provide immediate assistance and direction throughout the performance of this service. The services rendered were under my direct supervision and in accordance with Medicare incident-to billing requirements."
  );

  const allRequirementsMet = Object.values(requirements).every(Boolean);
  const allAttestationsMet = 
    attestation.wasAvailableForSupervision &&
    attestation.locationOfProvider.trim() !== "" &&
    attestation.establishedTreatmentPlan &&
    attestation.serviceProvidedPerPlan &&
    attestation.attested;

  const canConfirm = allRequirementsMet && allAttestationsMet && attestationText.trim() !== "";

  const handleConfirm = () => {
    if (!canConfirm) return;

    const data: IncidentToBillingData = {
      isIncidentTo: true,
      requirementsMet: requirements,
      providerAttestation: attestation,
      attestationText
    };

    onConfirm(data);
    onOpenChange(false);
  };

  const handleCancel = () => {
    // Return data indicating incident-to is not being used
    const data: IncidentToBillingData = {
      isIncidentTo: false,
      requirementsMet: {
        initialServiceByProvider: false,
        establishedPlanOfCare: false,
        providerAvailableForSupervision: false,
        clientEstablished: false,
        superviseeQualified: false,
      },
      providerAttestation: {
        wasAvailableForSupervision: false,
        locationOfProvider: "",
        establishedTreatmentPlan: false,
        serviceProvidedPerPlan: false,
        attested: false,
      },
      attestationText: ""
    };
    
    onConfirm(data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Incident-to Billing Requirements
          </DialogTitle>
          <DialogDescription>
            All requirements must be met to bill services under incident-to provisions
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Requirements Status Badge */}
          <div className="flex items-center gap-2">
            {allRequirementsMet ? (
              <Badge variant="default" className="bg-green-600">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                All Requirements Met
              </Badge>
            ) : (
              <Badge variant="destructive">
                <XCircle className="mr-1 h-3 w-3" />
                Requirements Incomplete
              </Badge>
            )}
          </div>

          {/* Medicare Incident-to Requirements */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm">Medicare Incident-to Requirements</h4>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                All five requirements must be checked to proceed with incident-to billing. 
                Failure to meet these requirements may result in claim denials or compliance issues.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              {/* Requirement 1 */}
              <div className="flex items-start space-x-3 p-3 border rounded-lg">
                <Checkbox
                  id="req-initial-service"
                  checked={requirements.initialServiceByProvider}
                  onCheckedChange={(checked) => 
                    setRequirements(prev => ({ ...prev, initialServiceByProvider: checked as boolean }))
                  }
                />
                <div className="flex-1">
                  <Label htmlFor="req-initial-service" className="cursor-pointer font-medium flex items-center gap-2">
                    Initial service by supervising provider
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="font-semibold mb-1">What this means:</p>
                          <p className="text-xs mb-2">The supervising provider must have performed the initial evaluation and established the diagnosis. Associates cannot see new patients under incident-to billing.</p>
                          <p className="font-semibold mb-1 mt-2">Example:</p>
                          <p className="text-xs">✅ Dr. Smith evaluated the client, then Associate Jones provides follow-up therapy</p>
                          <p className="text-xs">❌ Client is new to practice and assigned directly to Associate Jones</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    The supervising provider must have performed the initial service and evaluated the client
                  </p>
                </div>
              </div>

              {/* Requirement 2 */}
              <div className="flex items-start space-x-3 p-3 border rounded-lg">
                <Checkbox
                  id="req-plan-of-care"
                  checked={requirements.establishedPlanOfCare}
                  onCheckedChange={(checked) => 
                    setRequirements(prev => ({ ...prev, establishedPlanOfCare: checked as boolean }))
                  }
                />
                <div className="flex-1">
                  <Label htmlFor="req-plan-of-care" className="cursor-pointer font-medium">
                    Established plan of care
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    The supervising provider must have created and documented the treatment plan
                  </p>
                </div>
              </div>

              {/* Requirement 3 */}
              <div className="flex items-start space-x-3 p-3 border rounded-lg">
                <Checkbox
                  id="req-provider-available"
                  checked={requirements.providerAvailableForSupervision}
                  onCheckedChange={(checked) => 
                    setRequirements(prev => ({ ...prev, providerAvailableForSupervision: checked as boolean }))
                  }
                />
                <div className="flex-1">
                  <Label htmlFor="req-provider-available" className="cursor-pointer font-medium flex items-center gap-2">
                    Provider available for immediate assistance
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="font-semibold mb-1">What this means:</p>
                          <p className="text-xs mb-2">The supervising provider must be physically present in the same office suite and immediately available to provide assistance if needed.</p>
                          <p className="font-semibold mb-1 mt-2">Example:</p>
                          <p className="text-xs">✅ Dr. Smith is in their office while Associate provides therapy</p>
                          <p className="text-xs">❌ Dr. Smith is working from home or at another location</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    The supervising provider must have been physically present in the office suite and immediately available
                  </p>
                </div>
              </div>

              {/* Requirement 4 */}
              <div className="flex items-start space-x-3 p-3 border rounded-lg">
                <Checkbox
                  id="req-client-established"
                  checked={requirements.clientEstablished}
                  onCheckedChange={(checked) => 
                    setRequirements(prev => ({ ...prev, clientEstablished: checked as boolean }))
                  }
                />
                <div className="flex-1">
                  <Label htmlFor="req-client-established" className="cursor-pointer font-medium">
                    Client is established patient
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    This is not a new client; the client has been seen by the supervising provider previously
                  </p>
                </div>
              </div>

              {/* Requirement 5 */}
              <div className="flex items-start space-x-3 p-3 border rounded-lg">
                <Checkbox
                  id="req-supervisee-qualified"
                  checked={requirements.superviseeQualified}
                  onCheckedChange={(checked) => 
                    setRequirements(prev => ({ ...prev, superviseeQualified: checked as boolean }))
                  }
                />
                <div className="flex-1">
                  <Label htmlFor="req-supervisee-qualified" className="cursor-pointer font-medium">
                    Supervisee meets qualifications
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    The supervisee is properly licensed/credentialed and authorized to provide incident-to services
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Separator />
          
          {/* Learn More Section */}
          <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              Additional Resources
            </h4>
            <div className="space-y-2 text-xs">
              <a 
                href="https://www.cms.gov/Regulations-and-Guidance/Guidance/Manuals/Downloads/bp102c15.pdf" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                CMS Medicare Benefit Policy Manual - Chapter 15, Section 60
              </a>
              <p className="text-muted-foreground">
                Official CMS guidance on incident-to billing requirements and compliance
              </p>
            </div>
          </div>

          <Separator />
          <div className="space-y-4">
            <h4 className="font-semibold text-sm">Provider Attestation</h4>

            <div className="space-y-3">
              {/* Provider Location */}
              <div className="space-y-2">
                <Label htmlFor="provider-location">
                  Provider Location During Service *
                </Label>
                <Input
                  id="provider-location"
                  placeholder="e.g., Main office, Suite 200"
                  value={attestation.locationOfProvider}
                  onChange={(e) => 
                    setAttestation(prev => ({ ...prev, locationOfProvider: e.target.value }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Specify your exact location during the service provision
                </p>
              </div>

              {/* Attestation Checkboxes */}
              <div className="flex items-start space-x-3 p-3 border rounded-lg">
                <Checkbox
                  id="attest-available"
                  checked={attestation.wasAvailableForSupervision}
                  onCheckedChange={(checked) => 
                    setAttestation(prev => ({ ...prev, wasAvailableForSupervision: checked as boolean }))
                  }
                />
                <Label htmlFor="attest-available" className="cursor-pointer text-sm">
                  I was immediately available to provide assistance and direction during this service
                </Label>
              </div>

              <div className="flex items-start space-x-3 p-3 border rounded-lg">
                <Checkbox
                  id="attest-plan"
                  checked={attestation.establishedTreatmentPlan}
                  onCheckedChange={(checked) => 
                    setAttestation(prev => ({ ...prev, establishedTreatmentPlan: checked as boolean }))
                  }
                />
                <Label htmlFor="attest-plan" className="cursor-pointer text-sm">
                  I established the treatment plan that was followed during this service
                </Label>
              </div>

              <div className="flex items-start space-x-3 p-3 border rounded-lg">
                <Checkbox
                  id="attest-per-plan"
                  checked={attestation.serviceProvidedPerPlan}
                  onCheckedChange={(checked) => 
                    setAttestation(prev => ({ ...prev, serviceProvidedPerPlan: checked as boolean }))
                  }
                />
                <Label htmlFor="attest-per-plan" className="cursor-pointer text-sm">
                  The service was provided according to my established treatment plan
                </Label>
              </div>

              {/* Attestation Statement */}
              <div className="space-y-2">
                <Label htmlFor="attestation-text">Attestation Statement *</Label>
                <Textarea
                  id="attestation-text"
                  rows={4}
                  value={attestationText}
                  onChange={(e) => setAttestationText(e.target.value)}
                  className="bg-background"
                />
              </div>

              {/* Final Attestation */}
              <div className="flex items-start space-x-3 p-3 border-2 border-primary rounded-lg bg-primary/5">
                <Checkbox
                  id="attest-final"
                  checked={attestation.attested}
                  onCheckedChange={(checked) => 
                    setAttestation(prev => ({ ...prev, attested: checked as boolean }))
                  }
                />
                <Label htmlFor="attest-final" className="cursor-pointer text-sm font-medium">
                  I attest that all information provided is true and accurate, and I understand that false 
                  attestation may result in civil or criminal penalties
                </Label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleCancel}>
            Don't Use Incident-to
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={!canConfirm}
            className={!canConfirm ? "cursor-not-allowed" : ""}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Confirm Incident-to Billing
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
