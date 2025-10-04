import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SessionInformationProps {
  data: any;
  onChange: (data: any) => void;
  cptCode?: string;
  onCptCodeChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}

export function SessionInformationSection({ data, onChange, cptCode, onCptCodeChange, disabled }: SessionInformationProps) {
  const [serviceCodes, setServiceCodes] = useState<any[]>([]);

  const handleChange = (field: string, value: any) => {
    onChange({ ...data, [field]: value });
  };

  useEffect(() => {
    const fetchServiceCodes = async () => {
      const { data: codes, error } = await supabase
        .from('service_codes')
        .select('*')
        .eq('is_active', true)
        .order('service_type')
        .order('code');
      if (!error && codes) setServiceCodes(codes);
    };
    fetchServiceCodes();
  }, []);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="sessionDate">Session Date *</Label>
          <Input
            id="sessionDate"
            type="date"
            value={data.sessionDate || ''}
            onChange={(e) => handleChange('sessionDate', e.target.value)}
            disabled={disabled}
            required
          />
        </div>

        <div>
          <Label htmlFor="startTime">Start Time *</Label>
          <Input
            id="startTime"
            type="time"
            value={data.sessionStartTime || ''}
            onChange={(e) => handleChange('sessionStartTime', e.target.value)}
            disabled={disabled}
            required
          />
        </div>

        <div>
          <Label htmlFor="endTime">End Time *</Label>
          <Input
            id="endTime"
            type="time"
            value={data.sessionEndTime || ''}
            onChange={(e) => handleChange('sessionEndTime', e.target.value)}
            disabled={disabled}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="cptCode">CPT Code</Label>
          <Select
            value={cptCode || undefined}
            onValueChange={(value) => onCptCodeChange?.({ target: { value } } as any)}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select service code" />
            </SelectTrigger>
            <SelectContent>
              {serviceCodes.map((service) => (
                <SelectItem key={service.id} value={service.code}>
                  {service.code} - {service.description}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="sessionLocation">Session Location *</Label>
          <Select
            value={data.sessionLocation || 'Office'}
            onValueChange={(value) => handleChange('sessionLocation', value)}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Office">Office</SelectItem>
              <SelectItem value="Telehealth">Telehealth</SelectItem>
              <SelectItem value="Home">Home</SelectItem>
              <SelectItem value="School">School</SelectItem>
              <SelectItem value="Hospital">Hospital</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
