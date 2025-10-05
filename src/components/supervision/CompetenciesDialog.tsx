import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus, Check, X, Award, Calendar } from "lucide-react";
import { format } from "date-fns";

interface CompetenciesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  relationshipId: string;
  supervisorId: string;
  mode: 'supervisor' | 'supervisee';
  onSuccess?: () => void;
}

interface CompetencyAchievement {
  competency: string;
  achievedDate: string;
  notes?: string;
}

export function CompetenciesDialog({
  open,
  onOpenChange,
  relationshipId,
  supervisorId,
  mode,
  onSuccess
}: CompetenciesDialogProps) {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [competenciesToAchieve, setCompetenciesToAchieve] = useState<string[]>([]);
  const [competenciesAchieved, setCompetenciesAchieved] = useState<CompetencyAchievement[]>([]);
  const [newCompetency, setNewCompetency] = useState('');
  const [markingCompetency, setMarkingCompetency] = useState<string | null>(null);
  const [achievementNotes, setAchievementNotes] = useState('');

  useEffect(() => {
    if (open) {
      loadCompetencies();
    }
  }, [open, relationshipId]);

  const loadCompetencies = async () => {
    try {
      setLoadingData(true);
      const { data, error } = await supabase
        .from('supervision_relationships')
        .select('competencies_to_achieve, competencies_achieved')
        .eq('id', relationshipId)
        .single();

      if (error) throw error;

      setCompetenciesToAchieve(data?.competencies_to_achieve || []);
      const achievedData = data?.competencies_achieved;
      if (Array.isArray(achievedData)) {
        setCompetenciesAchieved(achievedData as unknown as CompetencyAchievement[]);
      } else {
        setCompetenciesAchieved([]);
      }
    } catch (error: any) {
      console.error('Error loading competencies:', error);
      toast.error("Failed to load competencies");
    } finally {
      setLoadingData(false);
    }
  };

  const handleAddCompetency = async () => {
    if (!newCompetency.trim()) {
      toast.error("Please enter a competency");
      return;
    }

    setLoading(true);
    try {
      const updated = [...competenciesToAchieve, newCompetency.trim()];
      
      const { error } = await supabase
        .from('supervision_relationships')
        .update({ competencies_to_achieve: updated })
        .eq('id', relationshipId);

      if (error) throw error;

      setCompetenciesToAchieve(updated);
      setNewCompetency('');
      toast.success("Competency added");
      onSuccess?.();
    } catch (error: any) {
      console.error('Error adding competency:', error);
      toast.error(error.message || "Failed to add competency");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCompetency = async (competency: string) => {
    setLoading(true);
    try {
      const updated = competenciesToAchieve.filter(c => c !== competency);
      
      const { error } = await supabase
        .from('supervision_relationships')
        .update({ competencies_to_achieve: updated })
        .eq('id', relationshipId);

      if (error) throw error;

      setCompetenciesToAchieve(updated);
      toast.success("Competency removed");
      onSuccess?.();
    } catch (error: any) {
      console.error('Error removing competency:', error);
      toast.error(error.message || "Failed to remove competency");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAchieved = async (competency: string) => {
    setLoading(true);
    try {
      const achievement: CompetencyAchievement = {
        competency,
        achievedDate: new Date().toISOString(),
        notes: achievementNotes || undefined
      };

      const updatedAchieved = [...competenciesAchieved, achievement];
      const updatedToAchieve = competenciesToAchieve.filter(c => c !== competency);

      const { error } = await supabase
        .from('supervision_relationships')
        .update({
          competencies_achieved: updatedAchieved as any,
          competencies_to_achieve: updatedToAchieve
        })
        .eq('id', relationshipId);

      if (error) throw error;

      setCompetenciesAchieved(updatedAchieved);
      setCompetenciesToAchieve(updatedToAchieve);
      setMarkingCompetency(null);
      setAchievementNotes('');
      toast.success("Competency marked as achieved");
      onSuccess?.();
    } catch (error: any) {
      console.error('Error marking competency:', error);
      toast.error(error.message || "Failed to mark competency as achieved");
    } finally {
      setLoading(false);
    }
  };

  const isAchieved = (competency: string) => {
    return competenciesAchieved.some(c => c.competency === competency);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Training Competencies
          </DialogTitle>
          <DialogDescription>
            {mode === 'supervisor' 
              ? "Manage competencies for this supervision relationship"
              : "View your training competencies and achievements"}
          </DialogDescription>
        </DialogHeader>

        {loadingData ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Add New Competency (Supervisor Only) */}
            {mode === 'supervisor' && (
              <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
                <h4 className="font-semibold text-sm">Add New Competency</h4>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., Conduct comprehensive intake assessments"
                    value={newCompetency}
                    onChange={(e) => setNewCompetency(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCompetency()}
                  />
                  <Button onClick={handleAddCompetency} disabled={loading}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Competencies to Achieve */}
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <Award className="h-4 w-4" />
                Competencies to Achieve ({competenciesToAchieve.length})
              </h4>
              
              {competenciesToAchieve.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  {mode === 'supervisor' 
                    ? "No competencies added yet. Add competencies above."
                    : "No pending competencies"}
                </p>
              ) : (
                <div className="space-y-2">
                  {competenciesToAchieve.map((competency, idx) => (
                    <div key={idx} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm flex-1">{competency}</p>
                        <div className="flex gap-2">
                          {mode === 'supervisor' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setMarkingCompetency(competency)}
                              >
                                <Check className="h-3 w-3 mr-1" />
                                Mark Achieved
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRemoveCompetency(competency)}
                                disabled={loading}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Mark as Achieved Form */}
                      {markingCompetency === competency && (
                        <div className="space-y-2 pt-2 border-t">
                          <Label htmlFor="notes">Achievement Notes (Optional)</Label>
                          <Textarea
                            id="notes"
                            placeholder="Add notes about this achievement..."
                            rows={2}
                            value={achievementNotes}
                            onChange={(e) => setAchievementNotes(e.target.value)}
                          />
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setMarkingCompetency(null);
                                setAchievementNotes('');
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleMarkAchieved(competency)}
                              disabled={loading}
                            >
                              {loading && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                              Confirm Achievement
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Achieved Competencies */}
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2 text-green-600">
                <Check className="h-4 w-4" />
                Achieved Competencies ({competenciesAchieved.length})
              </h4>
              
              {competenciesAchieved.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No competencies achieved yet
                </p>
              ) : (
                <div className="space-y-2">
                  {competenciesAchieved.map((achievement, idx) => (
                    <div key={idx} className="border border-green-200 rounded-lg p-3 bg-green-50/50 dark:bg-green-950/20">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium">{achievement.competency}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>Achieved: {format(new Date(achievement.achievedDate), 'MMM dd, yyyy')}</span>
                          </div>
                          {achievement.notes && (
                            <p className="text-xs text-muted-foreground mt-2">{achievement.notes}</p>
                          )}
                        </div>
                        <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                          <Check className="h-3 w-3 mr-1" />
                          Achieved
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Progress Summary */}
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Overall Progress</span>
                <span className="text-muted-foreground">
                  {competenciesAchieved.length} of {competenciesAchieved.length + competenciesToAchieve.length} completed
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{
                    width: `${(competenciesAchieved.length / Math.max(1, competenciesAchieved.length + competenciesToAchieve.length)) * 100}%`
                  }}
                />
              </div>
            </div>

            {/* Close Button */}
            <div className="flex justify-end">
              <Button onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}