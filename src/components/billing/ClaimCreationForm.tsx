/**
 * Claim Creation Form Component
 *
 * Comprehensive form for creating insurance claims with service lines and diagnoses
 */

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Trash2, FileText, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { getAdvancedMDClient } from '@/lib/advancedmd';
import { useToast } from '@/hooks/use-toast';
import type { ClaimSubmissionResponse } from '@/lib/advancedmd';

const serviceLineSchema = z.object({
  serviceDate: z.string().min(1, 'Service date is required'),
  placeOfService: z.string().min(1, 'Place of service is required'),
  cptCode: z.string().min(5, 'Valid CPT code required').max(5),
  modifiers: z.array(z.string()).optional(),
  units: z.coerce.number().min(1, 'Units must be at least 1').max(999),
  unitCharge: z.coerce.number().min(0.01, 'Charge must be greater than 0'),
  diagnosisPointers: z.array(z.number()).min(1, 'At least one diagnosis required'),
});

const diagnosisSchema = z.object({
  diagnosisCode: z.string().min(3, 'Valid ICD-10 code required'),
  diagnosisType: z.enum(['primary', 'secondary']),
});

const formSchema = z.object({
  clientId: z.string().min(1, 'Client is required'),
  insuranceId: z.string().min(1, 'Insurance is required'),
  billingProviderId: z.string().min(1, 'Billing provider is required'),
  renderingProviderId: z.string().min(1, 'Rendering provider is required'),
  statementFromDate: z.string().min(1, 'Statement from date is required'),
  statementToDate: z.string().min(1, 'Statement to date is required'),
  priorAuthNumber: z.string().optional(),
  serviceLines: z.array(serviceLineSchema).min(1, 'At least one service line required'),
  diagnoses: z.array(diagnosisSchema).min(1, 'At least one diagnosis required'),
});

type FormData = z.infer<typeof formSchema>;

interface ClaimCreationFormProps {
  clientId?: string;
  insuranceId?: string;
  onSuccess?: (response: ClaimSubmissionResponse) => void;
  onError?: (error: Error) => void;
}

const PLACE_OF_SERVICE = [
  { value: '02', label: 'Telehealth' },
  { value: '11', label: 'Office' },
  { value: '12', label: 'Home' },
  { value: '22', label: 'On Campus - Outpatient Hospital' },
  { value: '49', label: 'Independent Clinic' },
  { value: '50', label: 'Federally Qualified Health Center' },
  { value: '53', label: 'Community Mental Health Center' },
];

const COMMON_CPT_CODES = [
  { code: '90791', description: 'Psychiatric diagnostic evaluation' },
  { code: '90792', description: 'Psychiatric diagnostic evaluation with medical services' },
  { code: '90832', description: 'Psychotherapy, 30 minutes' },
  { code: '90834', description: 'Psychotherapy, 45 minutes' },
  { code: '90837', description: 'Psychotherapy, 60 minutes' },
  { code: '90846', description: 'Family psychotherapy without patient' },
  { code: '90847', description: 'Family psychotherapy with patient' },
  { code: '90853', description: 'Group psychotherapy' },
];

