import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Calendar, FileText } from 'lucide-react';
import { format } from 'date-fns';

interface ProgressReviewSectionProps {
  data: {
    progressSummary?: string;
    reviewDate?: string;
    nextReviewDate?: string;
    versionNumber: number;
    lastModified?: string;
    lastModifiedBy?: string;
    status: string;
  };
  onChange: (data: any) => void;
  disabled?: boolean;
}

export function ProgressReviewSection({ data, onChange, disabled }: ProgressReviewSectionProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Progress Review & Plan Status</h3>
        <p className="text-sm text-muted-foreground">
          Document treatment progress and plan review information
        </p>
      </div>

      <Card className="p-4 bg-muted/50">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Plan Version</p>
              <p className="text-sm text-muted-foreground">Version {data.versionNumber}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant={
              data.status === 'Active' ? 'default' :
              data.status === 'Under Review' ? 'secondary' :
              data.status === 'Completed' ? 'outline' : 'destructive'
            }>
              {data.status}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Review Date</p>
              <p className="text-sm text-muted-foreground">
                {data.reviewDate ? format(new Date(data.reviewDate), 'MMM d, yyyy') : 'Not set'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Next Review Due</p>
              <p className="text-sm text-muted-foreground">
                {data.nextReviewDate ? format(new Date(data.nextReviewDate), 'MMM d, yyyy') : 'Not scheduled'}
              </p>
            </div>
          </div>
        </div>

        {data.lastModified && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              Last modified: {format(new Date(data.lastModified), 'MMM d, yyyy h:mm a')}
            </p>
          </div>
        )}
      </Card>

      <div>
        <Label htmlFor="review-date">Current Review Date</Label>
        <Input
          id="review-date"
          type="date"
          value={data.reviewDate || ''}
          onChange={(e) => {
            const reviewDate = e.target.value;
            // Auto-calculate next review date (90 days from review date)
            let nextReviewDate = '';
            if (reviewDate) {
              const date = new Date(reviewDate);
              date.setDate(date.getDate() + 90);
              nextReviewDate = date.toISOString().split('T')[0];
            }
            onChange({
              ...data,
              reviewDate,
              nextReviewDate
            });
          }}
          disabled={disabled}
          className="mt-2"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Next review will be automatically set to 90 days from this date
        </p>
      </div>

      <div>
        <Label htmlFor="next-review-date">Next Review Date (Required - Max 90 days)</Label>
        <Input
          id="next-review-date"
          type="date"
          value={data.nextReviewDate || ''}
          max={(() => {
            const maxDate = new Date();
            maxDate.setDate(maxDate.getDate() + 90);
            return maxDate.toISOString().split('T')[0];
          })()}
          onChange={(e) => {
            const selectedDate = e.target.value;
            const today = new Date();
            const maxDate = new Date();
            maxDate.setDate(maxDate.getDate() + 90);
            const selected = new Date(selectedDate);
            
            if (selected > maxDate) {
              // Don't allow dates beyond 90 days
              return;
            }
            
            onChange({ ...data, nextReviewDate: selectedDate });
          }}
          disabled={disabled}
          className="mt-2"
          required
        />
        <p className="text-xs text-muted-foreground mt-1">
          Treatment plans must be reviewed at least every 3 months (90 days)
        </p>
      </div>

      <div>
        <Label htmlFor="progress-summary">Progress Summary</Label>
        <Textarea
          id="progress-summary"
          value={data.progressSummary || ''}
          onChange={(e) => onChange({ ...data, progressSummary: e.target.value })}
          placeholder="Summarize the client's progress toward treatment goals, changes in symptoms, response to interventions, and any adjustments made to the treatment plan..."
          rows={8}
          disabled={disabled}
          className="mt-2"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Update this section during plan reviews to document progress and treatment effectiveness
        </p>
      </div>
    </div>
  );
}
