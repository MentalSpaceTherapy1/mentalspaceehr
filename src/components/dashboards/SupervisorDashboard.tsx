import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, FileCheck, Clock, AlertCircle, Calendar, TrendingUp, CheckCircle, FileText, Plus, Award, Settings } from "lucide-react";
import { UnlockRequestManagement } from "../compliance/UnlockRequestManagement";
import { useAuth } from "@/hooks/useAuth";
import { useSupervisionRelationships } from "@/hooks/useSupervisionRelationships";
import { useNoteCosignatures } from "@/hooks/useNoteCosignatures";
import { SupervisionRelationshipDialog } from "../supervision/SupervisionRelationshipDialog";
import { SupervisionSessionDialog } from "../supervision/SupervisionSessionDialog";
import { CosignNoteDialog } from "../supervision/CosignNoteDialog";
import { CompetenciesDialog } from "../supervision/CompetenciesDialog";
import { RelationshipStatusDialog } from "../supervision/RelationshipStatusDialog";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export function SupervisorDashboard() {
  const { user } = useAuth();
  const [showNewRelationship, setShowNewRelationship] = useState(false);
  const [showSessionDialog, setShowSessionDialog] = useState(false);
  const [selectedRelationship, setSelectedRelationship] = useState<any>(null);
  const [showCosignDialog, setShowCosignDialog] = useState(false);
  const [selectedCosignature, setSelectedCosignature] = useState<any>(null);
  const [showCompetenciesDialog, setShowCompetenciesDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  
  const { relationships, loading: loadingRel } = useSupervisionRelationships(user?.id);
  const { cosignatures, loading: loadingCosig } = useNoteCosignatures(user?.id, 'Pending');

  const activeRelationships = relationships.filter(r => r.status === 'Active');
  const pendingCosigns = cosignatures.length;
  
  const totalHoursCompleted = relationships.reduce((sum, r) => sum + (r.completed_hours || 0), 0);
  
  const complianceIssues = activeRelationships.filter(r => {
    const progress = (r.completed_hours || 0) / r.required_supervision_hours;
    const monthsSinceStart = Math.max(1, Math.floor(
      (new Date().getTime() - new Date(r.start_date).getTime()) / (1000 * 60 * 60 * 24 * 30)
    ));
    const expectedProgress = monthsSinceStart / 12;
    return progress < expectedProgress * 0.8;
  }).length;

  if (loadingRel) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Supervisor Dashboard</h1>
          <Button onClick={() => setShowNewRelationship(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Supervisee
          </Button>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Supervisees</p>
                <p className="text-2xl font-bold">{activeRelationships.length}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <FileCheck className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Co-Signs</p>
                <p className="text-2xl font-bold">{pendingCosigns}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Clock className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Supervision Hours (Total)</p>
                <p className="text-2xl font-bold">{Math.round(totalHoursCompleted)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <AlertCircle className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Compliance Issues</p>
                <p className="text-2xl font-bold">{complianceIssues}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Unlock Request Management */}
        <UnlockRequestManagement />

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Supervisees Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Supervisees</CardTitle>
              <CardDescription>Current supervision relationships</CardDescription>
            </CardHeader>
            <CardContent>
              {activeRelationships.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active supervision relationships.</p>
              ) : (
                <div className="space-y-4">
                  {activeRelationships.map((rel) => (
                    <div key={rel.id} className="border-b pb-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium">
                            {rel.supervisee?.first_name} {rel.supervisee?.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">{rel.relationship_type}</p>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {Math.round(rel.completed_hours || 0)}/{rel.required_supervision_hours} hrs
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {rel.supervision_frequency}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {Math.round((rel.completed_hours || 0) / rel.required_supervision_hours * 100)}%
                          </p>
                          <p className="text-xs text-muted-foreground">Complete</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setSelectedRelationship(rel);
                            setShowCompetenciesDialog(true);
                          }}
                        >
                          <Award className="h-3 w-3 mr-1" />
                          Competencies
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setSelectedRelationship(rel);
                            setShowStatusDialog(true);
                          }}
                        >
                          <Settings className="h-3 w-3 mr-1" />
                          Status
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes Pending Co-Signature */}
          <Card>
            <CardHeader>
              <CardTitle>Notes Pending Co-Signature</CardTitle>
              <CardDescription>Documents awaiting your approval</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingCosig ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : pendingCosigns === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">All caught up!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cosignatures.slice(0, 5).map((cosig) => (
                    <div key={cosig.id} className="flex items-center justify-between border-b pb-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {cosig.client?.first_name} {cosig.client?.last_name || 'Unknown Client'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          By {cosig.clinician?.first_name} {cosig.clinician?.last_name}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <Badge variant="outline" className="text-xs">
                            {cosig.note_type}
                          </Badge>
                          {cosig.due_date && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Due: {new Date(cosig.due_date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedCosignature(cosig);
                            setShowCosignDialog(true);
                          }}
                        >
                          Review
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Supervision Hours Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Supervision Hours Summary</CardTitle>
            <CardDescription>Hours provided by supervisee</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeRelationships.length === 0 ? (
                <p className="text-sm text-muted-foreground">No supervision hours recorded</p>
              ) : (
                activeRelationships.map((rel) => (
                  <div key={rel.id} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">
                        {rel.supervisee?.first_name} {rel.supervisee?.last_name}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {Math.round(rel.completed_hours || 0)} / {rel.required_supervision_hours} hours
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, (rel.completed_hours || 0) / rel.required_supervision_hours * 100)}%`
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common supervision tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Button variant="outline" className="h-auto flex flex-col gap-2 p-4">
                <FileCheck className="h-5 w-5" />
                <span className="text-sm">Review Notes</span>
              </Button>
              <Button variant="outline" className="h-auto flex flex-col gap-2 p-4">
                <Calendar className="h-5 w-5" />
                <span className="text-sm">Schedule Meeting</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto flex flex-col gap-2 p-4"
                onClick={() => {
                  if (activeRelationships.length > 0) {
                    setSelectedRelationship(activeRelationships[0]);
                    setShowSessionDialog(true);
                  } else {
                    toast.error("No active supervision relationships");
                  }
                }}
              >
                <Clock className="h-5 w-5" />
                <span className="text-sm">Log Hours</span>
              </Button>
              <Button variant="outline" className="h-auto flex flex-col gap-2 p-4">
                <TrendingUp className="h-5 w-5" />
                <span className="text-sm">View Progress</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <SupervisionRelationshipDialog
        open={showNewRelationship}
        onOpenChange={setShowNewRelationship}
        onSuccess={() => {
          // Refresh happens automatically via subscription
        }}
        supervisorId={user?.id || ''}
      />

      {selectedRelationship && (
        <SupervisionSessionDialog
          open={showSessionDialog}
          onOpenChange={setShowSessionDialog}
          relationshipId={selectedRelationship.id}
          supervisorId={user?.id || ''}
          superviseeId={selectedRelationship.supervisee_id}
          onSuccess={() => {
            // Refresh happens automatically via subscription
          }}
        />
      )}

      {selectedCosignature && (
        <CosignNoteDialog
          open={showCosignDialog}
          onOpenChange={setShowCosignDialog}
          cosignatureId={selectedCosignature.id}
          noteId={selectedCosignature.note_id}
          noteType={selectedCosignature.note_type}
          clientName={`${selectedCosignature.client?.first_name} ${selectedCosignature.client?.last_name}`}
          clinicianName={`${selectedCosignature.clinician?.first_name} ${selectedCosignature.clinician?.last_name}`}
          createdDate={selectedCosignature.created_date}
          onSuccess={() => {
            // Refresh happens automatically via subscription
          }}
        />
      )}

      {selectedRelationship && showCompetenciesDialog && (
        <CompetenciesDialog
          open={showCompetenciesDialog}
          onOpenChange={setShowCompetenciesDialog}
          relationshipId={selectedRelationship.id}
          supervisorId={user?.id || ''}
          mode="supervisor"
          onSuccess={() => {
            // Refresh happens automatically via subscription
          }}
        />
      )}

      {selectedRelationship && showStatusDialog && (
        <RelationshipStatusDialog
          open={showStatusDialog}
          onOpenChange={setShowStatusDialog}
          relationship={selectedRelationship}
          onSuccess={() => {
            // Refresh happens automatically via subscription
          }}
        />
      )}
    </>
  );
}
