import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ActionItem } from "@/hooks/useSupervisionSessions";
import { X, CheckCircle2, Circle } from "lucide-react";

interface ActionItemsListProps {
  items: ActionItem[];
  onChange: (items: ActionItem[]) => void;
  showCompleted?: boolean;
  readOnly?: boolean;
}

export function ActionItemsList({ 
  items, 
  onChange, 
  showCompleted = true,
  readOnly = false 
}: ActionItemsListProps) {
  const addItem = () => {
    onChange([...items, {
      item: '',
      completed: false
    }]);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof ActionItem, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const toggleCompleted = (index: number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], completed: !updated[index].completed };
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      {items.map((action, index) => (
        <div key={index} className={`border rounded-lg p-4 space-y-3 bg-card ${action.completed ? 'opacity-60' : ''}`}>
          <div className="flex justify-between items-start gap-2">
            <div className="flex items-start gap-2 flex-1">
              {showCompleted && (
                <button
                  type="button"
                  onClick={() => !readOnly && toggleCompleted(index)}
                  className="mt-1"
                  disabled={readOnly}
                >
                  {action.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                </button>
              )}
              <div className="flex-1">
                <h4 className="font-medium text-sm">Action Item {index + 1}</h4>
              </div>
            </div>
            {!readOnly && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeItem(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Description</Label>
            {readOnly ? (
              <p className="text-sm p-2 bg-muted rounded">{action.item}</p>
            ) : (
              <Textarea
                placeholder="Describe the action item or task"
                rows={2}
                value={action.item}
                onChange={(e) => updateItem(index, 'item', e.target.value)}
              />
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Due Date (optional)</Label>
            {readOnly ? (
              <p className="text-sm p-2 bg-muted rounded">
                {action.due_date ? new Date(action.due_date).toLocaleDateString() : 'No due date'}
              </p>
            ) : (
              <Input
                type="date"
                value={action.due_date || ''}
                onChange={(e) => updateItem(index, 'due_date', e.target.value || undefined)}
              />
            )}
          </div>

          {action.due_date && !action.completed && (
            <div className="text-xs">
              {new Date(action.due_date) < new Date() ? (
                <span className="text-destructive font-medium">⚠️ Overdue</span>
              ) : (
                <span className="text-muted-foreground">
                  Due in {Math.ceil((new Date(action.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days
                </span>
              )}
            </div>
          )}
        </div>
      ))}

      {!readOnly && (
        <Button
          type="button"
          variant="outline"
          onClick={addItem}
          className="w-full"
        >
          + Add Action Item
        </Button>
      )}

      {items.length === 0 && readOnly && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No action items for this session
        </p>
      )}
    </div>
  );
}
