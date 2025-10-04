import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface HistorySectionProps {
  developmental: any;
  family: any;
  medical: any;
  substance: any;
  social: any;
  cultural: any;
  onDevelopmentalChange: (data: any) => void;
  onFamilyChange: (data: any) => void;
  onMedicalChange: (data: any) => void;
  onSubstanceChange: (data: any) => void;
  onSocialChange: (data: any) => void;
  onCulturalChange: (data: any) => void;
}

export function HistorySection({
  developmental,
  family,
  medical,
  substance,
  social,
  cultural,
  onDevelopmentalChange,
  onFamilyChange,
  onMedicalChange,
  onSubstanceChange,
  onSocialChange,
  onCulturalChange
}: HistorySectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>History</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="family" className="space-y-4">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="family">Family</TabsTrigger>
            <TabsTrigger value="medical">Medical</TabsTrigger>
            <TabsTrigger value="social">Social</TabsTrigger>
          </TabsList>

          <TabsContent value="family" className="space-y-4">
            <div>
              <Label>Family Mental Health History</Label>
              <Textarea
                value={family?.mentalHealthHistory || ''}
                onChange={(e) => onFamilyChange({ ...family, mentalHealthHistory: e.target.value })}
                placeholder="Note any family history of mental health conditions, substance use, suicide attempts..."
                rows={4}
              />
            </div>
            <div>
              <Label>Family Dynamics & Childhood Environment</Label>
              <Textarea
                value={family?.familyDynamics || ''}
                onChange={(e) => onFamilyChange({ ...family, familyDynamics: e.target.value })}
                placeholder="Describe family relationships, parenting style, stability, conflicts..."
                rows={4}
              />
            </div>
          </TabsContent>

          <TabsContent value="medical" className="space-y-4">
            <div>
              <Label>Current Medical Conditions</Label>
              <Textarea
                value={medical?.currentConditions || ''}
                onChange={(e) => onMedicalChange({ ...medical, currentConditions: e.target.value })}
                placeholder="List all current medical conditions..."
                rows={3}
              />
            </div>
            <div>
              <Label>Current Medications</Label>
              <Textarea
                value={medical?.currentMedications || ''}
                onChange={(e) => onMedicalChange({ ...medical, currentMedications: e.target.value })}
                placeholder="List all medications with dosages and prescribers..."
                rows={4}
              />
            </div>
            <div>
              <Label>Allergies</Label>
              <Textarea
                value={medical?.allergies || ''}
                onChange={(e) => onMedicalChange({ ...medical, allergies: e.target.value })}
                placeholder="List any medication, food, or environmental allergies..."
                rows={2}
              />
            </div>
          </TabsContent>

          <TabsContent value="social" className="space-y-4">
            <div>
              <Label>Relationship Status & Quality</Label>
              <Textarea
                value={social?.relationships || ''}
                onChange={(e) => onSocialChange({ ...social, relationships: e.target.value })}
                placeholder="Describe current relationships, support system, quality of relationships..."
                rows={3}
              />
            </div>
            <div>
              <Label>Employment & Education</Label>
              <Textarea
                value={social?.employment || ''}
                onChange={(e) => onSocialChange({ ...social, employment: e.target.value })}
                placeholder="Current employment status, job satisfaction, education level..."
                rows={3}
              />
            </div>
            <div>
              <Label>Living Situation & Financial Status</Label>
              <Textarea
                value={social?.living || ''}
                onChange={(e) => onSocialChange({ ...social, living: e.target.value })}
                placeholder="Housing stability, financial stressors, household composition..."
                rows={3}
              />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
