import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, X } from 'lucide-react';
import { TreatmentPlanData } from '@/pages/TreatmentPlan';

interface ProblemsSectionProps {
  data: TreatmentPlanData;
  onChange: (data: TreatmentPlanData) => void;
  disabled?: boolean;
}

export function ProblemsSection({ data, onChange, disabled }: ProblemsSectionProps) {
  const addProblem = () => {
    const newProblem = {
      problemId: crypto.randomUUID(),
      problemStatement: '',
      problemType: 'Clinical' as const,
      severity: 'Moderate' as const,
      dateIdentified: new Date().toISOString().split('T')[0],
      status: 'Active' as const,
    };
    onChange({
      ...data,
      problems: [...data.problems, newProblem],
    });
  };

  const removeProblem = (problemId: string) => {
    onChange({
      ...data,
      problems: data.problems.filter(p => p.problemId !== problemId),
      goals: data.goals.filter(g => g.relatedProblemId !== problemId),
    });
  };

  const updateProblem = (problemId: string, field: string, value: any) => {
    const updatedProblems = data.problems.map(p =>
      p.problemId === problemId ? { ...p, [field]: value } : p
    );
    onChange({
      ...data,
      problems: updatedProblems,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-lg font-semibold">Problem List</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addProblem}
          disabled={disabled}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Problem
        </Button>
      </div>

      {data.problems.length === 0 && (
        <p className="text-sm text-muted-foreground">No problems identified yet</p>
      )}

      {data.problems.map((problem) => (
        <Card key={problem.problemId}>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex gap-2">
                  <Badge variant={problem.status === 'Active' ? 'default' : 'secondary'}>
                    {problem.status}
                  </Badge>
                  <Badge variant="outline">{problem.problemType}</Badge>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeProblem(problem.problemId)}
                  disabled={disabled}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div>
                <Label>Problem Statement *</Label>
                <Textarea
                  value={problem.problemStatement}
                  onChange={(e) => updateProblem(problem.problemId, 'problemStatement', e.target.value)}
                  placeholder="Describe the problem clearly and specifically..."
                  rows={3}
                  disabled={disabled}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Problem Type</Label>
                  <Select
                    value={problem.problemType}
                    onValueChange={(value) => updateProblem(problem.problemId, 'problemType', value)}
                    disabled={disabled}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Clinical">Clinical</SelectItem>
                      <SelectItem value="Psychosocial">Psychosocial</SelectItem>
                      <SelectItem value="Environmental">Environmental</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Severity</Label>
                  <Select
                    value={problem.severity}
                    onValueChange={(value) => updateProblem(problem.problemId, 'severity', value)}
                    disabled={disabled}
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
                  <Label>Status</Label>
                  <Select
                    value={problem.status}
                    onValueChange={(value) => updateProblem(problem.problemId, 'status', value)}
                    disabled={disabled}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
