import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, X } from 'lucide-react';
import { useState } from 'react';

interface PsychoeducationSectionProps {
  data: {
    psychoeducationTopics: string[];
  };
  onChange: (data: any) => void;
  disabled?: boolean;
}

const SUGGESTED_TOPICS = [
  'Understanding Mental Health Diagnosis',
  'Stress Management Techniques',
  'Coping Skills Development',
  'Healthy Sleep Hygiene',
  'Mindfulness and Relaxation',
  'Cognitive Distortions',
  'Communication Skills',
  'Boundary Setting',
  'Emotion Regulation',
  'Crisis Management',
  'Substance Use Education',
  'Medication Education',
  'Relapse Prevention',
  'Self-Care Strategies',
  'Anger Management',
  'Grief and Loss',
  'Trauma Education',
  'Anxiety Management',
  'Depression Education',
  'Social Skills Training'
];

export function PsychoeducationSection({ data, onChange, disabled }: PsychoeducationSectionProps) {
  const [newTopic, setNewTopic] = useState('');

  const addTopic = (topic: string) => {
    if (topic.trim() && !data.psychoeducationTopics.includes(topic.trim())) {
      onChange({
        ...data,
        psychoeducationTopics: [...data.psychoeducationTopics, topic.trim()]
      });
      setNewTopic('');
    }
  };

  const removeTopic = (topicToRemove: string) => {
    onChange({
      ...data,
      psychoeducationTopics: data.psychoeducationTopics.filter(topic => topic !== topicToRemove)
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTopic(newTopic);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Psychoeducation Topics</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Select or add topics to educate the client about during treatment
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="new-topic">Add Custom Topic</Label>
          <div className="flex gap-2 mt-2">
            <Input
              id="new-topic"
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter a psychoeducation topic"
              disabled={disabled}
            />
            <Button
              type="button"
              onClick={() => addTopic(newTopic)}
              disabled={disabled || !newTopic.trim()}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>
        </div>

        <div>
          <Label>Suggested Topics (Click to Add)</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {SUGGESTED_TOPICS.map((topic) => {
              const isAdded = data.psychoeducationTopics.includes(topic);
              return (
                <Badge
                  key={topic}
                  variant={isAdded ? "default" : "outline"}
                  className={`cursor-pointer ${isAdded ? 'opacity-50' : 'hover:bg-accent'}`}
                  onClick={() => !disabled && !isAdded && addTopic(topic)}
                >
                  {topic}
                  {isAdded && <span className="ml-1">✓</span>}
                </Badge>
              );
            })}
          </div>
        </div>

        <div>
          <Label>Selected Topics ({data.psychoeducationTopics.length})</Label>
          {data.psychoeducationTopics.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-2">No topics selected yet</p>
          ) : (
            <div className="flex flex-wrap gap-2 mt-2">
              {data.psychoeducationTopics.map((topic, index) => (
                <Badge key={index} variant="secondary" className="pr-1">
                  {topic}
                  {!disabled && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 ml-2 hover:bg-transparent"
                      onClick={() => removeTopic(topic)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
