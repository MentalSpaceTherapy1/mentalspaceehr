import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CheckCircle, XCircle, Eye, Calendar, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';

interface EligibilityHistory {
  id: string;
  request_number: string;
  patient_id: string;
  verification_type: string;
  service_type: string;
  status: string;
  is_eligible: boolean | null;
  eligibility_status: string | null;
  payer_name: string | null;
  subscriber_id: string | null;
  effective_date: string | null;
  termination_date: string | null;
  coverage_details: any;
  plan_details: any;
  requested_at: string;
  response_received_at: string | null;
  error_message: string | null;
}

export function EligibilityHistoryTracker() {
  const [selectedPatientId, setSelectedPatientId] = React.useState<string>('');
  const [selectedRequest, setSelectedRequest] = React.useState<EligibilityHistory | null>(null);

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

  // Fetch eligibility history for selected patient
  const { data: history, isLoading } = useQuery({
    queryKey: ['eligibility-history', selectedPatientId],
    queryFn: async () => {
      if (!selectedPatientId) return [];

      const { data, error } = await (supabase as any)
        .from('advancedmd_eligibility_requests')
        .select('*')
        .eq('patient_id', selectedPatientId)
        .order('request_date', { ascending: false });

      if (error) throw error;
      return data as any;
    },
    enabled: !!selectedPatientId,
  });

  const getStatusBadge = (status: string, isEligible: boolean | null) => {
    if (status === 'completed') {
      if (isEligible === true) {
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="mr-1 h-3 w-3" />
            Eligible
          </Badge>
        );
      } else if (isEligible === false) {
        return (
          <Badge className="bg-red-100 text-red-800">
            <XCircle className="mr-1 h-3 w-3" />
            Not Eligible
          </Badge>
        );
      }
    }

    const statusConfig: Record<string, { className: string; label: string }> = {
      pending: { className: 'bg-gray-100 text-gray-800', label: 'Pending' },
      processing: { className: 'bg-blue-100 text-blue-800', label: 'Processing' },
      failed: { className: 'bg-red-100 text-red-800', label: 'Failed' },
      error: { className: 'bg-red-100 text-red-800', label: 'Error' },
    };

    const config = statusConfig[status] || statusConfig.pending;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return dateString;
    }
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy hh:mm a');
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Eligibility History</CardTitle>
          <CardDescription>View past eligibility verifications for a patient</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
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

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : selectedPatientId && history && history.length > 0 ? (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Payer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Coverage Period</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-mono text-sm">{record.request_number}</TableCell>
                      <TableCell>{formatDateTime(record.requested_at)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{record.verification_type}</Badge>
                      </TableCell>
                      <TableCell>{record.payer_name || 'N/A'}</TableCell>
                      <TableCell>{getStatusBadge(record.status, record.is_eligible)}</TableCell>
                      <TableCell>
                        {record.effective_date && record.termination_date ? (
                          <div className="text-sm">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(record.effective_date)}
                            </div>
                            <div className="text-muted-foreground">to {formatDate(record.termination_date)}</div>
                          </div>
                        ) : (
                          'N/A'
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedRequest(record)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Eligibility Details</DialogTitle>
                              <DialogDescription>Request #{record.request_number}</DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4">
                              {/* Basic Info */}
                              <div>
                                <h3 className="font-semibold mb-2">Request Information</h3>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">Request Date:</span>
                                    <p className="font-medium">{formatDateTime(record.requested_at)}</p>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Response Date:</span>
                                    <p className="font-medium">{formatDateTime(record.response_received_at)}</p>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Service Type:</span>
                                    <p className="font-medium">{record.service_type}</p>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Verification Type:</span>
                                    <p className="font-medium">{record.verification_type}</p>
                                  </div>
                                </div>
                              </div>

                              <Separator />

                              {/* Payer Info */}
                              {record.payer_name && (
                                <>
                                  <div>
                                    <h3 className="font-semibold mb-2">Payer Information</h3>
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                      <div>
                                        <span className="text-muted-foreground">Payer Name:</span>
                                        <p className="font-medium">{record.payer_name}</p>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Subscriber ID:</span>
                                        <p className="font-medium">{record.subscriber_id}</p>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Eligibility Status:</span>
                                        <p className="font-medium">{record.eligibility_status}</p>
                                      </div>
                                    </div>
                                  </div>
                                  <Separator />
                                </>
                              )}

                              {/* Coverage Details */}
                              {record.coverage_details && Object.keys(record.coverage_details).length > 0 && (
                                <>
                                  <div>
                                    <h3 className="font-semibold mb-2">Coverage Details</h3>
                                    {record.coverage_details.deductible && (
                                      <div className="mb-3">
                                        <p className="text-sm font-medium mb-1">Deductible</p>
                                        <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                                          <div>
                                            Individual: ${record.coverage_details.deductible.individualMet} / $
                                            {record.coverage_details.deductible.individual}
                                          </div>
                                          <div>
                                            Family: ${record.coverage_details.deductible.familyMet} / $
                                            {record.coverage_details.deductible.family}
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                    {record.coverage_details.copay && (
                                      <div className="mb-3">
                                        <p className="text-sm font-medium mb-1">Copays</p>
                                        <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                                          <div>Office Visit: ${record.coverage_details.copay.officeVisit}</div>
                                          <div>Specialist: ${record.coverage_details.copay.specialist}</div>
                                        </div>
                                      </div>
                                    )}
                                    {record.coverage_details.coinsurance && (
                                      <div>
                                        <p className="text-sm font-medium mb-1">Coinsurance</p>
                                        <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                                          <div>In-Network: {record.coverage_details.coinsurance.inNetwork}%</div>
                                          <div>Out-of-Network: {record.coverage_details.coinsurance.outOfNetwork}%</div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  <Separator />
                                </>
                              )}

                              {/* Plan Details */}
                              {record.plan_details && Object.keys(record.plan_details).length > 0 && (
                                <>
                                  <div>
                                    <h3 className="font-semibold mb-2">Plan Details</h3>
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                      {record.plan_details.planName && (
                                        <div>
                                          <span className="text-muted-foreground">Plan Name:</span>
                                          <p className="font-medium">{record.plan_details.planName}</p>
                                        </div>
                                      )}
                                      {record.plan_details.planType && (
                                        <div>
                                          <span className="text-muted-foreground">Plan Type:</span>
                                          <p className="font-medium">{record.plan_details.planType}</p>
                                        </div>
                                      )}
                                      {record.plan_details.networkStatus && (
                                        <div>
                                          <span className="text-muted-foreground">Network Status:</span>
                                          <p className="font-medium">{record.plan_details.networkStatus}</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <Separator />
                                </>
                              )}

                              {/* Error Message */}
                              {record.error_message && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                  <p className="text-sm font-medium text-red-900 mb-1">Error</p>
                                  <p className="text-sm text-red-700">{record.error_message}</p>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : selectedPatientId ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No eligibility history found for this patient</p>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Select a patient to view their eligibility history</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
