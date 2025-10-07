import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { ProgressTracker } from '@/hooks/usePortalProgress';
import { format } from 'date-fns';

interface AddTrackerEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tracker: ProgressTracker;
  onSubmit: (data: {
    entryDate: string;
    entryTime?: string;
    data: any;
    notes?: string;
  }) => Promise<void>;
}

export function AddTrackerEntryDialog({ open, onOpenChange, tracker, onSubmit }: AddTrackerEntryDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [entryDate, setEntryDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [entryTime, setEntryTime] = useState(format(new Date(), 'HH:mm'));
  const [notes, setNotes] = useState('');
  
  // Type-specific state
  const [symptomRatings, setSymptomRatings] = useState<Record<string, number>>({});
  const [mood, setMood] = useState('');
  const [moodIntensity, setMoodIntensity] = useState([5]);
  const [journalEntry, setJournalEntry] = useState('');
  const [goalProgress, setGoalProgress] = useState([0]);
  const [homeworkCompleted, setHomeworkCompleted] = useState(false);
  const [customData, setCustomData] = useState<Record<string, any>>({});

  const handleSubmit = async () => {
    try {
      setLoading(true);
      
      let entryData: any = {};
      
      switch (tracker.trackerType) {
        case 'Symptom Tracker':
          entryData = { symptomRatings };
          break;
        case 'Mood Log':
          entryData = { mood, intensity: moodIntensity[0] };
          break;
        case 'Journal':
          entryData = { entry: journalEntry };
          break;
        case 'Goal Progress':
          entryData = { progress: goalProgress[0] };
          break;
        case 'Homework Assignment':
          entryData = { completed: homeworkCompleted };
          break;
        case 'Custom':
          entryData = customData;
          break;
      }
      
      await onSubmit({
        entryDate,
        entryTime,
        data: entryData,
        notes: notes || undefined,
      });
      
      toast({
        title: 'Success',
        description: 'Entry added successfully',
      });
      
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add entry',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const renderFormFields = () => {
    switch (tracker.trackerType) {
      case 'Symptom Tracker':
        return (
          <div className="space-y-4">
            {tracker.symptoms?.map((symptom) => (
              <div key={symptom.symptomName} className="space-y-2">
                <div className="flex justify-between">
                  <Label>{symptom.symptomName}</Label>
                  <span className="text-sm text-muted-foreground">
                    {symptomRatings[symptom.symptomName] || 0}
                  </span>
                </div>
                <Slider
                  min={0}
                  max={10}
                  step={1}
                  value={[symptomRatings[symptom.symptomName] || 0]}
                  onValueChange={(value) => 
                    setSymptomRatings({ ...symptomRatings, [symptom.symptomName]: value[0] })
                  }
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>None</span>
                  <span>Severe</span>
                </div>
              </div>
            ))}
          </div>
        );
      
      case 'Mood Log':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Mood</Label>
              <Select value={mood} onValueChange={setMood}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your mood" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Happy">😊 Happy</SelectItem>
                  <SelectItem value="Sad">😢 Sad</SelectItem>
                  <SelectItem value="Anxious">😰 Anxious</SelectItem>
                  <SelectItem value="Angry">😠 Angry</SelectItem>
                  <SelectItem value="Neutral">😐 Neutral</SelectItem>
                  <SelectItem value="Excited">🤩 Excited</SelectItem>
                  <SelectItem value="Calm">😌 Calm</SelectItem>
                  <SelectItem value="Stressed">😖 Stressed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Intensity</Label>
                <span className="text-sm text-muted-foreground">{moodIntensity[0]}/10</span>
              </div>
              <Slider
                min={1}
                max={10}
                step={1}
                value={moodIntensity}
                onValueChange={setMoodIntensity}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Low</span>
                <span>High</span>
              </div>
            </div>
          </div>
        );
      
      case 'Journal':
        return (
          <div className="space-y-2">
            <Label>Journal Entry</Label>
            <Textarea
              placeholder="Write your thoughts here..."
              value={journalEntry}
              onChange={(e) => setJournalEntry(e.target.value)}
              rows={6}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">
              {journalEntry.length} characters
            </p>
          </div>
        );
      
      case 'Goal Progress':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Progress</Label>
                <span className="text-sm text-muted-foreground">{goalProgress[0]}%</span>
              </div>
              <Slider
                min={0}
                max={100}
                step={5}
                value={goalProgress}
                onValueChange={setGoalProgress}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Not Started</span>
                <span>Completed</span>
              </div>
            </div>
          </div>
        );
      
      case 'Homework Assignment':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id="completed"
              checked={homeworkCompleted}
              onCheckedChange={(checked) => setHomeworkCompleted(checked === true)}
            />
            <label
              htmlFor="completed"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Mark as completed
            </label>
          </div>
        );
      
      case 'Custom':
        return (
          <div className="space-y-2">
            <Label>Data</Label>
            <Textarea
              placeholder="Enter tracker data..."
              value={JSON.stringify(customData, null, 2)}
              onChange={(e) => {
                try {
                  setCustomData(JSON.parse(e.target.value));
                } catch (error) {
                  // Invalid JSON, ignore
                }
              }}
              rows={4}
            />
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Entry: {tracker.trackerTitle}</DialogTitle>
          <DialogDescription>
            Record your {tracker.trackerType.toLowerCase()} for {format(new Date(entryDate), 'MMMM d, yyyy')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <Input
                id="time"
                type="time"
                value={entryTime}
                onChange={(e) => setEntryTime(e.target.value)}
              />
            </div>
          </div>
          
          {/* Type-specific fields */}
          {renderFormFields()}
          
          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Saving...' : 'Save Entry'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
