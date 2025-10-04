import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface SafetyAssessmentProps {
  data: any;
  onChange: (data: any) => void;
}

export function SafetyAssessmentSection({ data, onChange }: SafetyAssessmentProps) {
  const handleChange = (section: string, field: string, value: any) => {
    onChange({
      ...data,
      [section]: {
        ...(data[section] || {}),
        [field]: value
      }
    });
  };

  const suicideRisk = data.suicideRisk || {};
  const hasRisk = suicideRisk.currentIdeation || suicideRisk.plan || suicideRisk.intent;

  return (
    <div className="space-y-4">
      {hasRisk && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>SAFETY ALERT:</strong> Risk factors identified. Ensure appropriate interventions and safety planning are implemented.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Suicide Risk Assessment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Current Suicidal Ideation</Label>
            <Switch
              checked={suicideRisk.currentIdeation || false}
              onCheckedChange={(v) => handleChange('suicideRisk', 'currentIdeation', v)}
            />
          </div>

          {suicideRisk.currentIdeation && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Frequency</Label>
                  <Select
                    value={suicideRisk.frequency}
                    onValueChange={(v) => handleChange('suicideRisk', 'frequency', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Rare">Rare</SelectItem>
                      <SelectItem value="Occasional">Occasional</SelectItem>
                      <SelectItem value="Frequent">Frequent</SelectItem>
                      <SelectItem value="Constant">Constant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Intensity</Label>
                  <Select
                    value={suicideRisk.intensity}
                    onValueChange={(v) => handleChange('suicideRisk', 'intensity', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Mild">Mild</SelectItem>
                      <SelectItem value="Moderate">Moderate</SelectItem>
                      <SelectItem value="Severe">Severe</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Risk Level</Label>
                  <Select
                    value={suicideRisk.riskLevel}
                    onValueChange={(v) => handleChange('suicideRisk', 'riskLevel', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Moderate">Moderate</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Imminent">Imminent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label>Has Specific Plan</Label>
                <Switch
                  checked={suicideRisk.plan || false}
                  onCheckedChange={(v) => handleChange('suicideRisk', 'plan', v)}
                />
              </div>

              {suicideRisk.plan && (
                <div>
                  <Label>Plan Details</Label>
                  <Textarea
                    value={suicideRisk.planDetails || ''}
                    onChange={(e) => handleChange('suicideRisk', 'planDetails', e.target.value)}
                    placeholder="Describe the plan, means, and timeline..."
                    rows={3}
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <Label>Intent to Act</Label>
                <Switch
                  checked={suicideRisk.intent || false}
                  onCheckedChange={(v) => handleChange('suicideRisk', 'intent', v)}
                />
              </div>

              <div>
                <Label>Safety Plan Created</Label>
                <Switch
                  checked={suicideRisk.safetyPlan?.created || false}
                  onCheckedChange={(v) => handleChange('suicideRisk', 'safetyPlan', { 
                    ...(suicideRisk.safetyPlan || {}), 
                    created: v 
                  })}
                />
              </div>

              <div>
                <Label>Interventions Implemented</Label>
                <Textarea
                  value={suicideRisk.interventions?.join('\n') || ''}
                  onChange={(e) => handleChange('suicideRisk', 'interventions', e.target.value.split('\n'))}
                  placeholder="List interventions (one per line)..."
                  rows={4}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Homicide Risk Assessment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Homicidal Ideation Present</Label>
            <Switch
              checked={data.homicideRisk?.currentIdeation || false}
              onCheckedChange={(v) => handleChange('homicideRisk', 'currentIdeation', v)}
            />
          </div>

          {data.homicideRisk?.currentIdeation && (
            <>
              <div>
                <Label>Risk Level</Label>
                <Select
                  value={data.homicideRisk?.riskLevel}
                  onValueChange={(v) => handleChange('homicideRisk', 'riskLevel', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Moderate">Moderate</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Imminent">Imminent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label>Duty to Warn Notified (Tarasoff)</Label>
                <Switch
                  checked={data.homicideRisk?.dutyToWarnNotified || false}
                  onCheckedChange={(v) => handleChange('homicideRisk', 'dutyToWarnNotified', v)}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Abuse/Neglect Risk Assessment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Suspected Abuse or Neglect</Label>
            <Switch
              checked={data.abuseNeglectRisk?.suspectedAbuse || false}
              onCheckedChange={(v) => handleChange('abuseNeglectRisk', 'suspectedAbuse', v)}
            />
          </div>

          {data.abuseNeglectRisk?.suspectedAbuse && (
            <>
              <div className="space-y-2">
                <Label>Type of Abuse (Check all that apply)</Label>
                <div className="space-y-2">
                  {['Physical', 'Sexual', 'Emotional', 'Neglect'].map((type) => (
                    <div key={type} className="flex items-center space-x-2">
                      <Checkbox
                        id={`abuse-${type}`}
                        checked={(data.abuseNeglectRisk?.abuseType || []).includes(type)}
                        onCheckedChange={(checked) => {
                          const currentTypes = data.abuseNeglectRisk?.abuseType || [];
                          const newTypes = checked
                            ? [...currentTypes, type]
                            : currentTypes.filter((t: string) => t !== type);
                          handleChange('abuseNeglectRisk', 'abuseType', newTypes);
                        }}
                      />
                      <Label htmlFor={`abuse-${type}`} className="font-normal">{type}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label>Report Made</Label>
                <Switch
                  checked={data.abuseNeglectRisk?.reportMade || false}
                  onCheckedChange={(v) => handleChange('abuseNeglectRisk', 'reportMade', v)}
                />
              </div>

              {data.abuseNeglectRisk?.reportMade && (
                <div className="space-y-4 ml-6">
                  <div>
                    <Label>Report Date</Label>
                    <Input
                      type="date"
                      value={data.abuseNeglectRisk?.reportDate || ''}
                      onChange={(e) => handleChange('abuseNeglectRisk', 'reportDate', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Reporting Agency</Label>
                    <Input
                      value={data.abuseNeglectRisk?.reportAgency || ''}
                      onChange={(e) => handleChange('abuseNeglectRisk', 'reportAgency', e.target.value)}
                      placeholder="e.g., Child Protective Services, Adult Protective Services"
                    />
                  </div>
                  <div>
                    <Label>Report Number</Label>
                    <Input
                      value={data.abuseNeglectRisk?.reportNumber || ''}
                      onChange={(e) => handleChange('abuseNeglectRisk', 'reportNumber', e.target.value)}
                      placeholder="Reference or case number"
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Substance Use Risk Assessment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Current Intoxication</Label>
            <Switch
              checked={data.substanceUseRisk?.currentIntoxication || false}
              onCheckedChange={(v) => handleChange('substanceUseRisk', 'currentIntoxication', v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Withdrawal Risk</Label>
            <Switch
              checked={data.substanceUseRisk?.withdrawalRisk || false}
              onCheckedChange={(v) => handleChange('substanceUseRisk', 'withdrawalRisk', v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Overdose Risk</Label>
            <Switch
              checked={data.substanceUseRisk?.overdoseRisk || false}
              onCheckedChange={(v) => handleChange('substanceUseRisk', 'overdoseRisk', v)}
            />
          </div>

          {(data.substanceUseRisk?.currentIntoxication || 
            data.substanceUseRisk?.withdrawalRisk || 
            data.substanceUseRisk?.overdoseRisk) && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>SUBSTANCE RISK ALERT:</strong> Immediate medical evaluation may be required. Document all interventions and referrals.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Self-Harm Risk Assessment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Non-Suicidal Self-Injury</Label>
            <Switch
              checked={data.selfHarmRisk?.nonsuicidalSelfInjury || false}
              onCheckedChange={(v) => handleChange('selfHarmRisk', 'nonsuicidalSelfInjury', v)}
            />
          </div>

          {data.selfHarmRisk?.nonsuicidalSelfInjury && (
            <>
              <div>
                <Label>Methods Used</Label>
                <Textarea
                  value={data.selfHarmRisk?.methods || ''}
                  onChange={(e) => handleChange('selfHarmRisk', 'methods', e.target.value)}
                  placeholder="Describe methods of self-harm (e.g., cutting, burning, hitting)"
                  rows={3}
                />
              </div>

              <div>
                <Label>Frequency</Label>
                <Input
                  value={data.selfHarmRisk?.frequency || ''}
                  onChange={(e) => handleChange('selfHarmRisk', 'frequency', e.target.value)}
                  placeholder="e.g., Daily, Weekly, Monthly, Rare"
                />
              </div>

              <div>
                <Label>Most Recent Episode</Label>
                <Input
                  type="date"
                  value={data.selfHarmRisk?.recentEpisode || ''}
                  onChange={(e) => handleChange('selfHarmRisk', 'recentEpisode', e.target.value)}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
