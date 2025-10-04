import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface MentalStatusExamProps {
  data: any;
  onChange: (data: any) => void;
}

export function MentalStatusExamSection({ data, onChange }: MentalStatusExamProps) {
  const handleChange = (section: string, field: string, value: any) => {
    onChange({
      ...data,
      [section]: {
        ...(data[section] || {}),
        [field]: value
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mental Status Examination</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="appearance" className="space-y-4">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="behavior">Behavior</TabsTrigger>
            <TabsTrigger value="speech">Speech</TabsTrigger>
            <TabsTrigger value="thought">Thought</TabsTrigger>
          </TabsList>

          <TabsContent value="appearance" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Grooming</Label>
                <Select
                  value={data.appearance?.grooming}
                  onValueChange={(v) => handleChange('appearance', 'grooming', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Well-groomed">Well-groomed</SelectItem>
                    <SelectItem value="Disheveled">Disheveled</SelectItem>
                    <SelectItem value="Unkempt">Unkempt</SelectItem>
                    <SelectItem value="Appropriate">Appropriate</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Hygiene</Label>
                <Select
                  value={data.appearance?.hygiene}
                  onValueChange={(v) => handleChange('appearance', 'hygiene', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Good">Good</SelectItem>
                    <SelectItem value="Fair">Fair</SelectItem>
                    <SelectItem value="Poor">Poor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Dress</Label>
                <Select
                  value={data.appearance?.dress}
                  onValueChange={(v) => handleChange('appearance', 'dress', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Appropriate">Appropriate</SelectItem>
                    <SelectItem value="Inappropriate">Inappropriate</SelectItem>
                    <SelectItem value="Unusual">Unusual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="behavior" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Eye Contact</Label>
                <Select
                  value={data.behavior?.eyeContact}
                  onValueChange={(v) => handleChange('behavior', 'eyeContact', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Good">Good</SelectItem>
                    <SelectItem value="Minimal">Minimal</SelectItem>
                    <SelectItem value="Excessive">Excessive</SelectItem>
                    <SelectItem value="Avoidant">Avoidant</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Motor Activity</Label>
                <Select
                  value={data.behavior?.motorActivity}
                  onValueChange={(v) => handleChange('behavior', 'motorActivity', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Normal">Normal</SelectItem>
                    <SelectItem value="Restless">Restless</SelectItem>
                    <SelectItem value="Agitated">Agitated</SelectItem>
                    <SelectItem value="Retarded">Retarded</SelectItem>
                    <SelectItem value="Hyperactive">Hyperactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="speech" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Rate</Label>
                <Select
                  value={data.speech?.rate}
                  onValueChange={(v) => handleChange('speech', 'rate', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Normal">Normal</SelectItem>
                    <SelectItem value="Slow">Slow</SelectItem>
                    <SelectItem value="Rapid">Rapid</SelectItem>
                    <SelectItem value="Pressured">Pressured</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Volume</Label>
                <Select
                  value={data.speech?.volume}
                  onValueChange={(v) => handleChange('speech', 'volume', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Normal">Normal</SelectItem>
                    <SelectItem value="Loud">Loud</SelectItem>
                    <SelectItem value="Soft">Soft</SelectItem>
                    <SelectItem value="Mute">Mute</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="thought" className="space-y-4">
            <div>
              <Label>Mood (Subjective)</Label>
              <Textarea
                value={data.mood || ''}
                onChange={(e) => onChange({ ...data, mood: e.target.value })}
                placeholder="Client's description of their mood..."
                rows={2}
              />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
