import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SessionInformationProps {
  data: any;
  onChange: (data: any) => void;
}

export function SessionInformationSection({ data, onChange }: SessionInformationProps) {
  const handleChange = (field: string, value: any) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Session Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="sessionDate">Session Date *</Label>
            <Input
              id="sessionDate"
              type="date"
              value={data.sessionDate || ''}
              onChange={(e) => handleChange('sessionDate', e.target.value)}
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
              required
            />
          </div>
        </div>

        <div>
          <Label htmlFor="sessionLocation">Session Location *</Label>
          <Select
            value={data.sessionLocation || 'Office'}
            onValueChange={(value) => handleChange('sessionLocation', value)}
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
      </CardContent>
    </Card>
  );
}
