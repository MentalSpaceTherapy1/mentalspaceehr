import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CaseDiscussion } from "@/hooks/useSupervisionSessions";
import { X } from "lucide-react";

interface CaseDiscussionInputProps {
  cases: CaseDiscussion[];
  onChange: (cases: CaseDiscussion[]) => void;
}

export function CaseDiscussionInput({ cases, onChange }: CaseDiscussionInputProps) {
  const addCase = () => {
    onChange([...cases, {
      client_id: '',
      discussion_summary: '',
      clinical_issues: [],
      interventions_recommended: []
    }]);
  };

  const removeCase = (index: number) => {
    onChange(cases.filter((_, i) => i !== index));
  };

  const updateCase = (index: number, field: keyof CaseDiscussion, value: any) => {
    const updated = [...cases];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      {cases.map((caseItem, index) => (
        <div key={index} className="border rounded-lg p-4 space-y-3 bg-card">
          <div className="flex justify-between items-center">
            <h4 className="font-medium text-sm">Case Discussion {index + 1}</h4>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeCase(index)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Client ID / Identifier</Label>
            <Input
              placeholder="Enter client identifier or initials"
              value={caseItem.client_id}
              onChange={(e) => updateCase(index, 'client_id', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Discussion Summary</Label>
            <Textarea
              placeholder="What was discussed about this case?"
              rows={2}
              value={caseItem.discussion_summary}
              onChange={(e) => updateCase(index, 'discussion_summary', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Clinical Issues (one per line)</Label>
            <Textarea
              placeholder="Enter clinical issues identified, one per line"
              rows={2}
              value={caseItem.clinical_issues.join('\n')}
              onChange={(e) => updateCase(index, 'clinical_issues', 
                e.target.value.split('\n').filter(t => t.trim())
              )}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Interventions Recommended (one per line)</Label>
            <Textarea
              placeholder="Enter recommended interventions, one per line"
              rows={2}
              value={caseItem.interventions_recommended.join('\n')}
              onChange={(e) => updateCase(index, 'interventions_recommended',
                e.target.value.split('\n').filter(t => t.trim())
              )}
            />
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={addCase}
        className="w-full"
      >
        + Add Case Discussion
      </Button>
    </div>
  );
}