export function ClaimCreationForm({
  clientId,
  insuranceId,
  onSuccess,
  onError,
}: ClaimCreationFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientId: clientId || '',
      insuranceId: insuranceId || '',
      billingProviderId: '',
      renderingProviderId: '',
      statementFromDate: new Date().toISOString().split('T')[0],
      statementToDate: new Date().toISOString().split('T')[0],
      priorAuthNumber: '',
      serviceLines: [
        {
          serviceDate: new Date().toISOString().split('T')[0],
          placeOfService: '02',
          cptCode: '',
          modifiers: [],
          units: 1,
          unitCharge: 0,
          diagnosisPointers: [1],
        },
      ],
      diagnoses: [
        {
          diagnosisCode: '',
          diagnosisType: 'primary',
        },
      ],
    },
  });

  const {
    fields: serviceLineFields,
    append: appendServiceLine,
    remove: removeServiceLine,
  } = useFieldArray({
    control: form.control,
    name: 'serviceLines',
  });

  const {
    fields: diagnosisFields,
    append: appendDiagnosis,
    remove: removeDiagnosis,
  } = useFieldArray({
    control: form.control,
    name: 'diagnoses',
  });

  const validateClaim = (data: FormData): string[] => {
    const errors: string[] = [];

    // Validate date range
    const fromDate = new Date(data.statementFromDate);
    const toDate = new Date(data.statementToDate);
    if (toDate < fromDate) {
      errors.push('Statement to date cannot be before from date');
    }

    // Validate service line dates
    data.serviceLines.forEach((line, index) => {
      const serviceDate = new Date(line.serviceDate);
      if (serviceDate < fromDate || serviceDate > toDate) {
        errors.push(`Service line ${index + 1}: Date must be within statement period`);
      }
    });

    // Validate diagnosis pointers
    data.serviceLines.forEach((line, index) => {
      line.diagnosisPointers.forEach((pointer) => {
        if (pointer > data.diagnoses.length) {
          errors.push(`Service line ${index + 1}: Invalid diagnosis pointer ${pointer}`);
        }
      });
    });

    // Validate at least one primary diagnosis
    const hasPrimary = data.diagnoses.some((d) => d.diagnosisType === 'primary');
    if (!hasPrimary) {
      errors.push('At least one primary diagnosis is required');
    }

    return errors;
  };

  const calculateTotalCharge = () => {
    const serviceLines = form.watch('serviceLines');
    return serviceLines.reduce((total, line) => {
      return total + line.units * line.unitCharge;
    }, 0);
  };

  const onSubmit = async (data: FormData) => {
    // Validate claim
    const errors = validateClaim(data);
    if (errors.length > 0) {
      setValidationErrors(errors);
      toast({
        title: 'Validation Failed',
        description: `${errors.length} error(s) found. Please review and correct.`,
        variant: 'destructive',
      });
      return;
    }

    setValidationErrors([]);
    setIsSubmitting(true);

    try {
      console.log('[ClaimCreation] Submitting claim...', data);

      const client = getAdvancedMDClient();
      const response = await client.submitClaim({
        claimId: `CLM-${Date.now()}`,
        claimType: 'Original',
        patientId: data.clientId,
        insuranceId: data.insuranceId,
        billingProviderId: data.billingProviderId,
        renderingProviderId: data.renderingProviderId,
        statementFromDate: data.statementFromDate,
        statementToDate: data.statementToDate,
        priorAuthNumber: data.priorAuthNumber || undefined,
        serviceLines: data.serviceLines.map((line, index) => ({
          lineNumber: index + 1,
          serviceDate: line.serviceDate,
          placeOfService: line.placeOfService,
          cptCode: line.cptCode,
          modifiers: line.modifiers || [],
          units: line.units,
          unitCharge: line.unitCharge,
          diagnosisPointers: line.diagnosisPointers,
        })),
        diagnoses: data.diagnoses.map((diag, index) => ({
          diagnosisCode: diag.diagnosisCode,
          diagnosisPointer: index + 1,
          diagnosisType: diag.diagnosisType,
        })),
      });

      if (response.success && response.data) {
        console.log('[ClaimCreation] Success:', response.data);
        toast({
          title: 'Claim Submitted Successfully',
          description: `Claim ${response.data.claimControlNumber} has been submitted`,
        });
        onSuccess?.(response.data);

        // Reset form
        form.reset();
      } else {
        throw new Error(response.error?.message || 'Claim submission failed');
      }
    } catch (error: any) {
      console.error('[ClaimCreation] Error:', error);
      toast({
        title: 'Claim Submission Failed',
        description: error.message,
        variant: 'destructive',
      });
      onError?.(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalCharge = calculateTotalCharge();

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-semibold mb-2">Validation Errors:</p>
              <ul className="list-disc list-inside space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index} className="text-sm">
                    {error}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Claim Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Claim Information
            </CardTitle>
            <CardDescription>Basic claim details and statement period</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="statementFromDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Statement From Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="statementToDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Statement To Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="billingProviderId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Billing Provider</FormLabel>
                    <FormControl>
                      <Input placeholder="Select billing provider" {...field} />
                    </FormControl>
                    <FormDescription>Provider submitting the claim</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="renderingProviderId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rendering Provider</FormLabel>
                    <FormControl>
                      <Input placeholder="Select rendering provider" {...field} />
                    </FormControl>
                    <FormDescription>Provider who performed services</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priorAuthNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prior Authorization Number (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="PA-123456" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Diagnoses */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Diagnoses (ICD-10)</CardTitle>
                <CardDescription>
                  Add all relevant diagnoses (at least one primary required)
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  appendDiagnosis({
                    diagnosisCode: '',
                    diagnosisType: 'secondary',
                  })
                }
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Diagnosis
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {diagnosisFields.map((field, index) => (
              <div key={field.id} className="flex items-start gap-4 p-4 border rounded-lg">
                <Badge variant="outline" className="mt-2">
                  {index + 1}
                </Badge>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name={`diagnoses.${index}.diagnosisCode`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ICD-10 Code</FormLabel>
                        <FormControl>
                          <Input placeholder="F41.1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`diagnoses.${index}.diagnosisType`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="primary">Primary</SelectItem>
                            <SelectItem value="secondary">Secondary</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex items-end">
                    {diagnosisFields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeDiagnosis(index)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Service Lines */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Service Lines</CardTitle>
                <CardDescription>Add all services provided during this claim period</CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  appendServiceLine({
                    serviceDate: new Date().toISOString().split('T')[0],
                    placeOfService: '02',
                    cptCode: '',
                    modifiers: [],
                    units: 1,
                    unitCharge: 0,
                    diagnosisPointers: [1],
                  })
                }
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Service Line
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {serviceLineFields.map((field, index) => (
              <div key={field.id} className="p-4 border rounded-lg space-y-4 bg-muted/30">
                <div className="flex items-center justify-between">
                  <Badge>Line {index + 1}</Badge>
                  {serviceLineFields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeServiceLine(index)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name={`serviceLines.${index}.serviceDate`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Service Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`serviceLines.${index}.placeOfService`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Place of Service</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {PLACE_OF_SERVICE.map((pos) => (
                              <SelectItem key={pos.value} value={pos.value}>
                                {pos.value} - {pos.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`serviceLines.${index}.cptCode`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CPT Code</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select or type CPT" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {COMMON_CPT_CODES.map((cpt) => (
                              <SelectItem key={cpt.code} value={cpt.code}>
                                {cpt.code} - {cpt.description}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`serviceLines.${index}.units`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Units</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`serviceLines.${index}.unitCharge`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit Charge ($)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" min="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div>
                    <FormLabel>Line Total</FormLabel>
                    <div className="mt-2 text-2xl font-bold text-primary">
                      $
                      {(
                        form.watch(`serviceLines.${index}.units`) *
                        form.watch(`serviceLines.${index}.unitCharge`)
                      ).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <Separator />

            <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg">
              <span className="text-lg font-semibold">Total Claim Amount:</span>
              <span className="text-2xl font-bold text-primary">${totalCharge.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => form.reset()}>
            Reset Form
          </Button>
          <Button type="submit" disabled={isSubmitting} size="lg">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting Claim...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Submit Claim
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
