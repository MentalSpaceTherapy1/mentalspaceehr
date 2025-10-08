import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useState, useEffect } from 'react';

interface Clinician {
  id: string;
  first_name: string;
  last_name: string;
  color: string;
}

interface ClinicianSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clinicians: Clinician[];
  selectedClinicians: Set<string>;
  onApply: (selected: Set<string>) => void;
}

export function ClinicianSelectorDialog({
  open,
  onOpenChange,
  clinicians,
  selectedClinicians,
  onApply,
}: ClinicianSelectorDialogProps) {
  const [tempSelected, setTempSelected] = useState<Set<string>>(new Set(selectedClinicians));

  useEffect(() => {
    if (open) {
      setTempSelected(new Set(selectedClinicians));
    }
  }, [open, selectedClinicians]);

  const handleToggle = (clinicianId: string) => {
    const newSelected = new Set(tempSelected);
    if (newSelected.has(clinicianId)) {
      newSelected.delete(clinicianId);
    } else {
      newSelected.add(clinicianId);
    }
    setTempSelected(newSelected);
  };

  const handleSelectAll = () => {
    const allIds = clinicians.map(c => c.id);
    setTempSelected(new Set(allIds));
  };

  const handleSelectNone = () => {
    setTempSelected(new Set());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Set Calendar View</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={handleSelectNone}>
                Clear
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              {tempSelected.size === 0 ? 'None Selected' : `${tempSelected.size} selected`}
            </div>
          </div>

          <ScrollArea className="h-[400px] border rounded-md p-4">
            <div className="grid grid-cols-3 gap-3">
              {clinicians.map((clinician) => (
                <div
                  key={clinician.id}
                  className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleToggle(clinician.id)}
                >
                  <Checkbox
                    checked={tempSelected.has(clinician.id)}
                    onCheckedChange={() => handleToggle(clinician.id)}
                  />
                  <div
                    className="w-4 h-4 rounded border-2 border-border flex-shrink-0"
                    style={{ backgroundColor: clinician.color }}
                  />
                  <span className="text-sm font-medium truncate">
                    {clinician.first_name} {clinician.last_name}
                  </span>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                onApply(tempSelected);
                onOpenChange(false);
              }}
              className="bg-gradient-to-r from-primary to-accent"
            >
              Set Calendar View
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
