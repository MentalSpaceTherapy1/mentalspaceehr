import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Loader2, Calendar, DollarSign, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { getLatestEligibility, needsEligibilityRefresh, submitEligibilityRequest } from '@/lib/eligibility/eligibilityVerification';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';

export function CoverageDetailsViewer() {
  const [selectedPatientId, setSelectedPatientId] = React.useState<string>('');
  const queryClient = useQueryClient();

  // Fetch patients
  const { data: patients } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, first_name, last_name')
        .order('last_name');
      if (error) throw error;
      return data as any;
    },
  });

  // Fetch latest eligibility
  const { data: eligibility, isLoading, refetch } = useQuery({
    queryKey: ['latest-eligibility', selectedPatientId],
    queryFn: async () => {
      if (!selectedPatientId) return null;
      return await getLatestEligibility(selectedPatientId);
    },
    enabled: !!selectedPatientId,
  });

  // Check if refresh needed
  const { data: needsRefresh } = useQuery({
    queryKey: ['needs-eligibility-refresh', selectedPatientId],
    queryFn: async () => {
      if (!selectedPatientId) return false;
      return await needsEligibilityRefresh(selectedPatientId);
    },
    enabled: !!selectedPatientId,
  });

  // Refresh eligibility mutation
  const refreshMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPatientId) throw new Error('No patient selected');

      return await submitEligibilityRequest({
        patientId: selectedPatientId,
        serviceType: 'Mental Health',
        verificationType: 'real_time',
      });
    },
    onSuccess: () => {
      toast.success('Eligibility refreshed successfully');
      queryClient.invalidateQueries({ queryKey: ['latest-eligibility', selectedPatientId] });
      queryClient.invalidateQueries({ queryKey: ['needs-eligibility-refresh', selectedPatientId] });
      refetch();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to refresh eligibility');
    },
  });

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return dateString;
    }
  };

  const calculatePercentage = (current: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((current / total) * 100);
  };

  const getDaysUntilExpiration = (terminationDate: string | undefined) => {
    if (!terminationDate) return null;
    const days = Math.floor((new Date(terminationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const getExpirationAlert = (days: number | null) => {
    if (days === null) return null;

    if (days < 0) {
      return (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>Coverage has expired</AlertDescription>
        </Alert>
      );
    } else if (days <= 7) {
      return (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>Coverage expires in {days} days</AlertDescription>
        </Alert>
      );
    } else if (days <= 30) {
      return (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>Coverage expires in {days} days</AlertDescription>
        </Alert>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Coverage Details</CardTitle>
          <CardDescription>View detailed insurance coverage information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Select Patient</label>
              <Select onValueChange={setSelectedPatientId} value={selectedPatientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a patient" />
                </SelectTrigger>
                <SelectContent>
                  {patients?.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.last_name}, {patient.first_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedPatientId && eligibility && (
              <div className="pt-8">
                <Button
                  onClick={() => refreshMutation.mutate()}
                  disabled={refreshMutation.isPending}
                  variant={needsRefresh ? 'default' : 'outline'}
                >
                  {refreshMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      {needsRefresh ? 'Refresh Required' : 'Refresh'}
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !selectedPatientId ? (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Select a patient to view coverage details</p>
            </div>
          ) : !eligibility ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 mx-auto mb-2 text-yellow-500" />
              <p className="text-muted-foreground mb-4">No eligibility verification found</p>
              <Button onClick={() => refreshMutation.mutate()} disabled={refreshMutation.isPending}>
                {refreshMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  'Run Eligibility Check'
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Eligibility Status */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">Eligibility Status</h3>
                  <p className="text-sm text-muted-foreground">
                    Last verified: {formatDate(eligibility.requestNumber.split('-')[1])}
                  </p>
                </div>
                <Badge className={eligibility.isEligible ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                  {eligibility.isEligible ? (
                    <>
                      <CheckCircle className="mr-1 h-4 w-4" />
                      Eligible
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="mr-1 h-4 w-4" />
                      Not Eligible
                    </>
                  )}
                </Badge>
              </div>

              {getExpirationAlert(getDaysUntilExpiration(eligibility.terminationDate))}

              <Separator />

              {/* Payer Information */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center">
                  <DollarSign className="mr-2 h-5 w-5" />
                  Payer Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-muted-foreground">Payer Name</span>
                    <p className="font-medium">{eligibility.payerName}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-muted-foreground">Subscriber ID</span>
                    <p className="font-medium font-mono">{eligibility.subscriberId}</p>
                  </div>
                </div>
              </div>

              {/* Coverage Period */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center">
                  <Calendar className="mr-2 h-5 w-5" />
                  Coverage Period
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-muted-foreground">Effective Date</span>
                    <p className="font-medium">{formatDate(eligibility.effectiveDate)}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-muted-foreground">Termination Date</span>
                    <p className="font-medium">{formatDate(eligibility.terminationDate)}</p>
                  </div>
                </div>
              </div>

              {eligibility.coverageDetails && (
                <>
                  <Separator />

                  {/* Deductible */}
                  {eligibility.coverageDetails.deductible && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Deductible</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span className="font-medium">Individual</span>
                            <span className="text-muted-foreground">
                              ${eligibility.coverageDetails.deductible.individualMet.toFixed(2)} of $
                              {eligibility.coverageDetails.deductible.individual.toFixed(2)}
                            </span>
                          </div>
                          <Progress
                            value={calculatePercentage(
                              eligibility.coverageDetails.deductible.individualMet,
                              eligibility.coverageDetails.deductible.individual
                            )}
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            {calculatePercentage(
                              eligibility.coverageDetails.deductible.individualMet,
                              eligibility.coverageDetails.deductible.individual
                            )}
                            % met
                          </p>
                        </div>

                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span className="font-medium">Family</span>
                            <span className="text-muted-foreground">
                              ${eligibility.coverageDetails.deductible.familyMet.toFixed(2)} of $
                              {eligibility.coverageDetails.deductible.family.toFixed(2)}
                            </span>
                          </div>
                          <Progress
                            value={calculatePercentage(
                              eligibility.coverageDetails.deductible.familyMet,
                              eligibility.coverageDetails.deductible.family
                            )}
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            {calculatePercentage(
                              eligibility.coverageDetails.deductible.familyMet,
                              eligibility.coverageDetails.deductible.family
                            )}
                            % met
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Out-of-Pocket Maximum */}
                  {eligibility.coverageDetails.outOfPocketMax && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Out-of-Pocket Maximum</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span className="font-medium">Individual</span>
                            <span className="text-muted-foreground">
                              ${eligibility.coverageDetails.outOfPocketMax.individualMet.toFixed(2)} of $
                              {eligibility.coverageDetails.outOfPocketMax.individual.toFixed(2)}
                            </span>
                          </div>
                          <Progress
                            value={calculatePercentage(
                              eligibility.coverageDetails.outOfPocketMax.individualMet,
                              eligibility.coverageDetails.outOfPocketMax.individual
                            )}
                          />
                        </div>

                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span className="font-medium">Family</span>
                            <span className="text-muted-foreground">
                              ${eligibility.coverageDetails.outOfPocketMax.familyMet.toFixed(2)} of $
                              {eligibility.coverageDetails.outOfPocketMax.family.toFixed(2)}
                            </span>
                          </div>
                          <Progress
                            value={calculatePercentage(
                              eligibility.coverageDetails.outOfPocketMax.familyMet,
                              eligibility.coverageDetails.outOfPocketMax.family
                            )}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Copays and Coinsurance */}
                  <div className="grid grid-cols-2 gap-4">
                    {eligibility.coverageDetails.copay && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">Copays</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Office Visit</span>
                              <span className="font-medium">${eligibility.coverageDetails.copay.officeVisit.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Specialist</span>
                              <span className="font-medium">${eligibility.coverageDetails.copay.specialist.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Emergency Room</span>
                              <span className="font-medium">${eligibility.coverageDetails.copay.emergencyRoom.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Urgent Care</span>
                              <span className="font-medium">${eligibility.coverageDetails.copay.urgentCare.toFixed(2)}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {eligibility.coverageDetails.coinsurance && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">Coinsurance</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">In-Network</span>
                              <span className="font-medium">{eligibility.coverageDetails.coinsurance.inNetwork}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Out-of-Network</span>
                              <span className="font-medium">{eligibility.coverageDetails.coinsurance.outOfNetwork}%</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </>
              )}

              {/* Plan Details */}
              {eligibility.planDetails && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-3">Plan Details</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-muted-foreground">Plan Name</span>
                        <p className="font-medium">{eligibility.planDetails.planName}</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-muted-foreground">Plan Type</span>
                        <p className="font-medium">{eligibility.planDetails.planType}</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-muted-foreground">Network Status</span>
                        <Badge variant="outline">{eligibility.planDetails.networkStatus}</Badge>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
