import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GroupSupervisee } from "@/hooks/useSupervisionSessions";
import { X, Users } from "lucide-react";

interface GroupSuperviseesInputProps {
  supervisees: GroupSupervisee[];
  onChange: (supervisees: GroupSupervisee[]) => void;
}

export function GroupSuperviseesInput({ supervisees, onChange }: GroupSuperviseesInputProps) {
  const addSupervisee = () => {
    onChange([...supervisees, {
      supervisee_id: '',
      hours_earned: 1.0
    }]);
  };

  const removeSupervisee = (index: number) => {
    onChange(supervisees.filter((_, i) => i !== index));
  };

  const updateSupervisee = (index: number, field: keyof GroupSupervisee, value: any) => {
    const updated = [...supervisees];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Users className="h-4 w-4" />
        <span>Track individual hour credits for each supervisee in group supervision</span>
      </div>

      {supervisees.map((supervisee, index) => (
        <div key={index} className="border rounded-lg p-4 space-y-3 bg-card">
          <div className="flex justify-between items-center">
            <h4 className="font-medium text-sm">Supervisee {index + 1}</h4>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeSupervisee(index)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Supervisee ID / Name</Label>
              <Input
                placeholder="Enter supervisee identifier"
                value={supervisee.supervisee_id}
                onChange={(e) => updateSupervisee(index, 'supervisee_id', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Hours Earned</Label>
              <Input
                type="number"
                min="0"
                step="0.25"
                placeholder="1.0"
                value={supervisee.hours_earned}
                onChange={(e) => updateSupervisee(index, 'hours_earned', parseFloat(e.target.value))}
              />
            </div>
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={addSupervisee}
        className="w-full"
      >
        + Add Supervisee
      </Button>

      {supervisees.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Add supervisees to track individual hour credits for this group session
        </p>
      )}
    </div>
  );
}
