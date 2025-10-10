import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format, differenceInYears } from 'date-fns';
import { cn } from '@/lib/utils';

interface ClientBasicInfoProps {
  formData: any;
  setFormData: (data: any) => void;
}

export function ClientBasicInfo({ formData, setFormData }: ClientBasicInfoProps) {
  const calculateAge = (dob: Date | undefined): number | null => {
    if (!dob) return null;
    return differenceInYears(new Date(), dob);
  };

  const age = calculateAge(formData.dateOfBirth);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name *</Label>
          <Input
            id="firstName"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="middleName">Middle Name</Label>
          <Input
            id="middleName"
            value={formData.middleName}
            onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name *</Label>
          <Input
            id="lastName"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            required
          />
        </div>

      <div className="space-y-2">
        <Label htmlFor="suffix">Suffix</Label>
        <Select
          value={formData.suffix}
          onValueChange={(value) => setFormData({ ...formData, suffix: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select suffix" />
          </SelectTrigger>
          <SelectContent className="bg-card border z-50">
            <SelectItem value="">None</SelectItem>
            <SelectItem value="Jr.">Jr.</SelectItem>
            <SelectItem value="Sr.">Sr.</SelectItem>
            <SelectItem value="II">II</SelectItem>
            <SelectItem value="III">III</SelectItem>
            <SelectItem value="IV">IV</SelectItem>
            <SelectItem value="V">V</SelectItem>
            <SelectItem value="Esq.">Esq.</SelectItem>
            <SelectItem value="PhD">PhD</SelectItem>
            <SelectItem value="MD">MD</SelectItem>
          </SelectContent>
        </Select>
      </div>

        <div className="space-y-2">
          <Label htmlFor="preferredName">Preferred Name</Label>
          <Input
            id="preferredName"
            value={formData.preferredName}
            onChange={(e) => setFormData({ ...formData, preferredName: e.target.value })}
          />
        </div>

      <div className="space-y-2">
        <Label htmlFor="pronouns">Pronouns</Label>
        <Select
          value={formData.pronouns}
          onValueChange={(value) => setFormData({ ...formData, pronouns: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select pronouns" />
          </SelectTrigger>
          <SelectContent className="bg-card border z-50">
            <SelectItem value="He/Him">He/Him</SelectItem>
            <SelectItem value="She/Her">She/Her</SelectItem>
            <SelectItem value="They/Them">They/Them</SelectItem>
            <SelectItem value="He/They">He/They</SelectItem>
            <SelectItem value="She/They">She/They</SelectItem>
            <SelectItem value="Ze/Zir">Ze/Zir</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
            <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>

    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Previous Names</h3>
      <p className="text-sm text-muted-foreground">Add any previous names (maiden name, previous surnames, etc.)</p>
      {formData.previousNames?.map((name: string, index: number) => (
        <div key={index} className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => {
              const updated = [...formData.previousNames];
              updated[index] = e.target.value;
              setFormData({ ...formData, previousNames: updated });
            }}
            placeholder="Previous name"
          />
          <Button
            variant="outline"
            onClick={() => {
              const updated = formData.previousNames.filter((_: any, i: number) => i !== index);
              setFormData({ ...formData, previousNames: updated });
            }}
          >
            Remove
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        onClick={() => {
          setFormData({ ...formData, previousNames: [...(formData.previousNames || []), ''] });
        }}
      >
        Add Previous Name
      </Button>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label>Date of Birth *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !formData.dateOfBirth && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.dateOfBirth ? format(formData.dateOfBirth, 'PPP') : 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-card border z-50" align="start">
              <Calendar
                mode="single"
                selected={formData.dateOfBirth}
                onSelect={(date) => setFormData({ ...formData, dateOfBirth: date })}
                initialFocus
                className="pointer-events-auto"
                captionLayout="dropdown-buttons"
                fromYear={1900}
                toYear={new Date().getFullYear()}
              />
            </PopoverContent>
          </Popover>
        </div>

        {formData.dateOfBirth && (
          <div className="space-y-2">
            <Label>Age</Label>
            <div className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm">
              {age} years old
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
