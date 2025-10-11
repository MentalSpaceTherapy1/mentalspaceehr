import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, Play, Users, CheckCircle, XCircle, Clock } from 'lucide-react';
import { createBatchEligibilityJob, processBatchEligibilityJob } from '@/lib/eligibility/eligibilityVerification';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const formSchema = z.object({
  batchName: z.string().min(1, 'Batch name is required'),
  scheduledDate: z.string().min(1, 'Scheduled date is required'),
});

type FormValues = z.infer<typeof formSchema>;

interface BatchJob {
  id: string;
  batch_number: string;
  batch_name: string;
  scheduled_date: string;
  status: string;
  total_patients: number;
  processed_count: number;
  successful_count: number;
  failed_count: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

export function BatchEligibilityVerification() {
  const [selectedPatients, setSelectedPatients] = useState<string[]>([]);
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      batchName: '',
      scheduledDate: new Date().toISOString().split('T')[0],
    },
  });

  // Fetch all patients
  const { data: patients } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, first_name, last_name, date_of_birth')
        .order('last_name');
      if (error) throw error;
      return data as any;
    },
  });

  // Fetch batch jobs
  const { data: batches, isLoading: batchesLoading } = useQuery({
    queryKey: ['eligibility-batches'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('advancedmd_eligibility_batches')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data as any;
    },
  });

  // Create batch mutation
  const createBatchMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (selectedPatients.length === 0) {
        throw new Error('Please select at least one patient');
      }

      return await createBatchEligibilityJob({
        batchName: values.batchName,
        scheduledDate: values.scheduledDate,
        patientIds: selectedPatients,
      });
    },
    onSuccess: () => {
      toast.success('Batch job created successfully');
      queryClient.invalidateQueries({ queryKey: ['eligibility-batches'] });
      form.reset();
      setSelectedPatients([]);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create batch job');
    },
  });

  // Process batch mutation
  const processBatchMutation = useMutation({
    mutationFn: async (batchId: string) => {
      return await processBatchEligibilityJob(batchId);
    },
    onSuccess: () => {
      toast.success('Batch processing completed');
      queryClient.invalidateQueries({ queryKey: ['eligibility-batches'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to process batch');
    },
  });

  const togglePatientSelection = (patientId: string) => {
    setSelectedPatients((prev) =>
      prev.includes(patientId) ? prev.filter((id) => id !== patientId) : [...prev, patientId]
    );
  };

  const selectAllPatients = () => {
    if (patients) {
      setSelectedPatients(patients.map((p) => p.id));
    }
  };

  const deselectAllPatients = () => {
    setSelectedPatients([]);
  };

  const onSubmit = async (values: FormValues) => {
    createBatchMutation.mutate(values);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'secondary' as const, icon: Clock },
      processing: { variant: 'default' as const, icon: Loader2 },
      completed: { variant: 'default' as const, icon: CheckCircle },
      failed: { variant: 'destructive' as const, icon: XCircle },
      partial: { variant: 'default' as const, icon: CheckCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        <Icon className={`h-3 w-3 ${status === 'processing' ? 'animate-spin' : ''}`} />
        {status}
      </Badge>
    );
  };

  const getProgressPercentage = (batch: BatchJob) => {
    if (batch.total_patients === 0) return 0;
    return Math.round((batch.processed_count / batch.total_patients) * 100);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Batch Eligibility Job</CardTitle>
          <CardDescription>Schedule eligibility verification for multiple patients</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="batchName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Batch Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Monthly eligibility verification" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="scheduledDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scheduled Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <FormLabel>
                    Select Patients ({selectedPatients.length} selected)
                  </FormLabel>
                  <div className="space-x-2">
                    <Button type="button" variant="outline" size="sm" onClick={selectAllPatients}>
                      Select All
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={deselectAllPatients}>
                      Deselect All
                    </Button>
                  </div>
                </div>

                <div className="border rounded-lg max-h-64 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">Select</TableHead>
                        <TableHead>Patient Name</TableHead>
                        <TableHead>Date of Birth</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {patients?.map((patient) => (
                        <TableRow key={patient.id}>
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedPatients.includes(patient.id)}
                              onChange={() => togglePatientSelection(patient.id)}
                              className="h-4 w-4"
                            />
                          </TableCell>
                          <TableCell>
                            {patient.last_name}, {patient.first_name}
                          </TableCell>
                          <TableCell>{patient.date_of_birth}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <Button type="submit" disabled={createBatchMutation.isPending || selectedPatients.length === 0}>
                {createBatchMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Batch...
                  </>
                ) : (
                  <>
                    <Users className="mr-2 h-4 w-4" />
                    Create Batch Job
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Batch Jobs</CardTitle>
          <CardDescription>Recent eligibility verification batches</CardDescription>
        </CardHeader>
        <CardContent>
          {batchesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : batches && batches.length > 0 ? (
            <div className="space-y-4">
              {batches.map((batch) => (
                <Card key={batch.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{batch.batch_name}</CardTitle>
                        <CardDescription>
                          Batch #{batch.batch_number} • Scheduled: {batch.scheduled_date}
                        </CardDescription>
                      </div>
                      {getStatusBadge(batch.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Total Patients</span>
                        <p className="text-xl font-semibold">{batch.total_patients}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Successful</span>
                        <p className="text-xl font-semibold text-green-600">{batch.successful_count}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Failed</span>
                        <p className="text-xl font-semibold text-red-600">{batch.failed_count}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Progress</span>
                        <p className="text-xl font-semibold">{getProgressPercentage(batch)}%</p>
                      </div>
                    </div>

                    {batch.status === 'processing' || batch.processed_count > 0 ? (
                      <div className="space-y-1">
                        <Progress value={getProgressPercentage(batch)} />
                        <p className="text-xs text-muted-foreground text-right">
                          {batch.processed_count} of {batch.total_patients} processed
                        </p>
                      </div>
                    ) : null}

                    {batch.status === 'pending' && (
                      <Button
                        onClick={() => processBatchMutation.mutate(batch.id)}
                        disabled={processBatchMutation.isPending}
                        size="sm"
                      >
                        {processBatchMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Play className="mr-2 h-3 w-3" />
                            Process Batch
                          </>
                        )}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No batch jobs found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
