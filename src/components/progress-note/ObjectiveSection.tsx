import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface ObjectiveSectionProps {
  data: any;
  onChange: (data: any) => void;
  disabled?: boolean;
}

export function ObjectiveSection({ data, onChange, disabled }: ObjectiveSectionProps) {
  const updateBehavioralObservations = (field: string, value: any) => {
    onChange({
      ...data,
      objective: {
        ...data.objective,
        behavioralObservations: {
          ...data.objective.behavioralObservations,
          [field]: value,
        },
      },
    });
  };

  const updateAffect = (field: string, value: any) => {
    onChange({
      ...data,
      objective: {
        ...data.objective,
        behavioralObservations: {
          ...data.objective.behavioralObservations,
          affect: {
            ...data.objective.behavioralObservations.affect,
            [field]: value,
          },
        },
      },
    });
  };

  const updateRiskAssessment = (field: string, value: any) => {
    onChange({
      ...data,
      objective: {
        ...data.objective,
        riskAssessment: {
          ...data.objective.riskAssessment,
          [field]: value,
        },
      },
    });
  };

  const updateObjective = (field: string, value: any) => {
    onChange({
      ...data,
      objective: {
        ...data.objective,
        [field]: value,
      },
    });
  };

  const showRiskAlert = 
    data.objective.riskAssessment.suicidalIdeation !== 'Denied' ||
    data.objective.riskAssessment.homicidalIdeation !== 'Denied' ||
    data.objective.riskAssessment.selfHarm !== 'Denied' ||
    data.objective.riskAssessment.overallRiskLevel === 'High' ||
    data.objective.riskAssessment.overallRiskLevel === 'Moderate';

  return (
    <div className="space-y-6">
      {showRiskAlert && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Risk factors detected. Ensure appropriate interventions are documented.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Behavioral Observations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Appearance</Label>
              <Textarea
                value={data.objective.behavioralObservations.appearance}
                onChange={(e) => updateBehavioralObservations('appearance', e.target.value)}
                placeholder="Well-groomed, appropriate dress for weather..."
                rows={2}
                disabled={disabled}
              />
            </div>

            <div>
              <Label>Observed Mood</Label>
              <Textarea
                value={data.objective.behavioralObservations.mood}
                onChange={(e) => updateBehavioralObservations('mood', e.target.value)}
                placeholder="Clinician's observation of mood..."
                rows={2}
                disabled={disabled}
              />
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Affect</Label>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-sm">Range</Label>
                <Select
                  value={data.objective.behavioralObservations.affect.range}
                  onValueChange={(value) => updateAffect('range', value)}
                  disabled={disabled}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Full">Full</SelectItem>
                    <SelectItem value="Restricted">Restricted</SelectItem>
                    <SelectItem value="Blunted">Blunted</SelectItem>
                    <SelectItem value="Flat">Flat</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm">Appropriateness</Label>
                <Select
                  value={data.objective.behavioralObservations.affect.appropriateness}
                  onValueChange={(value) => updateAffect('appropriateness', value)}
                  disabled={disabled}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Appropriate">Appropriate</SelectItem>
                    <SelectItem value="Inappropriate">Inappropriate</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm">Quality</Label>
                <Textarea
                  value={data.objective.behavioralObservations.affect.quality}
                  onChange={(e) => updateAffect('quality', e.target.value)}
                  placeholder="Labile, congruent..."
                  rows={1}
                  disabled={disabled}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Behavior</Label>
              <Textarea
                value={data.objective.behavioralObservations.behavior}
                onChange={(e) => updateBehavioralObservations('behavior', e.target.value)}
                placeholder="Eye contact, motor activity, mannerisms..."
                rows={2}
                disabled={disabled}
              />
            </div>

            <div>
              <Label>Speech</Label>
              <Textarea
                value={data.objective.behavioralObservations.speech}
                onChange={(e) => updateBehavioralObservations('speech', e.target.value)}
                placeholder="Rate, tone, volume, coherence..."
                rows={2}
                disabled={disabled}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Thought Process</Label>
              <Textarea
                value={data.objective.behavioralObservations.thoughtProcess}
                onChange={(e) => updateBehavioralObservations('thoughtProcess', e.target.value)}
                placeholder="Linear, tangential, circumstantial, logical..."
                rows={2}
                disabled={disabled}
              />
            </div>

            <div>
              <Label>Insight & Judgment</Label>
              <Textarea
                value={data.objective.behavioralObservations.insightJudgment}
                onChange={(e) => updateBehavioralObservations('insightJudgment', e.target.value)}
                placeholder="Level of insight into condition, judgment regarding decisions..."
                rows={2}
                disabled={disabled}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Attention</Label>
              <Select
                value={data.objective.behavioralObservations.attention}
                onValueChange={(value) => updateBehavioralObservations('attention', value)}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Intact">Intact</SelectItem>
                  <SelectItem value="Distractible">Distractible</SelectItem>
                  <SelectItem value="Impaired">Impaired</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Cooperation</Label>
              <Select
                value={data.objective.behavioralObservations.cooperation}
                onValueChange={(value) => updateBehavioralObservations('cooperation', value)}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cooperative">Cooperative</SelectItem>
                  <SelectItem value="Guarded">Guarded</SelectItem>
                  <SelectItem value="Resistant">Resistant</SelectItem>
                  <SelectItem value="Uncooperative">Uncooperative</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Risk Assessment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Suicidal Ideation</Label>
              <Select
                value={data.objective.riskAssessment.suicidalIdeation}
                onValueChange={(value) => updateRiskAssessment('suicidalIdeation', value)}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Denied">Denied</SelectItem>
                  <SelectItem value="Passive">Passive</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="With Plan">With Plan</SelectItem>
                  <SelectItem value="With Intent">With Intent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Homicidal Ideation</Label>
              <Select
                value={data.objective.riskAssessment.homicidalIdeation}
                onValueChange={(value) => updateRiskAssessment('homicidalIdeation', value)}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Denied">Denied</SelectItem>
                  <SelectItem value="Present">Present</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {data.objective.riskAssessment.suicidalIdeation !== 'Denied' && (
            <div>
              <Label>Suicidal Ideation Details *</Label>
              <Textarea
                value={data.objective.riskAssessment.suicidalDetails || ''}
                onChange={(e) => updateRiskAssessment('suicidalDetails', e.target.value)}
                placeholder="Describe thoughts, plan, intent, protective factors..."
                rows={3}
                disabled={disabled}
              />
            </div>
          )}

          {data.objective.riskAssessment.homicidalIdeation !== 'Denied' && (
            <div>
              <Label>Homicidal Ideation Details *</Label>
              <Textarea
                value={data.objective.riskAssessment.homicidalDetails || ''}
                onChange={(e) => updateRiskAssessment('homicidalDetails', e.target.value)}
                placeholder="Describe thoughts, target, plan, intent..."
                rows={3}
                disabled={disabled}
              />
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Self-Harm</Label>
              <Select
                value={data.objective.riskAssessment.selfHarm}
                onValueChange={(value) => updateRiskAssessment('selfHarm', value)}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Denied">Denied</SelectItem>
                  <SelectItem value="Present">Present</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Substance Use</Label>
              <Select
                value={data.objective.riskAssessment.substanceUse}
                onValueChange={(value) => updateRiskAssessment('substanceUse', value)}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Denied">Denied</SelectItem>
                  <SelectItem value="Reported">Reported</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Overall Risk Level</Label>
              <Select
                value={data.objective.riskAssessment.overallRiskLevel}
                onValueChange={(value) => updateRiskAssessment('overallRiskLevel', value)}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Moderate">Moderate</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {(data.objective.riskAssessment.overallRiskLevel === 'Moderate' || 
            data.objective.riskAssessment.overallRiskLevel === 'High') && (
            <div>
              <Label>Risk Interventions *</Label>
              <Textarea
                value={data.objective.riskAssessment.interventions || ''}
                onChange={(e) => updateRiskAssessment('interventions', e.target.value)}
                placeholder="Safety plan, crisis resources provided, family contacted, emergency services..."
                rows={3}
                disabled={disabled}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Clinical Observations Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label>Progress Observed</Label>
            <Textarea
              value={data.objective.progressObserved}
              onChange={(e) => updateObjective('progressObserved', e.target.value)}
              placeholder="Overall clinical observations about client's progress and functioning..."
              rows={4}
              disabled={disabled}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
