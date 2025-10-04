import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Plus, X, ChevronDown, ChevronUp } from 'lucide-react';
import { TreatmentPlanData } from '@/pages/TreatmentPlan';
import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface GoalsSectionProps {
  data: TreatmentPlanData;
  onChange: (data: TreatmentPlanData) => void;
  disabled?: boolean;
}

export function GoalsSection({ data, onChange, disabled }: GoalsSectionProps) {
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());

  const toggleGoal = (goalId: string) => {
    const newExpanded = new Set(expandedGoals);
    if (newExpanded.has(goalId)) {
      newExpanded.delete(goalId);
    } else {
      newExpanded.add(goalId);
    }
    setExpandedGoals(newExpanded);
  };

  const addGoal = () => {
    const newGoal = {
      goalId: crypto.randomUUID(),
      relatedProblemId: data.problems[0]?.problemId || '',
      goalStatement: '',
      goalType: 'Short-term' as const,
      targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      objectives: [],
      goalStatus: 'Not Started' as const,
      goalProgress: 0,
    };
    onChange({
      ...data,
      goals: [...data.goals, newGoal],
    });
    setExpandedGoals(new Set([...expandedGoals, newGoal.goalId]));
  };

  const removeGoal = (goalId: string) => {
    onChange({
      ...data,
      goals: data.goals.filter(g => g.goalId !== goalId),
    });
  };

  const updateGoal = (goalId: string, field: string, value: any) => {
    const updatedGoals = data.goals.map(g =>
      g.goalId === goalId ? { ...g, [field]: value } : g
    );
    onChange({
      ...data,
      goals: updatedGoals,
    });
  };

  const addObjective = (goalId: string) => {
    const newObjective = {
      objectiveId: crypto.randomUUID(),
      objectiveStatement: '',
      targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      measurementMethod: '',
      frequency: 'Weekly',
      status: 'Not Started' as const,
      currentProgress: 0,
      interventions: [],
    };
    
    const updatedGoals = data.goals.map(g =>
      g.goalId === goalId ? { ...g, objectives: [...g.objectives, newObjective] } : g
    );
    onChange({
      ...data,
      goals: updatedGoals,
    });
  };

  const removeObjective = (goalId: string, objectiveId: string) => {
    const updatedGoals = data.goals.map(g =>
      g.goalId === goalId
        ? { ...g, objectives: g.objectives.filter(o => o.objectiveId !== objectiveId) }
        : g
    );
    onChange({
      ...data,
      goals: updatedGoals,
    });
  };

  const updateObjective = (goalId: string, objectiveId: string, field: string, value: any) => {
    const updatedGoals = data.goals.map(g =>
      g.goalId === goalId
        ? {
            ...g,
            objectives: g.objectives.map(o =>
              o.objectiveId === objectiveId ? { ...o, [field]: value } : o
            ),
          }
        : g
    );
    onChange({
      ...data,
      goals: updatedGoals,
    });
  };

  const addIntervention = (goalId: string, objectiveId: string) => {
    const newIntervention = {
      interventionId: crypto.randomUUID(),
      interventionDescription: '',
      interventionType: 'CBT',
      frequency: 'Weekly',
      responsibleParty: '',
    };

    const updatedGoals = data.goals.map(g =>
      g.goalId === goalId
        ? {
            ...g,
            objectives: g.objectives.map(o =>
              o.objectiveId === objectiveId
                ? { ...o, interventions: [...o.interventions, newIntervention] }
                : o
            ),
          }
        : g
    );
    onChange({
      ...data,
      goals: updatedGoals,
    });
  };

  const removeIntervention = (goalId: string, objectiveId: string, interventionId: string) => {
    const updatedGoals = data.goals.map(g =>
      g.goalId === goalId
        ? {
            ...g,
            objectives: g.objectives.map(o =>
              o.objectiveId === objectiveId
                ? { ...o, interventions: o.interventions.filter(i => i.interventionId !== interventionId) }
                : o
            ),
          }
        : g
    );
    onChange({
      ...data,
      goals: updatedGoals,
    });
  };

  const updateIntervention = (
    goalId: string,
    objectiveId: string,
    interventionId: string,
    field: string,
    value: any
  ) => {
    const updatedGoals = data.goals.map(g =>
      g.goalId === goalId
        ? {
            ...g,
            objectives: g.objectives.map(o =>
              o.objectiveId === objectiveId
                ? {
                    ...o,
                    interventions: o.interventions.map(i =>
                      i.interventionId === interventionId ? { ...i, [field]: value } : i
                    ),
                  }
                : o
            ),
          }
        : g
    );
    onChange({
      ...data,
      goals: updatedGoals,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-lg font-semibold">Treatment Goals & Objectives</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addGoal}
          disabled={disabled || data.problems.length === 0}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Goal
        </Button>
      </div>

      {data.problems.length === 0 && (
        <p className="text-sm text-muted-foreground">Add problems first before creating goals</p>
      )}

      {data.goals.length === 0 && data.problems.length > 0 && (
        <p className="text-sm text-muted-foreground">No goals added yet</p>
      )}

      {data.goals.map((goal) => (
        <Collapsible
          key={goal.goalId}
          open={expandedGoals.has(goal.goalId)}
          onOpenChange={() => toggleGoal(goal.goalId)}
        >
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm">
                        {expandedGoals.has(goal.goalId) ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <Badge variant={goal.goalType === 'Short-term' ? 'default' : 'secondary'}>
                      {goal.goalType}
                    </Badge>
                    <Badge variant="outline">{goal.goalStatus}</Badge>
                  </div>
                  <CardTitle className="text-base">
                    {goal.goalStatement || 'New Goal'}
                  </CardTitle>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{goal.goalProgress}%</span>
                    </div>
                    <Progress value={goal.goalProgress} className="h-2" />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeGoal(goal.goalId)}
                  disabled={disabled}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>

            <CollapsibleContent>
              <CardContent className="space-y-4">
                <div>
                  <Label>Goal Statement (SMART Goal) *</Label>
                  <Textarea
                    value={goal.goalStatement}
                    onChange={(e) => updateGoal(goal.goalId, 'goalStatement', e.target.value)}
                    placeholder="Client will reduce anxiety symptoms by 50% as measured by GAD-7 scores within 12 weeks..."
                    rows={3}
                    disabled={disabled}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Related Problem</Label>
                    <Select
                      value={goal.relatedProblemId}
                      onValueChange={(value) => updateGoal(goal.goalId, 'relatedProblemId', value)}
                      disabled={disabled}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {data.problems.map((problem) => (
                          <SelectItem key={problem.problemId} value={problem.problemId}>
                            {problem.problemStatement.substring(0, 50)}...
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Goal Type</Label>
                    <Select
                      value={goal.goalType}
                      onValueChange={(value) => updateGoal(goal.goalId, 'goalType', value)}
                      disabled={disabled}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Short-term">Short-term</SelectItem>
                        <SelectItem value="Long-term">Long-term</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Target Date</Label>
                    <Input
                      type="date"
                      value={goal.targetDate}
                      onChange={(e) => updateGoal(goal.goalId, 'targetDate', e.target.value)}
                      disabled={disabled}
                    />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <Label className="text-base font-semibold">Objectives</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addObjective(goal.goalId)}
                      disabled={disabled}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Objective
                    </Button>
                  </div>

                  {goal.objectives.map((objective) => (
                    <Card key={objective.objectiveId} className="mb-4">
                      <CardContent className="pt-6 space-y-4">
                        <div className="flex items-start justify-between">
                          <Badge variant="outline">{objective.status}</Badge>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeObjective(goal.goalId, objective.objectiveId)}
                            disabled={disabled}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>

                        <div>
                          <Label>Objective Statement (Measurable) *</Label>
                          <Textarea
                            value={objective.objectiveStatement}
                            onChange={(e) =>
                              updateObjective(goal.goalId, objective.objectiveId, 'objectiveStatement', e.target.value)
                            }
                            placeholder="Client will practice deep breathing exercises 3 times per day..."
                            rows={2}
                            disabled={disabled}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Measurement Method</Label>
                            <Input
                              value={objective.measurementMethod}
                              onChange={(e) =>
                                updateObjective(
                                  goal.goalId,
                                  objective.objectiveId,
                                  'measurementMethod',
                                  e.target.value
                                )
                              }
                              placeholder="Self-report, observation, scale"
                              disabled={disabled}
                            />
                          </div>

                          <div>
                            <Label>Frequency</Label>
                            <Input
                              value={objective.frequency}
                              onChange={(e) =>
                                updateObjective(goal.goalId, objective.objectiveId, 'frequency', e.target.value)
                              }
                              placeholder="Daily, Weekly, etc."
                              disabled={disabled}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Target Date</Label>
                            <Input
                              type="date"
                              value={objective.targetDate}
                              onChange={(e) =>
                                updateObjective(goal.goalId, objective.objectiveId, 'targetDate', e.target.value)
                              }
                              disabled={disabled}
                            />
                          </div>

                          <div>
                            <Label>Progress (%)</Label>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={objective.currentProgress}
                              onChange={(e) =>
                                updateObjective(
                                  goal.goalId,
                                  objective.objectiveId,
                                  'currentProgress',
                                  parseInt(e.target.value)
                                )
                              }
                              disabled={disabled}
                            />
                          </div>
                        </div>

                        <div className="border-t pt-4">
                          <div className="flex items-center justify-between mb-3">
                            <Label className="font-medium">Interventions</Label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => addIntervention(goal.goalId, objective.objectiveId)}
                              disabled={disabled}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add Intervention
                            </Button>
                          </div>

                          {objective.interventions.map((intervention) => (
                            <div key={intervention.interventionId} className="border rounded-lg p-3 mb-2 space-y-3">
                              <div className="flex items-start justify-between">
                                <Label className="text-sm">Intervention</Label>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    removeIntervention(goal.goalId, objective.objectiveId, intervention.interventionId)
                                  }
                                  disabled={disabled}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>

                              <Input
                                value={intervention.interventionDescription}
                                onChange={(e) =>
                                  updateIntervention(
                                    goal.goalId,
                                    objective.objectiveId,
                                    intervention.interventionId,
                                    'interventionDescription',
                                    e.target.value
                                  )
                                }
                                placeholder="Description of intervention..."
                                disabled={disabled}
                              />

                              <div className="grid grid-cols-3 gap-2">
                                <Input
                                  value={intervention.interventionType}
                                  onChange={(e) =>
                                    updateIntervention(
                                      goal.goalId,
                                      objective.objectiveId,
                                      intervention.interventionId,
                                      'interventionType',
                                      e.target.value
                                    )
                                  }
                                  placeholder="Type (CBT, DBT...)"
                                  disabled={disabled}
                                />
                                <Input
                                  value={intervention.frequency}
                                  onChange={(e) =>
                                    updateIntervention(
                                      goal.goalId,
                                      objective.objectiveId,
                                      intervention.interventionId,
                                      'frequency',
                                      e.target.value
                                    )
                                  }
                                  placeholder="Frequency"
                                  disabled={disabled}
                                />
                                <Input
                                  value={intervention.responsibleParty}
                                  onChange={(e) =>
                                    updateIntervention(
                                      goal.goalId,
                                      objective.objectiveId,
                                      intervention.interventionId,
                                      'responsibleParty',
                                      e.target.value
                                    )
                                  }
                                  placeholder="Responsible"
                                  disabled={disabled}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      ))}
    </div>
  );
}
