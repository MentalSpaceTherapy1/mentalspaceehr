import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { SignaturePad, SignaturePadRef } from './SignaturePad';
import { ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';
import { US_STATES } from '@/lib/stateLicensure';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const consentSchema = z.object({
  // Step 1
  understoodLimitations: z.boolean().refine(val => val === true, 'Required'),
  understoodRisks: z.boolean().refine(val => val === true, 'Required'),
  understoodBenefits: z.boolean().refine(val => val === true, 'Required'),
  understoodAlternatives: z.boolean().refine(val => val === true, 'Required'),
  
  // Step 2
  emergencyContactName: z.string().min(1, 'Emergency contact name required'),
  emergencyContactPhone: z.string().min(10, 'Valid phone number required'),
  emergencyContactRelationship: z.string().min(1, 'Relationship required'),
  currentLocation: z.string().min(5, 'Current physical location required'),
  localEmergencyNumber: z.string().min(3, 'Emergency number required'),
  
  // Step 3
  privacyPolicyReviewed: z.boolean().refine(val => val === true, 'Required'),
  confidentialityLimitsUnderstood: z.boolean().refine(val => val === true, 'Required'),
  
  // Step 4
  adequateConnectionConfirmed: z.boolean().refine(val => val === true, 'Required'),
  privateLocationConfirmed: z.boolean().refine(val => val === true, 'Required'),
  
  // Step 5
  consentsToRecording: z.boolean(),
  clientState: z.string().min(2, 'State required'),
});

type ConsentFormValues = z.infer<typeof consentSchema>;

interface TelehealthConsentFormProps {
  clientId: string;
  onComplete: (data: any) => void;
  onCancel?: () => void;
}

const STEPS = [
  { title: 'Understanding Telehealth', description: 'Risks, benefits & limitations' },
  { title: 'Emergency Procedures', description: 'Contact info & safety' },
  { title: 'Privacy & Security', description: 'HIPAA & confidentiality' },
  { title: 'Technical Requirements', description: 'Connection & environment' },
  { title: 'Consent & Signature', description: 'Final agreement' },
];

export const TelehealthConsentForm = ({
  clientId,
  onComplete,
  onCancel,
}: TelehealthConsentFormProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const signaturePadRef = useRef<SignaturePadRef>(null);

  const form = useForm<ConsentFormValues>({
    resolver: zodResolver(consentSchema),
    defaultValues: {
      understoodLimitations: false,
      understoodRisks: false,
      understoodBenefits: false,
      understoodAlternatives: false,
      emergencyContactName: '',
      emergencyContactPhone: '',
      emergencyContactRelationship: '',
      currentLocation: '',
      localEmergencyNumber: '911',
      privacyPolicyReviewed: false,
      confidentialityLimitsUnderstood: false,
      adequateConnectionConfirmed: false,
      privateLocationConfirmed: false,
      consentsToRecording: false,
      clientState: '',
    },
  });

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const validateStep = async () => {
    const fields: Record<number, (keyof ConsentFormValues)[]> = {
      0: ['understoodLimitations', 'understoodRisks', 'understoodBenefits', 'understoodAlternatives'],
      1: ['emergencyContactName', 'emergencyContactPhone', 'emergencyContactRelationship', 'currentLocation', 'localEmergencyNumber'],
      2: ['privacyPolicyReviewed', 'confidentialityLimitsUnderstood'],
      3: ['adequateConnectionConfirmed', 'privateLocationConfirmed'],
      4: ['consentsToRecording', 'clientState'],
    };

    const result = await form.trigger(fields[currentStep]);
    return result;
  };

  const handleNext = async () => {
    const isValid = await validateStep();
    if (isValid && currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = (data: ConsentFormValues) => {
    if (signaturePadRef.current?.isEmpty()) {
      form.setError('root', { message: 'Signature required' });
      return;
    }

    const signature = signaturePadRef.current?.toDataURL() ?? '';

    onComplete({
      clientId,
      ...data,
      signature,
      emergencyContact: {
        name: data.emergencyContactName,
        phone: data.emergencyContactPhone,
        relationship: data.emergencyContactRelationship,
      },
      currentPhysicalLocation: data.currentLocation,
      clientStateOfResidence: data.clientState,
      risksAcknowledged: ['technology_failure', 'privacy_breach', 'emergency_limitations'],
    });
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Telehealth Consent Form</CardTitle>
        <CardDescription>
          Step {currentStep + 1} of {STEPS.length}: {STEPS[currentStep].title}
        </CardDescription>
        <Progress value={progress} className="mt-2" />
      </CardHeader>

      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Step 1: Understanding Telehealth */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Understanding Telehealth Services</h3>
              <p className="text-sm text-muted-foreground">
                Please review and acknowledge your understanding of the following:
              </p>

              <div className="space-y-3">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="limitations"
                    checked={form.watch('understoodLimitations')}
                    onCheckedChange={(checked) =>
                      form.setValue('understoodLimitations', checked as boolean)
                    }
                  />
                  <Label htmlFor="limitations" className="text-sm leading-relaxed cursor-pointer">
                    I understand the <strong>limitations</strong> of telehealth, including the inability to perform physical examinations and potential technology failures.
                  </Label>
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="risks"
                    checked={form.watch('understoodRisks')}
                    onCheckedChange={(checked) =>
                      form.setValue('understoodRisks', checked as boolean)
                    }
                  />
                  <Label htmlFor="risks" className="text-sm leading-relaxed cursor-pointer">
                    I understand the <strong>risks</strong>, including technology failures, privacy concerns, and limitations in emergency situations.
                  </Label>
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="benefits"
                    checked={form.watch('understoodBenefits')}
                    onCheckedChange={(checked) =>
                      form.setValue('understoodBenefits', checked as boolean)
                    }
                  />
                  <Label htmlFor="benefits" className="text-sm leading-relaxed cursor-pointer">
                    I understand the <strong>benefits</strong>, including convenient access to care, reduced travel time, and continuity of treatment.
                  </Label>
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="alternatives"
                    checked={form.watch('understoodAlternatives')}
                    onCheckedChange={(checked) =>
                      form.setValue('understoodAlternatives', checked as boolean)
                    }
                  />
                  <Label htmlFor="alternatives" className="text-sm leading-relaxed cursor-pointer">
                    I understand the <strong>alternatives</strong> to telehealth, including in-person visits and phone consultations.
                  </Label>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Emergency Procedures */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Emergency Contact & Procedures</h3>
              <p className="text-sm text-muted-foreground">
                Provide emergency contact information and confirm your current location.
              </p>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="emergencyContactName">Emergency Contact Name *</Label>
                  <Input
                    id="emergencyContactName"
                    {...form.register('emergencyContactName')}
                    placeholder="Full name"
                  />
                  {form.formState.errors.emergencyContactName && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.emergencyContactName.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="emergencyContactPhone">Emergency Contact Phone *</Label>
                  <Input
                    id="emergencyContactPhone"
                    {...form.register('emergencyContactPhone')}
                    placeholder="(555) 123-4567"
                  />
                  {form.formState.errors.emergencyContactPhone && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.emergencyContactPhone.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="emergencyContactRelationship">Relationship *</Label>
                  <Input
                    id="emergencyContactRelationship"
                    {...form.register('emergencyContactRelationship')}
                    placeholder="e.g., Spouse, Parent, Friend"
                  />
                  {form.formState.errors.emergencyContactRelationship && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.emergencyContactRelationship.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="currentLocation">Current Physical Location *</Label>
                  <Input
                    id="currentLocation"
                    {...form.register('currentLocation')}
                    placeholder="Full address where you'll attend session"
                  />
                  {form.formState.errors.currentLocation && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.currentLocation.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="localEmergencyNumber">Local Emergency Number *</Label>
                  <Input
                    id="localEmergencyNumber"
                    {...form.register('localEmergencyNumber')}
                    placeholder="911"
                  />
                  {form.formState.errors.localEmergencyNumber && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.localEmergencyNumber.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Privacy & Security */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Privacy & Security</h3>
              <p className="text-sm text-muted-foreground">
                Review our privacy practices and HIPAA compliance.
              </p>

              <div className="space-y-3">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="privacyPolicy"
                    checked={form.watch('privacyPolicyReviewed')}
                    onCheckedChange={(checked) =>
                      form.setValue('privacyPolicyReviewed', checked as boolean)
                    }
                  />
                  <Label htmlFor="privacyPolicy" className="text-sm leading-relaxed cursor-pointer">
                    I have reviewed the <strong>Privacy Policy</strong> and understand how my protected health information will be used and disclosed.
                  </Label>
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="confidentiality"
                    checked={form.watch('confidentialityLimitsUnderstood')}
                    onCheckedChange={(checked) =>
                      form.setValue('confidentialityLimitsUnderstood', checked as boolean)
                    }
                  />
                  <Label htmlFor="confidentiality" className="text-sm leading-relaxed cursor-pointer">
                    I understand the <strong>limits of confidentiality</strong>, including mandatory reporting requirements and emergency situations.
                  </Label>
                </div>

                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <p className="text-sm">
                    <strong>HIPAA Compliance:</strong> Our platform uses end-to-end encryption, secure data storage, and follows all HIPAA requirements to protect your health information.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Technical Requirements */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Technical Requirements</h3>
              <p className="text-sm text-muted-foreground">
                Confirm your environment meets telehealth requirements.
              </p>

              <div className="space-y-3">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="connection"
                    checked={form.watch('adequateConnectionConfirmed')}
                    onCheckedChange={(checked) =>
                      form.setValue('adequateConnectionConfirmed', checked as boolean)
                    }
                  />
                  <Label htmlFor="connection" className="text-sm leading-relaxed cursor-pointer">
                    I confirm I have an <strong>adequate internet connection</strong> (minimum 3 Mbps recommended) for video sessions.
                  </Label>
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="privacy"
                    checked={form.watch('privateLocationConfirmed')}
                    onCheckedChange={(checked) =>
                      form.setValue('privateLocationConfirmed', checked as boolean)
                    }
                  />
                  <Label htmlFor="privacy" className="text-sm leading-relaxed cursor-pointer">
                    I confirm I am in a <strong>private location</strong> where I can speak freely without being overheard.
                  </Label>
                </div>

                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <p className="text-sm font-semibold mb-2">Technical Checklist:</p>
                  <ul className="text-sm space-y-1 list-disc list-inside">
                    <li>Working webcam and microphone</li>
                    <li>Updated browser (Chrome, Firefox, Safari, or Edge)</li>
                    <li>Stable internet connection</li>
                    <li>Quiet, private space</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Consent & Signature */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Final Consent & Signature</h3>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="clientState">Your State of Residence *</Label>
                  <Select
                    value={form.watch('clientState')}
                    onValueChange={(value) => form.setValue('clientState', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {US_STATES.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.clientState && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.clientState.message}
                    </p>
                  )}
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="recording"
                    checked={form.watch('consentsToRecording')}
                    onCheckedChange={(checked) =>
                      form.setValue('consentsToRecording', checked as boolean)
                    }
                  />
                  <Label htmlFor="recording" className="text-sm leading-relaxed cursor-pointer">
                    I <strong>consent to recording</strong> of sessions for clinical documentation purposes. Recordings are encrypted, HIPAA-compliant, and may be deleted after transcription.
                  </Label>
                </div>

                <div>
                  <Label>Digital Signature *</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Sign below to provide informed consent for telehealth services.
                  </p>
                  <SignaturePad ref={signaturePadRef} />
                  {form.formState.errors.root && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.root.message}
                    </p>
                  )}
                </div>

                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <p className="text-sm">
                    By signing above, I acknowledge that I have read, understood, and agree to all terms outlined in this telehealth consent form. This consent is valid for one year from today's date.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6 border-t">
            <div>
              {currentStep > 0 && (
                <Button type="button" variant="outline" onClick={handlePrevious}>
                  <ArrowLeft className="mr-2" />
                  Previous
                </Button>
              )}
              {currentStep === 0 && onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
            </div>

            <div>
              {currentStep < STEPS.length - 1 ? (
                <Button type="button" onClick={handleNext}>
                  Next
                  <ArrowRight className="ml-2" />
                </Button>
              ) : (
                <Button type="submit">
                  <CheckCircle className="mr-2" />
                  Submit Consent
                </Button>
              )}
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
