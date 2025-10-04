import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { AISectionWrapper } from './AISectionWrapper';

interface MentalStatusExamProps {
  data: any;
  onChange: (data: any) => void;
  clientId?: string;
  fullContext?: string;
}

export function MentalStatusExamSection({ data, onChange, clientId, fullContext }: MentalStatusExamProps) {
  const handleChange = (section: string, field: string, value: any) => {
    onChange({
      ...data,
      [section]: {
        ...(data[section] || {}),
        [field]: value
      }
    });
  };

  const renderMSESuggestion = (content: any, isEditing: boolean, onEdit: (newContent: any) => void) => {
    if (isEditing) {
      return (
        <div className="space-y-3">
          <Textarea
            value={JSON.stringify(content, null, 2)}
            onChange={(e) => {
              try { onEdit(JSON.parse(e.target.value)); } catch {}
            }}
            rows={8}
            className="font-mono text-xs"
          />
          <p className="text-xs text-muted-foreground">Edit the JSON structure above</p>
        </div>
      );
    }
    
    return (
      <div className="space-y-3 text-sm">
        {content.appearance && (
          <div>
            <span className="font-semibold">Appearance:</span>{' '}
            {typeof content.appearance === 'string' 
              ? content.appearance 
              : JSON.stringify(content.appearance)}
          </div>
        )}
        {content.behavior && (
          <div>
            <span className="font-semibold">Behavior:</span>{' '}
            {typeof content.behavior === 'string'
              ? content.behavior
              : JSON.stringify(content.behavior)}
          </div>
        )}
        {content.speech && (
          <div>
            <span className="font-semibold">Speech:</span>{' '}
            {typeof content.speech === 'string'
              ? content.speech
              : `${content.speech.rate || ''} rate, ${content.speech.volume || ''} volume, ${content.speech.articulation || ''} articulation`}
          </div>
        )}
        {content.mood && (
          <div><span className="font-semibold">Mood:</span> {content.mood}</div>
        )}
        {content.affect && (
          <div>
            <span className="font-semibold">Affect:</span>{' '}
            {typeof content.affect === 'string'
              ? content.affect
              : `${content.affect.type || ''}, ${content.affect.range || ''} range, ${content.affect.appropriateness || ''} appropriateness`}
          </div>
        )}
        {content.thoughtProcess && (
          <div><span className="font-semibold">Thought Process:</span> {content.thoughtProcess}</div>
        )}
        {content.thoughtContent && (
          <div><span className="font-semibold">Thought Content:</span> {content.thoughtContent}</div>
        )}
        {content.perception && (
          <div><span className="font-semibold">Perception:</span> {content.perception}</div>
        )}
        {content.cognition && (
          <div>
            <span className="font-semibold">Cognition:</span>{' '}
            {typeof content.cognition === 'string'
              ? content.cognition
              : `Orientation: ${content.cognition.orientation || 'N/A'}, Memory: ${content.cognition.memory || 'N/A'}`}
          </div>
        )}
        {content.insight && (
          <div><span className="font-semibold">Insight:</span> {content.insight}</div>
        )}
        {content.judgment && (
          <div><span className="font-semibold">Judgment:</span> {content.judgment}</div>
        )}
      </div>
    );
  };

  return (
    <AISectionWrapper
      sectionType="mse"
      clientId={clientId}
      context={fullContext || ''}
      existingData={data}
      onAccept={(content) => {
        const updatedData = { ...data };
        
        // Simple text fields
        if (content.appearance) updatedData.appearance = content.appearance;
        if (content.behavior) updatedData.behavior = content.behavior;
        if (content.mood) updatedData.mood = content.mood;
        if (content.thoughtProcess) updatedData.thoughtProcess = content.thoughtProcess;
        if (content.thoughtContent) updatedData.thoughtContent = content.thoughtContent;
        if (content.perception) updatedData.perception = content.perception;
        if (content.insight) updatedData.insight = content.insight;
        if (content.judgment) updatedData.judgment = content.judgment;
        
        // Nested objects
        if (content.speech) {
          updatedData.speech = {
            rate: content.speech.rate || '',
            volume: content.speech.volume || '',
            articulation: content.speech.articulation || '',
            other: content.speech.other || ''
          };
        }
        
        if (content.affect) {
          updatedData.affect = {
            type: content.affect.type || '',
            range: content.affect.range || '',
            appropriateness: content.affect.appropriateness || '',
            other: content.affect.other || ''
          };
        }
        
        if (content.cognition) {
          updatedData.cognition = {
            orientation: content.cognition.orientation || '',
            memory: content.cognition.memory || '',
            concentration: content.cognition.concentration || '',
            abstractThinking: content.cognition.abstractThinking || ''
          };
        }
        
        onChange(updatedData);
      }}
      renderSuggestion={renderMSESuggestion}
    >
    <Card>
      <CardHeader>
        <CardTitle>Mental Status Examination</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="appearance" className="space-y-4">
          <TabsList className="grid w-full" style={{ gridTemplateColumns: 'repeat(8, minmax(0, 1fr))' }}>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="behavior">Behavior</TabsTrigger>
            <TabsTrigger value="speech">Speech</TabsTrigger>
            <TabsTrigger value="mood">Mood/Affect</TabsTrigger>
            <TabsTrigger value="process">Process</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="perception">Perception</TabsTrigger>
            <TabsTrigger value="cognition">Cognition</TabsTrigger>
          </TabsList>

          {/* Appearance Tab */}
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

            <div>
              <Label>Physical Condition Notes</Label>
              <Textarea
                value={data.appearance?.physicalCondition || ''}
                onChange={(e) => handleChange('appearance', 'physicalCondition', e.target.value)}
                placeholder="Any notable physical characteristics or conditions..."
                rows={2}
              />
            </div>
          </TabsContent>

          {/* Behavior Tab */}
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

              <div>
                <Label>Cooperation</Label>
                <Select
                  value={data.behavior?.cooperation}
                  onValueChange={(v) => handleChange('behavior', 'cooperation', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cooperative">Cooperative</SelectItem>
                    <SelectItem value="Guarded">Guarded</SelectItem>
                    <SelectItem value="Uncooperative">Uncooperative</SelectItem>
                    <SelectItem value="Resistant">Resistant</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Rapport</Label>
                <Select
                  value={data.behavior?.rapport}
                  onValueChange={(v) => handleChange('behavior', 'rapport', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Good">Good</SelectItem>
                    <SelectItem value="Fair">Fair</SelectItem>
                    <SelectItem value="Poor">Poor</SelectItem>
                    <SelectItem value="Difficult to establish">Difficult to establish</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          {/* Speech Tab */}
          <TabsContent value="speech" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

              <div>
                <Label>Fluency</Label>
                <Select
                  value={data.speech?.fluency}
                  onValueChange={(v) => handleChange('speech', 'fluency', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Fluent">Fluent</SelectItem>
                    <SelectItem value="Dysfluent">Dysfluent</SelectItem>
                    <SelectItem value="Stuttering">Stuttering</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Articulation</Label>
                <Select
                  value={data.speech?.articulation}
                  onValueChange={(v) => handleChange('speech', 'articulation', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Clear">Clear</SelectItem>
                    <SelectItem value="Slurred">Slurred</SelectItem>
                    <SelectItem value="Mumbled">Mumbled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Spontaneity</Label>
                <Select
                  value={data.speech?.spontaneity}
                  onValueChange={(v) => handleChange('speech', 'spontaneity', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Spontaneous">Spontaneous</SelectItem>
                    <SelectItem value="Prompted">Prompted</SelectItem>
                    <SelectItem value="Minimal">Minimal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          {/* Mood & Affect Tab */}
          <TabsContent value="mood" className="space-y-4">
            <div>
              <Label>Mood (Client's Subjective Report)</Label>
              <Textarea
                value={data.mood || ''}
                onChange={(e) => onChange({ ...data, mood: e.target.value })}
                placeholder="Client's description of their mood..."
                rows={2}
              />
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Affect Range</Label>
                <Select
                  value={data.affect?.range}
                  onValueChange={(v) => handleChange('affect', 'range', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
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
                <Label>Appropriateness</Label>
                <Select
                  value={data.affect?.appropriateness}
                  onValueChange={(v) => handleChange('affect', 'appropriateness', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Appropriate">Appropriate</SelectItem>
                    <SelectItem value="Inappropriate">Inappropriate</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Mobility</Label>
                <Select
                  value={data.affect?.mobility}
                  onValueChange={(v) => handleChange('affect', 'mobility', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mobile">Mobile</SelectItem>
                    <SelectItem value="Fixed">Fixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Quality</Label>
                <Select
                  value={data.affect?.quality}
                  onValueChange={(v) => handleChange('affect', 'quality', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Euthymic">Euthymic</SelectItem>
                    <SelectItem value="Depressed">Depressed</SelectItem>
                    <SelectItem value="Anxious">Anxious</SelectItem>
                    <SelectItem value="Irritable">Irritable</SelectItem>
                    <SelectItem value="Euphoric">Euphoric</SelectItem>
                    <SelectItem value="Angry">Angry</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          {/* Thought Process Tab */}
          <TabsContent value="process" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Organization</Label>
                <Select
                  value={data.thoughtProcess?.organization}
                  onValueChange={(v) => handleChange('thoughtProcess', 'organization', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Logical">Logical</SelectItem>
                    <SelectItem value="Circumstantial">Circumstantial</SelectItem>
                    <SelectItem value="Tangential">Tangential</SelectItem>
                    <SelectItem value="Loose">Loose</SelectItem>
                    <SelectItem value="Disorganized">Disorganized</SelectItem>
                    <SelectItem value="Flight of Ideas">Flight of Ideas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Coherence</Label>
                <Select
                  value={data.thoughtProcess?.coherence}
                  onValueChange={(v) => handleChange('thoughtProcess', 'coherence', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Coherent">Coherent</SelectItem>
                    <SelectItem value="Incoherent">Incoherent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label>Goal-Directed</Label>
              <Switch
                checked={data.thoughtProcess?.goaldirected || false}
                onCheckedChange={(v) => handleChange('thoughtProcess', 'goaldirected', v)}
              />
            </div>
          </TabsContent>

          {/* Thought Content Tab */}
          <TabsContent value="content" className="space-y-4">
            <div className="space-y-4">
              <h4 className="font-medium">Suicidal Ideation</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 ml-4">
                <div className="flex items-center justify-between">
                  <Label>Ideation</Label>
                  <Switch
                    checked={data.thoughtContent?.suicidalIdeation || false}
                    onCheckedChange={(v) => handleChange('thoughtContent', 'suicidalIdeation', v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Plan</Label>
                  <Switch
                    checked={data.thoughtContent?.suicidalPlan || false}
                    onCheckedChange={(v) => handleChange('thoughtContent', 'suicidalPlan', v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Intent</Label>
                  <Switch
                    checked={data.thoughtContent?.suicidalIntent || false}
                    onCheckedChange={(v) => handleChange('thoughtContent', 'suicidalIntent', v)}
                  />
                </div>
              </div>
              {(data.thoughtContent?.suicidalIdeation || data.thoughtContent?.suicidalPlan || data.thoughtContent?.suicidalIntent) && (
                <Textarea
                  value={data.thoughtContent?.suicidalDetails || ''}
                  onChange={(e) => handleChange('thoughtContent', 'suicidalDetails', e.target.value)}
                  placeholder="Details about suicidal ideation, plan, or intent..."
                  rows={3}
                  className="ml-4"
                />
              )}
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="font-medium">Homicidal Ideation</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 ml-4">
                <div className="flex items-center justify-between">
                  <Label>Ideation</Label>
                  <Switch
                    checked={data.thoughtContent?.homicidalIdeation || false}
                    onCheckedChange={(v) => handleChange('thoughtContent', 'homicidalIdeation', v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Plan</Label>
                  <Switch
                    checked={data.thoughtContent?.homicidalPlan || false}
                    onCheckedChange={(v) => handleChange('thoughtContent', 'homicidalPlan', v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Intent</Label>
                  <Switch
                    checked={data.thoughtContent?.homicidalIntent || false}
                    onCheckedChange={(v) => handleChange('thoughtContent', 'homicidalIntent', v)}
                  />
                </div>
              </div>
              {(data.thoughtContent?.homicidalIdeation || data.thoughtContent?.homicidalPlan || data.thoughtContent?.homicidalIntent) && (
                <Textarea
                  value={data.thoughtContent?.homicidalDetails || ''}
                  onChange={(e) => handleChange('thoughtContent', 'homicidalDetails', e.target.value)}
                  placeholder="Details about homicidal ideation, plan, or intent..."
                  rows={3}
                  className="ml-4"
                />
              )}
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Obsessions</Label>
                <Switch
                  checked={data.thoughtContent?.obsessions || false}
                  onCheckedChange={(v) => handleChange('thoughtContent', 'obsessions', v)}
                />
              </div>
              {data.thoughtContent?.obsessions && (
                <Textarea
                  value={data.thoughtContent?.obsessionDetails || ''}
                  onChange={(e) => handleChange('thoughtContent', 'obsessionDetails', e.target.value)}
                  placeholder="Describe obsessive thoughts..."
                  rows={2}
                  className="ml-4"
                />
              )}

              <div className="flex items-center justify-between">
                <Label>Compulsions</Label>
                <Switch
                  checked={data.thoughtContent?.compulsions || false}
                  onCheckedChange={(v) => handleChange('thoughtContent', 'compulsions', v)}
                />
              </div>
              {data.thoughtContent?.compulsions && (
                <Textarea
                  value={data.thoughtContent?.compulsionDetails || ''}
                  onChange={(e) => handleChange('thoughtContent', 'compulsionDetails', e.target.value)}
                  placeholder="Describe compulsive behaviors..."
                  rows={2}
                  className="ml-4"
                />
              )}

              <div className="flex items-center justify-between">
                <Label>Phobias</Label>
                <Switch
                  checked={data.thoughtContent?.phobias || false}
                  onCheckedChange={(v) => handleChange('thoughtContent', 'phobias', v)}
                />
              </div>
              {data.thoughtContent?.phobias && (
                <Textarea
                  value={data.thoughtContent?.phobiaDetails || ''}
                  onChange={(e) => handleChange('thoughtContent', 'phobiaDetails', e.target.value)}
                  placeholder="Describe phobias..."
                  rows={2}
                  className="ml-4"
                />
              )}

              <div className="flex items-center justify-between">
                <Label>Delusions</Label>
                <Switch
                  checked={data.thoughtContent?.delusions || false}
                  onCheckedChange={(v) => handleChange('thoughtContent', 'delusions', v)}
                />
              </div>
              {data.thoughtContent?.delusions && (
                <div className="ml-4 space-y-4">
                  <div>
                    <Label>Delusion Type</Label>
                    <Select
                      value={data.thoughtContent?.delusionType}
                      onValueChange={(v) => handleChange('thoughtContent', 'delusionType', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Paranoid">Paranoid</SelectItem>
                        <SelectItem value="Grandiose">Grandiose</SelectItem>
                        <SelectItem value="Somatic">Somatic</SelectItem>
                        <SelectItem value="Religious">Religious</SelectItem>
                        <SelectItem value="Reference">Reference</SelectItem>
                        <SelectItem value="Control">Control</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Textarea
                    value={data.thoughtContent?.delusionDetails || ''}
                    onChange={(e) => handleChange('thoughtContent', 'delusionDetails', e.target.value)}
                    placeholder="Describe delusional content..."
                    rows={3}
                  />
                </div>
              )}
            </div>
          </TabsContent>

          {/* Perception Tab */}
          <TabsContent value="perception" className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Hallucinations</Label>
              <Switch
                checked={data.perception?.hallucinations || false}
                onCheckedChange={(v) => handleChange('perception', 'hallucinations', v)}
              />
            </div>

            {data.perception?.hallucinations && (
              <div className="ml-4 space-y-4">
                <div className="space-y-2">
                  <Label>Hallucination Type (Check all that apply)</Label>
                  {['Auditory', 'Visual', 'Tactile', 'Olfactory', 'Gustatory'].map((type) => (
                    <div key={type} className="flex items-center space-x-2">
                      <Checkbox
                        id={`hallucination-${type}`}
                        checked={(data.perception?.hallucinationType || []).includes(type)}
                        onCheckedChange={(checked) => {
                          const currentTypes = data.perception?.hallucinationType || [];
                          const newTypes = checked
                            ? [...currentTypes, type]
                            : currentTypes.filter((t: string) => t !== type);
                          handleChange('perception', 'hallucinationType', newTypes);
                        }}
                      />
                      <Label htmlFor={`hallucination-${type}`} className="font-normal">{type}</Label>
                    </div>
                  ))}
                </div>

                <Textarea
                  value={data.perception?.hallucinationDetails || ''}
                  onChange={(e) => handleChange('perception', 'hallucinationDetails', e.target.value)}
                  placeholder="Describe hallucinations in detail..."
                  rows={3}
                />
              </div>
            )}

            <Separator />

            <div className="flex items-center justify-between">
              <Label>Illusions</Label>
              <Switch
                checked={data.perception?.illusions || false}
                onCheckedChange={(v) => handleChange('perception', 'illusions', v)}
              />
            </div>

            {data.perception?.illusions && (
              <Textarea
                value={data.perception?.illusionDetails || ''}
                onChange={(e) => handleChange('perception', 'illusionDetails', e.target.value)}
                placeholder="Describe illusions..."
                rows={2}
                className="ml-4"
              />
            )}

            <Separator />

            <div className="flex items-center justify-between">
              <Label>Depersonalization</Label>
              <Switch
                checked={data.perception?.depersonalization || false}
                onCheckedChange={(v) => handleChange('perception', 'depersonalization', v)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Derealization</Label>
              <Switch
                checked={data.perception?.derealization || false}
                onCheckedChange={(v) => handleChange('perception', 'derealization', v)}
              />
            </div>
          </TabsContent>

          {/* Cognition Tab */}
          <TabsContent value="cognition" className="space-y-4">
            <div>
              <Label className="font-medium">Orientation</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="orient-person"
                    checked={data.cognition?.orientation?.person || false}
                    onCheckedChange={(v) => handleChange('cognition', 'orientation', {
                      ...(data.cognition?.orientation || {}),
                      person: v
                    })}
                  />
                  <Label htmlFor="orient-person" className="font-normal">Person</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="orient-place"
                    checked={data.cognition?.orientation?.place || false}
                    onCheckedChange={(v) => handleChange('cognition', 'orientation', {
                      ...(data.cognition?.orientation || {}),
                      place: v
                    })}
                  />
                  <Label htmlFor="orient-place" className="font-normal">Place</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="orient-time"
                    checked={data.cognition?.orientation?.time || false}
                    onCheckedChange={(v) => handleChange('cognition', 'orientation', {
                      ...(data.cognition?.orientation || {}),
                      time: v
                    })}
                  />
                  <Label htmlFor="orient-time" className="font-normal">Time</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="orient-situation"
                    checked={data.cognition?.orientation?.situation || false}
                    onCheckedChange={(v) => handleChange('cognition', 'orientation', {
                      ...(data.cognition?.orientation || {}),
                      situation: v
                    })}
                  />
                  <Label htmlFor="orient-situation" className="font-normal">Situation</Label>
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Attention</Label>
                <Select
                  value={data.cognition?.attention}
                  onValueChange={(v) => handleChange('cognition', 'attention', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Intact">Intact</SelectItem>
                    <SelectItem value="Impaired">Impaired</SelectItem>
                    <SelectItem value="Distractible">Distractible</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Concentration</Label>
                <Select
                  value={data.cognition?.concentration}
                  onValueChange={(v) => handleChange('cognition', 'concentration', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Intact">Intact</SelectItem>
                    <SelectItem value="Impaired">Impaired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div>
              <Label className="font-medium">Memory</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                <div>
                  <Label>Immediate</Label>
                  <Select
                    value={data.cognition?.memory?.immediate}
                    onValueChange={(v) => handleChange('cognition', 'memory', {
                      ...(data.cognition?.memory || {}),
                      immediate: v
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Intact">Intact</SelectItem>
                      <SelectItem value="Impaired">Impaired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Recent</Label>
                  <Select
                    value={data.cognition?.memory?.recent}
                    onValueChange={(v) => handleChange('cognition', 'memory', {
                      ...(data.cognition?.memory || {}),
                      recent: v
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Intact">Intact</SelectItem>
                      <SelectItem value="Impaired">Impaired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Remote</Label>
                  <Select
                    value={data.cognition?.memory?.remote}
                    onValueChange={(v) => handleChange('cognition', 'memory', {
                      ...(data.cognition?.memory || {}),
                      remote: v
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Intact">Intact</SelectItem>
                      <SelectItem value="Impaired">Impaired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Fund of Knowledge</Label>
                <Select
                  value={data.cognition?.fundOfKnowledge}
                  onValueChange={(v) => handleChange('cognition', 'fundOfKnowledge', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Average">Average</SelectItem>
                    <SelectItem value="Above Average">Above Average</SelectItem>
                    <SelectItem value="Below Average">Below Average</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Abstract Thinking</Label>
                <Select
                  value={data.cognition?.abstractThinking}
                  onValueChange={(v) => handleChange('cognition', 'abstractThinking', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Intact">Intact</SelectItem>
                    <SelectItem value="Concrete">Concrete</SelectItem>
                    <SelectItem value="Impaired">Impaired</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Calculation</Label>
                <Select
                  value={data.cognition?.calculation}
                  onValueChange={(v) => handleChange('cognition', 'calculation', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Intact">Intact</SelectItem>
                    <SelectItem value="Impaired">Impaired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <Separator className="my-6" />

        {/* Standalone Assessment Fields */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Clinical Assessment</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Judgment</Label>
              <Select
                value={data.judgment}
                onValueChange={(v) => onChange({ ...data, judgment: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Good">Good</SelectItem>
                  <SelectItem value="Fair">Fair</SelectItem>
                  <SelectItem value="Poor">Poor</SelectItem>
                  <SelectItem value="Impaired">Impaired</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Insight</Label>
              <Select
                value={data.insight}
                onValueChange={(v) => onChange({ ...data, insight: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Good">Good</SelectItem>
                  <SelectItem value="Fair">Fair</SelectItem>
                  <SelectItem value="Poor">Poor</SelectItem>
                  <SelectItem value="None">None</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Impulse Control</Label>
              <Select
                value={data.impulseControl}
                onValueChange={(v) => onChange({ ...data, impulseControl: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Good">Good</SelectItem>
                  <SelectItem value="Fair">Fair</SelectItem>
                  <SelectItem value="Poor">Poor</SelectItem>
                  <SelectItem value="Impaired">Impaired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
    </AISectionWrapper>
  );
}
