import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const insuranceSchema = z.object({
  rank: z.enum(['Primary', 'Secondary', 'Tertiary']),
  insurance_company: z.string().min(1, "Insurance company is required"),
  plan_name: z.string().min(1, "Plan name is required"),
  plan_type: z.enum(['PPO', 'HMO', 'EPO', 'POS', 'Medicare', 'Medicaid', 'Military', 'Other']),
  member_id: z.string().min(1, "Member ID is required"),
  group_number: z.string().optional(),
  effective_date: z.date(),
  termination_date: z.date().optional(),
  subscriber_is_client: z.boolean().default(true),
  subscriber_first_name: z.string().optional(),
  subscriber_last_name: z.string().optional(),
  subscriber_dob: z.date().optional(),
  relationship_to_subscriber: z.enum(['Self', 'Spouse', 'Child', 'Other']).optional(),
  subscriber_employer: z.string().optional(),
  customer_service_phone: z.string().min(1, "Customer service phone is required"),
  precertification_phone: z.string().optional(),
  provider_phone: z.string().optional(),
  requires_referral: z.boolean().default(false),
  requires_prior_auth: z.boolean().default(false),
  mental_health_coverage: z.boolean().default(true),
  copay: z.string().optional(),
  coinsurance: z.string().optional(),
  deductible: z.string().optional(),
  deductible_met: z.string().optional(),
  out_of_pocket_max: z.string().optional(),
  out_of_pocket_met: z.string().optional(),
  last_verification_date: z.date().optional(),
  verification_notes: z.string().optional(),
  remaining_sessions_this_year: z.string().optional(),
});

type InsuranceFormData = z.infer<typeof insuranceSchema>;

interface ClientInsuranceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  insurance?: any;
  onSuccess: () => void;
}

