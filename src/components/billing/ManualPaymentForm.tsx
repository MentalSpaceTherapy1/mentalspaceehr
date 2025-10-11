import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Trash2, DollarSign, Loader2 } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { postManualPayment } from '@/lib/advancedmd/payment-posting';
import { getCARCDescription } from '@/lib/advancedmd/era-835-parser';
const sb = supabase as any;

const adjustmentSchema = z.object({
  adjustmentGroup: z.enum(['CO', 'PR', 'OA', 'PI']),
  adjustmentCode: z.string().min(1, 'Adjustment code is required'),
  adjustmentAmount: z.coerce.number().min(0, 'Amount must be positive'),
  adjustmentReason: z.string().optional(),
});

const formSchema = z.object({
  claimId: z.string().min(1, 'Claim is required'),
  paymentDate: z.string().min(1, 'Payment date is required'),
  paymentAmount: z.coerce.number().min(0, 'Payment amount must be positive'),
  paymentMethod: z.string().min(1, 'Payment method is required'),
  checkNumber: z.string().optional(),
  postingType: z.enum(['Insurance Payment', 'Patient Payment', 'Adjustment', 'Refund', 'Write-off']),
  adjustments: z.array(adjustmentSchema).optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface Claim {
  id: string;
  claim_id: string;
  billed_amount: number;
  paid_amount: number;
  claim_status: string;
  clients: {
    first_name: string;
    last_name: string;
  };
}

export function ManualPaymentForm() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      claimId: '',
      paymentDate: new Date().toISOString().split('T')[0],
      paymentAmount: 0,
      paymentMethod: '',
      checkNumber: '',
      postingType: 'Insurance Payment',
      adjustments: [],
      notes: '',
    },
  });

  const {
    fields: adjustmentFields,
    append: appendAdjustment,
    remove: removeAdjustment,
  } = useFieldArray({
    control: form.control,
    name: 'adjustments',
  });

  useEffect(() => {
    loadClaims();
  }, []);

  const loadClaims = async () => {
    const { data, error } = await sb
      .from('advancedmd_claims')
      .select(
        `
        id,
        claim_id,
        billed_amount,
        paid_amount,
        claim_status,
        clients (
          first_name,
          last_name
        )
      `
      )
      .in('claim_status', ['Submitted', 'Accepted', 'In Process'])
      .order('created_at', { ascending: false })
      .limit(100);

    if (data) {
      setClaims(data as Claim[]);
    }
  };

  const handleClaimSelect = (claimId: string) => {
    const claim = claims.find((c) => c.id === claimId);
    setSelectedClaim(claim || null);
  };

  const onSubmit = async (values: FormValues) => {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast({
          title: 'Error',
          description: 'You must be logged in to post payments',
          variant: 'destructive',
        });
        return;
      }

      const result = await postManualPayment(
        {
          claimId: values.claimId,
          paymentDate: values.paymentDate,
          paymentAmount: values.paymentAmount,
          paymentMethod: values.paymentMethod,
          checkNumber: values.checkNumber,
          postingType: values.postingType,
          adjustments: values.adjustments?.map((adj) => ({
            adjustmentGroup: adj.adjustmentGroup,
            adjustmentCode: adj.adjustmentCode,
            adjustmentAmount: adj.adjustmentAmount,
            adjustmentReason: adj.adjustmentReason,
          })),
          notes: values.notes,
        },
        user.id
      );

      if (result.success) {
        toast({
          title: 'Payment Posted',
          description: 'Manual payment has been posted successfully',
        });

        form.reset();
        setSelectedClaim(null);
        loadClaims();
      } else {
        toast({
          title: 'Payment Posting Failed',
          description: result.errors?.join(', '),
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Payment posting error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateBalance = () => {
    if (!selectedClaim) return 0;
    return selectedClaim.billed_amount - (selectedClaim.paid_amount || 0);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Manual Payment Entry
        </CardTitle>
        <CardDescription>Post insurance or patient payments manually</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Claim Selection */}
            <FormField
              control={form.control}
              name="claimId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Claim</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      handleClaimSelect(value);
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a claim to post payment" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {claims.map((claim) => (
                        <SelectItem key={claim.id} value={claim.id}>
                          {claim.claim_id} - {claim.clients.first_name} {claim.clients.last_name} -
                          ${claim.billed_amount} ({claim.claim_status})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Claim Details */}
            {selectedClaim && (
              <div className="rounded-lg bg-muted p-4 space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Patient:</span>{' '}
                    {selectedClaim.clients.first_name} {selectedClaim.clients.last_name}
                  </div>
                  <div>
                    <span className="font-medium">Claim ID:</span> {selectedClaim.claim_id}
                  </div>
                  <div>
                    <span className="font-medium">Billed:</span> ${selectedClaim.billed_amount}
                  </div>
                  <div>
                    <span className="font-medium">Paid:</span> ${selectedClaim.paid_amount || 0}
                  </div>
                  <div>
                    <span className="font-medium">Balance:</span> $
                    {calculateBalance().toFixed(2)}
                  </div>
                  <div>
                    <span className="font-medium">Status:</span> {selectedClaim.claim_status}
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {/* Payment Date */}
              <FormField
                control={form.control}
                name="paymentDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Payment Amount */}
              <FormField
                control={form.control}
                name="paymentAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Amount</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Payment Method */}
              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Check">Check</SelectItem>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Credit Card">Credit Card</SelectItem>
                        <SelectItem value="ACH">ACH</SelectItem>
                        <SelectItem value="Wire Transfer">Wire Transfer</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Check Number */}
              <FormField
                control={form.control}
                name="checkNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Check/Reference Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Posting Type */}
            <FormField
              control={form.control}
              name="postingType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Posting Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Insurance Payment">Insurance Payment</SelectItem>
                      <SelectItem value="Patient Payment">Patient Payment</SelectItem>
                      <SelectItem value="Adjustment">Adjustment</SelectItem>
                      <SelectItem value="Refund">Refund</SelectItem>
                      <SelectItem value="Write-off">Write-off</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Adjustments Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <FormLabel>Adjustments (Optional)</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    appendAdjustment({
                      adjustmentGroup: 'CO',
                      adjustmentCode: '',
                      adjustmentAmount: 0,
                      adjustmentReason: '',
                    })
                  }
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Adjustment
                </Button>
              </div>

              {adjustmentFields.map((field, index) => (
                <Card key={field.id}>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-12 gap-4">
                      <div className="col-span-3">
                        <FormField
                          control={form.control}
                          name={`adjustments.${index}.adjustmentGroup`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Group</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="CO">CO - Contractual</SelectItem>
                                  <SelectItem value="PR">PR - Patient Resp</SelectItem>
                                  <SelectItem value="OA">OA - Other</SelectItem>
                                  <SelectItem value="PI">PI - Payer Initiated</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="col-span-3">
                        <FormField
                          control={form.control}
                          name={`adjustments.${index}.adjustmentCode`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Code</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., 45" {...field} />
                              </FormControl>
                              <FormDescription className="text-xs">
                                {field.value && getCARCDescription(field.value)}
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="col-span-2">
                        <FormField
                          control={form.control}
                          name={`adjustments.${index}.adjustmentAmount`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Amount</FormLabel>
                              <FormControl>
                                <Input type="number" step="0.01" placeholder="0.00" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="col-span-3">
                        <FormField
                          control={form.control}
                          name={`adjustments.${index}.adjustmentReason`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Reason</FormLabel>
                              <FormControl>
                                <Input placeholder="Optional" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="col-span-1 flex items-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeAdjustment(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Optional notes about this payment..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit Button */}
            <div className="flex gap-2">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Posting Payment...
                  </>
                ) : (
                  <>
                    <DollarSign className="mr-2 h-4 w-4" />
                    Post Payment
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset();
                  setSelectedClaim(null);
                }}
              >
                Clear
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
