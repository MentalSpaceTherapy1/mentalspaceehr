import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const serviceCodeSchema = z.object({
  service_type: z.string().min(1, 'Service type is required'),
  code: z.string().min(1, 'Service code is required'),
  description: z.string().min(1, 'Description is required'),
  default_modifiers: z.string().optional(),
  duration_minutes: z.coerce.number().optional().nullable(),
  standard_rate: z.coerce.number().optional().nullable(),
  is_addon: z.boolean(),
  include_in_claims: z.boolean(),
  is_default_for_type: z.boolean(),
  time_units_billing: z.enum(['per_session', 'per_time_unit']),
  time_units_minutes: z.coerce.number().optional().nullable(),
});

type ServiceCodeFormData = z.infer<typeof serviceCodeSchema>;

interface ServiceCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceCode?: any;
  onSave: () => void;
}

const serviceTypes = [
  'Therapy Intake',
  'Therapy Session',
  'Group Therapy',
  'Psychological Evaluation',
  'Consultation',
  'Family Therapy',
  'Couples Therapy',
  'Psychiatric Evaluation',
  'Medication Management',
];

export function ServiceCodeDialog({
  open,
  onOpenChange,
  serviceCode,
  onSave,
}: ServiceCodeDialogProps) {
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const form = useForm<ServiceCodeFormData>({
    resolver: zodResolver(serviceCodeSchema),
    defaultValues: {
      service_type: 'Therapy Session',
      code: '',
      description: '',
      default_modifiers: '',
      duration_minutes: null,
      standard_rate: null,
      is_addon: false,
      include_in_claims: true,
      is_default_for_type: false,
      time_units_billing: 'per_session',
      time_units_minutes: null,
    },
  });

  useEffect(() => {
    if (serviceCode) {
      form.reset({
        service_type: serviceCode.service_type,
        code: serviceCode.code,
        description: serviceCode.description,
        default_modifiers: serviceCode.default_modifiers || '',
        duration_minutes: serviceCode.duration_minutes,
        standard_rate: serviceCode.standard_rate,
        is_addon: serviceCode.is_addon,
        include_in_claims: serviceCode.include_in_claims,
        is_default_for_type: serviceCode.is_default_for_type,
        time_units_billing: serviceCode.time_units_billing,
        time_units_minutes: serviceCode.time_units_minutes,
      });
    } else {
      form.reset({
        service_type: 'Therapy Session',
        code: '',
        description: '',
        default_modifiers: '',
        duration_minutes: null,
        standard_rate: null,
        is_addon: false,
        include_in_claims: true,
        is_default_for_type: false,
        time_units_billing: 'per_session',
        time_units_minutes: null,
      });
    }
  }, [serviceCode, form, open]);

  const onSubmit = async (data: ServiceCodeFormData) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const payload: any = {
        service_type: data.service_type,
        code: data.code,
        description: data.description,
        default_modifiers: data.default_modifiers || null,
        duration_minutes: data.duration_minutes || null,
        standard_rate: data.standard_rate || null,
        is_addon: data.is_addon,
        include_in_claims: data.include_in_claims,
        is_default_for_type: data.is_default_for_type,
        time_units_billing: data.time_units_billing,
        time_units_minutes: data.time_units_billing === 'per_time_unit' ? data.time_units_minutes : null,
        is_active: true,
      };

      if (serviceCode) {
        const { error } = await supabase
          .from('service_codes')
          .update(payload)
          .eq('id', serviceCode.id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Service code updated successfully',
        });
      } else {
        payload.created_by = user?.id;
        
        const { error } = await supabase
          .from('service_codes')
          .insert([payload]);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Service code added successfully',
        });
      }

      onSave();
    } catch (error) {
      console.error('Error saving service code:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save service code',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {serviceCode ? 'Edit Service Code' : 'Add a New Service Code'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="service_type"
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
                      {serviceTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Code</FormLabel>
                    <FormControl>
                      <Input placeholder="CPT® or other" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_addon"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2 space-y-0 pt-8">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal">This is an add-on code</FormLabel>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="include_in_claims"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="font-normal">
                    Include service code description with electronic claims
                  </FormLabel>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_default_for_type"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="font-normal">
                    Use as default code for {form.watch('service_type')} appointments
                  </FormLabel>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="standard_rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Standard Rate</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          className="pl-7"
                          {...field}
                          value={field.value || ''}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="duration_minutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Appointment Duration</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="number"
                          placeholder="minutes"
                          {...field}
                          value={field.value || ''}
                        />
                        <span className="absolute right-3 top-2.5 text-sm text-muted-foreground">
                          minutes
                        </span>
                      </div>
                    </FormControl>
                    <FormDescription className="text-xs">
                      Leave blank for no default
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="time_units_billing"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Time Units</FormLabel>
                  <FormDescription className="text-xs">
                    Use this to set up codes where multiple units of the service are billed based
                    on the time spent on a single service
                  </FormDescription>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex flex-col space-y-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="per_session" id="per_session" />
                        <Label htmlFor="per_session" className="font-normal">
                          Always bill for 1 unit of this service per session
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="per_time_unit" id="per_time_unit" />
                        <Label htmlFor="per_time_unit" className="font-normal">
                          Bill for 1 unit for every
                        </Label>
                        <FormField
                          control={form.control}
                          name="time_units_minutes"
                          render={({ field: minutesField }) => (
                            <Input
                              type="number"
                              className="w-20"
                              disabled={field.value !== 'per_time_unit'}
                              {...minutesField}
                              value={minutesField.value || ''}
                            />
                          )}
                        />
                        <Label className="font-normal">
                          minutes spent on this service during a single session
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="default_modifiers"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Modifiers</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., HJ, GT" {...field} />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Enter modifiers separated by spaces (e.g., HJ GT)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : serviceCode ? 'Update Service Code' : 'Add Service Code'}
              </Button>
            </DialogFooter>

            <div className="text-xs text-muted-foreground">
              All CPT® codes are copyright by the American Medical Association. CPT® is a
              registered trademark of the American Medical Association.
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
