import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, CheckCircle, XCircle, AlertTriangle, Calendar, CreditCard } from 'lucide-react';
import { submitEligibilityRequest, type EligibilityResponse } from '@/lib/eligibility/eligibilityVerification';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

const formSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  serviceType: z.string().min(1, 'Service type is required'),
});

type FormValues = z.infer<typeof formSchema>;

export function RealTimeEligibilityCheck() {
  const [isChecking, setIsChecking] = useState(false);
  const [eligibilityResult, setEligibilityResult] = useState<EligibilityResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      patientId: '',
      serviceType: 'Mental Health',
    },
  });

  // Fetch patients for selection
  const { data: patients } = useQuery({
    queryKey: ['patients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patients')
        .select('id, first_name, last_name')
        .order('last_name');
      if (error) throw error;
      return data;
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsChecking(true);
    setError(null);
    setEligibilityResult(null);

    try {
      const result = await submitEligibilityRequest({
        patientId: values.patientId,
        serviceType: values.serviceType,
        verificationType: 'real_time',
      });

      setEligibilityResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check eligibility');
    } finally {
      setIsChecking(false);
    }
  };

  const getStatusColor = (isEligible: boolean) => {
    return isEligible ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const getStatusIcon = (isEligible: boolean) => {
    return isEligible ? (
      <CheckCircle className="h-5 w-5 text-green-600" />
    ) : (
      <XCircle className="h-5 w-5 text-red-600" />
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Real-Time Eligibility Verification</CardTitle>
          <CardDescription>
            Check insurance eligibility and benefits in real-time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="patientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Patient</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select patient" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {patients?.map((patient) => (
                          <SelectItem key={patient.id} value={patient.id}>
                            {patient.last_name}, {patient.first_name}
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
                name="serviceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select service type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Mental Health">Mental Health</SelectItem>
                        <SelectItem value="Substance Abuse">Substance Abuse</SelectItem>
                        <SelectItem value="Psychotherapy">Psychotherapy</SelectItem>
                        <SelectItem value="Psychiatric Evaluation">Psychiatric Evaluation</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={isChecking}>
                {isChecking ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking Eligibility...
                  </>
                ) : (
                  'Check Eligibility'
                )}
              </Button>
            </form>
          </Form>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {eligibilityResult && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Eligibility Results</CardTitle>
              <Badge className={getStatusColor(eligibilityResult.isEligible)}>
                {getStatusIcon(eligibilityResult.isEligible)}
                <span className="ml-2">{eligibilityResult.eligibilityStatus}</span>
              </Badge>
            </div>
            <CardDescription>Request #{eligibilityResult.requestNumber}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Payer Information */}
            <div>
              <h3 className="font-semibold mb-2 flex items-center">
                <CreditCard className="mr-2 h-4 w-4" />
                Payer Information
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Payer:</span>
                  <p className="font-medium">{eligibilityResult.payerName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Subscriber ID:</span>
                  <p className="font-medium">{eligibilityResult.subscriberId}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Group Number:</span>
                  <p className="font-medium">{eligibilityResult.groupNumber || 'N/A'}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Coverage Dates */}
            {eligibilityResult.effectiveDate && (
              <div>
                <h3 className="font-semibold mb-2 flex items-center">
                  <Calendar className="mr-2 h-4 w-4" />
                  Coverage Period
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Effective Date:</span>
                    <p className="font-medium">{eligibilityResult.effectiveDate}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Termination Date:</span>
                    <p className="font-medium">{eligibilityResult.terminationDate || 'N/A'}</p>
                  </div>
                </div>
              </div>
            )}

            {eligibilityResult.coverageDetails && (
              <>
                <Separator />

                {/* Deductible */}
                <div>
                  <h3 className="font-semibold mb-2">Deductible</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Individual:</span>
                      <p className="font-medium">
                        ${eligibilityResult.coverageDetails.deductible?.individualMet.toFixed(2)} of $
                        {eligibilityResult.coverageDetails.deductible?.individual.toFixed(2)}
                      </p>
                      <div className="mt-1 h-2 bg-gray-200 rounded-full">
                        <div
                          className="h-2 bg-blue-500 rounded-full"
                          style={{
                            width: `${
                              ((eligibilityResult.coverageDetails.deductible?.individualMet || 0) /
                                (eligibilityResult.coverageDetails.deductible?.individual || 1)) *
                              100
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Family:</span>
                      <p className="font-medium">
                        ${eligibilityResult.coverageDetails.deductible?.familyMet.toFixed(2)} of $
                        {eligibilityResult.coverageDetails.deductible?.family.toFixed(2)}
                      </p>
                      <div className="mt-1 h-2 bg-gray-200 rounded-full">
                        <div
                          className="h-2 bg-blue-500 rounded-full"
                          style={{
                            width: `${
                              ((eligibilityResult.coverageDetails.deductible?.familyMet || 0) /
                                (eligibilityResult.coverageDetails.deductible?.family || 1)) *
                              100
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Out-of-Pocket Max */}
                <div>
                  <h3 className="font-semibold mb-2">Out-of-Pocket Maximum</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Individual:</span>
                      <p className="font-medium">
                        ${eligibilityResult.coverageDetails.outOfPocketMax?.individualMet.toFixed(2)} of $
                        {eligibilityResult.coverageDetails.outOfPocketMax?.individual.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Family:</span>
                      <p className="font-medium">
                        ${eligibilityResult.coverageDetails.outOfPocketMax?.familyMet.toFixed(2)} of $
                        {eligibilityResult.coverageDetails.outOfPocketMax?.family.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Copays */}
                <div>
                  <h3 className="font-semibold mb-2">Copays</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Office Visit:</span>
                      <p className="font-medium">${eligibilityResult.coverageDetails.copay?.officeVisit.toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Specialist:</span>
                      <p className="font-medium">${eligibilityResult.coverageDetails.copay?.specialist.toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                {/* Coinsurance */}
                <div>
                  <h3 className="font-semibold mb-2">Coinsurance</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">In-Network:</span>
                      <p className="font-medium">{eligibilityResult.coverageDetails.coinsurance?.inNetwork}%</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Out-of-Network:</span>
                      <p className="font-medium">{eligibilityResult.coverageDetails.coinsurance?.outOfNetwork}%</p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {eligibilityResult.planDetails && (
              <>
                <Separator />

                {/* Plan Details */}
                <div>
                  <h3 className="font-semibold mb-2">Plan Details</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Plan Name:</span>
                      <p className="font-medium">{eligibilityResult.planDetails.planName}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Plan Type:</span>
                      <p className="font-medium">{eligibilityResult.planDetails.planType}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Network Status:</span>
                      <Badge variant="outline">{eligibilityResult.planDetails.networkStatus}</Badge>
                    </div>
                  </div>
                </div>
              </>
            )}

            {eligibilityResult.serviceLimitations && eligibilityResult.serviceLimitations.length > 0 && (
              <>
                <Separator />

                {/* Service Limitations */}
                <div>
                  <h3 className="font-semibold mb-2">Service Limitations</h3>
                  <div className="space-y-2">
                    {eligibilityResult.serviceLimitations.map((limitation, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg text-sm">
                        <p className="font-medium">{limitation.serviceType}</p>
                        <p className="text-muted-foreground">
                          {limitation.remainingValue} of {limitation.limitationValue} {limitation.limitationType}{' '}
                          remaining {limitation.limitationPeriod}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {eligibilityResult.errorMessage && (
              <>
                <Separator />
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{eligibilityResult.errorMessage}</AlertDescription>
                </Alert>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