export function ClientInsuranceDialog({ open, onOpenChange, clientId, insurance, onSuccess }: ClientInsuranceDialogProps) {
  const [loading, setLoading] = useState(false);
  
  const form = useForm<InsuranceFormData>({
    resolver: zodResolver(insuranceSchema),
    defaultValues: insurance ? {
      ...insurance,
      effective_date: new Date(insurance.effective_date),
      termination_date: insurance.termination_date ? new Date(insurance.termination_date) : undefined,
      subscriber_dob: insurance.subscriber_dob ? new Date(insurance.subscriber_dob) : undefined,
      last_verification_date: insurance.last_verification_date ? new Date(insurance.last_verification_date) : undefined,
      copay: insurance.copay?.toString() || "",
      coinsurance: insurance.coinsurance?.toString() || "",
      deductible: insurance.deductible?.toString() || "",
      deductible_met: insurance.deductible_met?.toString() || "",
      out_of_pocket_max: insurance.out_of_pocket_max?.toString() || "",
      out_of_pocket_met: insurance.out_of_pocket_met?.toString() || "",
      remaining_sessions_this_year: insurance.remaining_sessions_this_year?.toString() || "",
    } : {
      rank: 'Primary',
      insurance_company: '',
      plan_name: '',
      plan_type: 'PPO',
      member_id: '',
      customer_service_phone: '',
      subscriber_is_client: true,
      requires_referral: false,
      requires_prior_auth: false,
      mental_health_coverage: true,
      effective_date: new Date(),
    },
  });

  const subscriberIsClient = form.watch("subscriber_is_client");

  const onSubmit = async (data: InsuranceFormData) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const insuranceData = {
        client_id: clientId,
        rank: data.rank,
        insurance_company: data.insurance_company,
        plan_name: data.plan_name,
        plan_type: data.plan_type,
        member_id: data.member_id,
        group_number: data.group_number || null,
        effective_date: data.effective_date.toISOString().split('T')[0],
        termination_date: data.termination_date?.toISOString().split('T')[0] || null,
        subscriber_is_client: data.subscriber_is_client,
        subscriber_first_name: data.subscriber_first_name || null,
        subscriber_last_name: data.subscriber_last_name || null,
        subscriber_dob: data.subscriber_dob?.toISOString().split('T')[0] || null,
        relationship_to_subscriber: data.relationship_to_subscriber || null,
        subscriber_employer: data.subscriber_employer || null,
        customer_service_phone: data.customer_service_phone,
        precertification_phone: data.precertification_phone || null,
        provider_phone: data.provider_phone || null,
        requires_referral: data.requires_referral,
        requires_prior_auth: data.requires_prior_auth,
        mental_health_coverage: data.mental_health_coverage,
        copay: data.copay ? parseFloat(data.copay) : null,
        coinsurance: data.coinsurance ? parseFloat(data.coinsurance) : null,
        deductible: data.deductible ? parseFloat(data.deductible) : null,
        deductible_met: data.deductible_met ? parseFloat(data.deductible_met) : null,
        out_of_pocket_max: data.out_of_pocket_max ? parseFloat(data.out_of_pocket_max) : null,
        out_of_pocket_met: data.out_of_pocket_met ? parseFloat(data.out_of_pocket_met) : null,
        last_verification_date: data.last_verification_date?.toISOString().split('T')[0] || null,
        verification_notes: data.verification_notes || null,
        remaining_sessions_this_year: data.remaining_sessions_this_year ? parseInt(data.remaining_sessions_this_year) : null,
        [insurance ? 'updated_by' : 'created_by']: user?.id,
      };

      if (insurance) {
        const { error } = await supabase
          .from('client_insurance')
          .update(insuranceData)
          .eq('id', insurance.id);
        
        if (error) throw error;
        toast({ title: "Insurance updated successfully" });
      } else {
        const { error } = await supabase
          .from('client_insurance')
          .insert([insuranceData]);
        
        if (error) throw error;
        toast({ title: "Insurance added successfully" });
      }
      
      onSuccess();
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      console.error('Error saving insurance:', error);
      toast({
        title: "Error saving insurance",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{insurance ? 'Edit' : 'Add'} Insurance Information</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="subscriber">Subscriber</TabsTrigger>
                <TabsTrigger value="coverage">Coverage</TabsTrigger>
                <TabsTrigger value="verification">Verification</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="rank"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Insurance Rank</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select rank" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Primary">Primary</SelectItem>
                            <SelectItem value="Secondary">Secondary</SelectItem>
                            <SelectItem value="Tertiary">Tertiary</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="plan_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Plan Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select plan type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="PPO">PPO</SelectItem>
                            <SelectItem value="HMO">HMO</SelectItem>
                            <SelectItem value="EPO">EPO</SelectItem>
                            <SelectItem value="POS">POS</SelectItem>
                            <SelectItem value="Medicare">Medicare</SelectItem>
                            <SelectItem value="Medicaid">Medicaid</SelectItem>
                            <SelectItem value="Military">Military</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="insurance_company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Insurance Company</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., Blue Cross Blue Shield" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="plan_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plan Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., Silver Plan" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="member_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Member ID</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="group_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Group Number (Optional)</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="effective_date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Effective Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="termination_date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Termination Date (Optional)</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="customer_service_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Service Phone</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="(555) 555-5555" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="subscriber" className="space-y-4">
                <FormField
                  control={form.control}
                  name="subscriber_is_client"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Client is the subscriber</FormLabel>
                        <FormDescription>
                          Check this if the client is the primary policy holder
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                {!subscriberIsClient && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="subscriber_first_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Subscriber First Name</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="subscriber_last_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Subscriber Last Name</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="relationship_to_subscriber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Relationship to Subscriber</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select relationship" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Self">Self</SelectItem>
                                <SelectItem value="Spouse">Spouse</SelectItem>
                                <SelectItem value="Child">Child</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="subscriber_employer"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Subscriber Employer (Optional)</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="coverage" className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="requires_referral"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">Requires Referral</FormLabel>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="requires_prior_auth"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">Requires Prior Auth</FormLabel>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="mental_health_coverage"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">MH Coverage</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="copay"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Copay ($)</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" step="0.01" placeholder="0.00" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="coinsurance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Coinsurance (%)</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" step="1" placeholder="0" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="deductible"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Deductible ($)</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" step="0.01" placeholder="0.00" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="deductible_met"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Deductible Met ($)</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" step="0.01" placeholder="0.00" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="out_of_pocket_max"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Out of Pocket Max ($)</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" step="0.01" placeholder="0.00" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="out_of_pocket_met"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Out of Pocket Met ($)</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" step="0.01" placeholder="0.00" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="verification" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="last_verification_date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Last Verification Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="remaining_sessions_this_year"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Remaining Sessions This Year</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" placeholder="0" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="verification_notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Verification Notes</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={4} placeholder="Enter any notes from benefit verification..." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : insurance ? 'Update' : 'Add'} Insurance
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
