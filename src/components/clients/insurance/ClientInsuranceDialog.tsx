import { useState, useEffect } from "react";
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
import { CalendarIcon, Upload, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const insuranceSchema = z.object({
  rank: z.enum(['Primary', 'Secondary', 'Tertiary']),
  insurance_company: z.string().min(1, "Insurance company is required"),
  insurance_company_id: z.string().optional(),
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
  subscriber_ssn: z.string().optional(),
  subscriber_address_street1: z.string().optional(),
  subscriber_address_street2: z.string().optional(),
  subscriber_address_city: z.string().optional(),
  subscriber_address_state: z.string().optional(),
  subscriber_address_zip: z.string().optional(),
  relationship_to_subscriber: z.enum(['Self', 'Spouse', 'Child', 'Other']).optional(),
  subscriber_employer: z.string().optional(),
  customer_service_phone: z.string().min(1, "Customer service phone is required"),
  precertification_phone: z.string().optional(),
  provider_phone: z.string().optional(),
  claims_address_street1: z.string().optional(),
  claims_address_street2: z.string().optional(),
  claims_address_city: z.string().optional(),
  claims_address_state: z.string().optional(),
  claims_address_zip: z.string().optional(),
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
  front_card_image: z.string().optional(),
  back_card_image: z.string().optional(),
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
  const [insuranceCompanies, setInsuranceCompanies] = useState<any[]>([]);
  const [frontImagePreview, setFrontImagePreview] = useState<string | null>(null);
  const [backImagePreview, setBackImagePreview] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchInsuranceCompanies();
  }, []);

  useEffect(() => {
    if (insurance?.front_card_image) {
      setFrontImagePreview(insurance.front_card_image);
    }
    if (insurance?.back_card_image) {
      setBackImagePreview(insurance.back_card_image);
    }
  }, [insurance]);

  const fetchInsuranceCompanies = async () => {
    const { data } = await supabase
      .from('insurance_companies')
      .select('*')
      .order('name');
    if (data) setInsuranceCompanies(data);
  };

  const handleFileUpload = async (file: File, type: 'front' | 'back') => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      if (type === 'front') {
        setFrontImagePreview(base64);
        form.setValue('front_card_image', base64);
      } else {
        setBackImagePreview(base64);
        form.setValue('back_card_image', base64);
      }
    };
    reader.readAsDataURL(file);
  };
  
  const form = useForm<InsuranceFormData>({
    resolver: zodResolver(insuranceSchema),
    defaultValues: insurance ? {
      ...insurance,
      effective_date: new Date(insurance.effective_date),
      termination_date: insurance.termination_date ? new Date(insurance.termination_date) : undefined,
      subscriber_dob: insurance.subscriber_dob ? new Date(insurance.subscriber_dob) : undefined,
      last_verification_date: insurance.last_verification_date ? new Date(insurance.last_verification_date) : undefined,
      subscriber_address_street1: insurance.subscriber_address?.street1 || "",
      subscriber_address_street2: insurance.subscriber_address?.street2 || "",
      subscriber_address_city: insurance.subscriber_address?.city || "",
      subscriber_address_state: insurance.subscriber_address?.state || "",
      subscriber_address_zip: insurance.subscriber_address?.zip || "",
      claims_address_street1: insurance.claims_address?.street1 || "",
      claims_address_street2: insurance.claims_address?.street2 || "",
      claims_address_city: insurance.claims_address?.city || "",
      claims_address_state: insurance.claims_address?.state || "",
      claims_address_zip: insurance.claims_address?.zip || "",
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
      const subscriberAddress = data.subscriber_address_street1 ? {
        street1: data.subscriber_address_street1,
        street2: data.subscriber_address_street2 || null,
        city: data.subscriber_address_city || null,
        state: data.subscriber_address_state || null,
        zip: data.subscriber_address_zip || null,
      } : null;

      const claimsAddress = data.claims_address_street1 ? {
        street1: data.claims_address_street1,
        street2: data.claims_address_street2 || null,
        city: data.claims_address_city || null,
        state: data.claims_address_state || null,
        zip: data.claims_address_zip || null,
      } : null;
      
      const insuranceData = {
        client_id: clientId,
        rank: data.rank,
        insurance_company: data.insurance_company,
        insurance_company_id: data.insurance_company_id || null,
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
        subscriber_ssn: data.subscriber_ssn || null,
        subscriber_address: subscriberAddress,
        relationship_to_subscriber: data.relationship_to_subscriber || null,
        subscriber_employer: data.subscriber_employer || null,
        customer_service_phone: data.customer_service_phone,
        precertification_phone: data.precertification_phone || null,
        provider_phone: data.provider_phone || null,
        claims_address: claimsAddress,
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
        last_verified_by: data.last_verification_date ? user?.id : null,
        verification_notes: data.verification_notes || null,
        remaining_sessions_this_year: data.remaining_sessions_this_year ? parseInt(data.remaining_sessions_this_year) : null,
        front_card_image: data.front_card_image || null,
        back_card_image: data.back_card_image || null,
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
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="subscriber">Subscriber</TabsTrigger>
                <TabsTrigger value="coverage">Coverage</TabsTrigger>
                <TabsTrigger value="verification">Verification</TabsTrigger>
                <TabsTrigger value="details">Additional</TabsTrigger>
                <TabsTrigger value="images">Card Images</TabsTrigger>
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
                      <Select
                        onValueChange={(value) => {
                          const company = insuranceCompanies.find(c => c.name === value);
                          field.onChange(value);
                          if (company) {
                            form.setValue('insurance_company_id', company.id);
                          }
                        }}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select insurance company" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {insuranceCompanies.map((company) => (
                            <SelectItem key={company.id} value={company.name}>
                              {company.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Or type manually: <Input {...field} placeholder="e.g., Blue Cross Blue Shield" className="mt-2" />
                      </FormDescription>
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

                <div className="grid grid-cols-3 gap-4">
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

                  <FormField
                    control={form.control}
                    name="precertification_phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Precertification Phone (Optional)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="(555) 555-5555" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="provider_phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Provider Phone (Optional)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="(555) 555-5555" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
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
                        name="subscriber_dob"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Subscriber Date of Birth</FormLabel>
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
                        name="subscriber_ssn"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Subscriber SSN (Optional)</FormLabel>
                            <FormControl>
                              <Input {...field} type="password" placeholder="XXX-XX-XXXX" maxLength={11} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-medium">Subscriber Address</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="subscriber_address_street1"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Street Address 1</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="123 Main St" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="subscriber_address_street2"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Street Address 2 (Optional)</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Apt 4B" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="subscriber_address_city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>City</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="subscriber_address_state"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>State</FormLabel>
                              <FormControl>
                                <Input {...field} maxLength={2} placeholder="CA" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="subscriber_address_zip"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>ZIP Code</FormLabel>
                              <FormControl>
                                <Input {...field} maxLength={10} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
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

              <TabsContent value="details" className="space-y-4">
                <h4 className="font-medium">Claims Mailing Address</h4>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="claims_address_street1"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Street Address 1</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="PO Box 1234" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="claims_address_street2"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Street Address 2 (Optional)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Suite 100" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="claims_address_city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="claims_address_state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <FormControl>
                          <Input {...field} maxLength={2} placeholder="CA" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="claims_address_zip"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ZIP Code</FormLabel>
                        <FormControl>
                          <Input {...field} maxLength={10} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="images" className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Front of Insurance Card</h4>
                    {frontImagePreview ? (
                      <div className="relative">
                        <img src={frontImagePreview} alt="Front of card" className="max-w-md rounded border" />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2"
                          onClick={() => {
                            setFrontImagePreview(null);
                            form.setValue('front_card_image', '');
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed rounded-lg p-8 text-center">
                        <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file, 'front');
                          }}
                          className="max-w-xs mx-auto"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Back of Insurance Card</h4>
                    {backImagePreview ? (
                      <div className="relative">
                        <img src={backImagePreview} alt="Back of card" className="max-w-md rounded border" />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2"
                          onClick={() => {
                            setBackImagePreview(null);
                            form.setValue('back_card_image', '');
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed rounded-lg p-8 text-center">
                        <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file, 'back');
                          }}
                          className="max-w-xs mx-auto"
                        />
                      </div>
                    )}
                  </div>
                </div>
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
