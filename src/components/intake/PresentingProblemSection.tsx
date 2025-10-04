import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface PresentingProblemProps {
  data: any;
  onChange: (data: any) => void;
}

export function PresentingProblemSection({ data, onChange }: PresentingProblemProps) {
  const handleChange = (field: string, value: any) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Chief Complaint</CardTitle>
          <CardDescription>Client's primary reason for seeking services</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={data.chiefComplaint || ''}
            onChange={(e) => handleChange('chiefComplaint', e.target.value)}
            placeholder="Client's stated reason for seeking treatment..."
            rows={3}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>History of Presenting Problem</CardTitle>
          <CardDescription>Detailed narrative of symptom development and progression</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Detailed History</Label>
            <Textarea
              value={data.historyOfPresentingProblem || ''}
              onChange={(e) => handleChange('historyOfPresentingProblem', e.target.value)}
              placeholder="Include onset, duration, severity, precipitating factors, exacerbating and alleviating factors..."
              rows={8}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
