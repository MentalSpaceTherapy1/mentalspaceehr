import { FormField } from '@/types/forms';
import { UseFormReturn } from 'react-hook-form';
import {
  FormControl,
  FormDescription,
  FormField as ShadcnFormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface FormFieldRendererProps {
  field: FormField;
  form: UseFormReturn<any>;
}

export const FormFieldRenderer = ({ field, form }: FormFieldRendererProps) => {
  const validateField = (value: any) => {
    if (field.required && !value) {
      return 'This field is required';
    }

    if (field.validation) {
      const { minLength, maxLength, pattern } = field.validation;

      if (minLength && value.length < minLength) {
        return `Minimum length is ${minLength} characters`;
      }

      if (maxLength && value.length > maxLength) {
        return `Maximum length is ${maxLength} characters`;
      }

      if (pattern && !new RegExp(pattern).test(value)) {
        return 'Invalid format';
      }
    }

    return true;
  };

  return (
    <ShadcnFormField
      control={form.control}
      name={field.id}
      rules={{ validate: validateField }}
      render={({ field: formField }) => (
        <FormItem>
          <FormLabel>
            {field.label}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </FormLabel>

          <FormControl>
            {field.type === 'text' && (
              <Input
                {...formField}
                placeholder={field.label}
              />
            )}

            {field.type === 'textarea' && (
              <Textarea
                {...formField}
                placeholder={field.label}
                rows={4}
              />
            )}

            {field.type === 'select' && (
              <Select
                value={formField.value}
                onValueChange={formField.onChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                  {field.options?.map(option => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {field.type === 'checkbox' && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={formField.value}
                  onCheckedChange={formField.onChange}
                />
                <label className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  I agree
                </label>
              </div>
            )}

            {field.type === 'radio' && (
              <RadioGroup
                value={formField.value}
                onValueChange={formField.onChange}
              >
                {field.options?.map(option => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`${field.id}-${option}`} />
                    <label
                      htmlFor={`${field.id}-${option}`}
                      className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {option}
                    </label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {field.type === 'date' && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !formField.value && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formField.value ? (
                      format(new Date(formField.value), 'PPP')
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formField.value ? new Date(formField.value) : undefined}
                    onSelect={(date) => {
                      formField.onChange(date?.toISOString());
                    }}
                    disabled={(date) => {
                      if (field.validation?.maxDate === 'today' && date > new Date()) {
                        return true;
                      }
                      return false;
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            )}
          </FormControl>

          <FormMessage />
        </FormItem>
      )}
    />
  );
};
