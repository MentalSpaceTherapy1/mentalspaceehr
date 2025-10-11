/**
 * Eligibility Check Form Component
 *
 * Allows staff to check insurance eligibility for a client
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Calendar, CreditCard, Search, Loader2, AlertCircle } from 'lucide-react';
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
import { getAdvancedMDClient } from '@/lib/advancedmd';
import type { EligibilityResponse } from '@/lib/advancedmd';

const formSchema = z.object({
  clientId: z.string().min(1, 'Client is required'),
  insuranceId: z.string().min(1, 'Insurance is required'),
  serviceDate: z.string().min(1, 'Service date is required'),
  serviceType: z.string().default('30'),
  cptCode: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface EligibilityCheckFormProps {
  clientId?: string;
  insuranceId?: string;
  onSuccess?: (response: EligibilityResponse) => void;
  onError?: (error: Error) => void;
}

export function EligibilityCheckForm({
  clientId,
  insuranceId,
  onSuccess,
  onError,
}: EligibilityCheckFormProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientId: clientId || '',
      insuranceId: insuranceId || '',
      serviceDate: new Date().toISOString().split('T')[0],
      serviceType: '30', // Health Benefit Plan Coverage
      cptCode: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsChecking(true);
    setError(null);

    try {
      console.log('[EligibilityCheck] Checking eligibility...', data);

      const client = getAdvancedMDClient();
      const response = await client.checkEligibility({
        clientId: data.clientId,
        insuranceId: data.insuranceId,
        serviceDate: data.serviceDate,
        serviceType: data.serviceType,
        cptCode: data.cptCode,
      });

      if (response.success && response.data) {
        console.log('[EligibilityCheck] Success:', response.data);
        onSuccess?.(response.data);
      } else {
        const errorMsg = response.error?.message || 'Eligibility check failed';
        setError(errorMsg);
        onError?.(new Error(errorMsg));
      }
    } catch (err: any) {
      console.error('[EligibilityCheck] Error:', err);
      const errorMsg = err.message || 'Failed to check eligibility';
      setError(errorMsg);
      onError?.(err);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Check Insurance Eligibility
        </CardTitle>
        <CardDescription>
          Verify insurance coverage and benefits in real-time
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <FormField
              control={form.control}
              name="serviceDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service Date</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="date"
                        className="pl-10"
                        {...field}
                        max={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    Date of service for eligibility check
                  </FormDescription>
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select service type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="30">Health Benefit Plan Coverage</SelectItem>
                      <SelectItem value="1">Medical Care</SelectItem>
                      <SelectItem value="98">Professional (Physician) Visit</SelectItem>
                      <SelectItem value="MH">Mental Health</SelectItem>
                      <SelectItem value="AH">Substance Abuse</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Type of service to verify coverage for
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cptCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CPT Code (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., 90834"
                      {...field}
                      maxLength={5}
                    />
                  </FormControl>
                  <FormDescription>
                    Specific procedure code to check (e.g., 90834 for 45-min psychotherapy)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={isChecking}
            >
              {isChecking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking Eligibility...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Check Eligibility
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
