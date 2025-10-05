import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, FileCheck, Clock, AlertCircle, Calendar, TrendingUp, CheckCircle, FileText, Plus, Award, Settings, Search, ArrowUpDown } from "lucide-react";
import { UnlockRequestManagement } from "../compliance/UnlockRequestManagement";
import { useAuth } from "@/hooks/useAuth";
import { useSupervisionRelationships } from "@/hooks/useSupervisionRelationships";
import { useNoteCosignatures } from "@/hooks/useNoteCosignatures";
import { useSupervisionSessions } from "@/hooks/useSupervisionSessions";
import { SupervisionRelationshipDialog } from "../supervision/SupervisionRelationshipDialog";
import { SupervisionSessionDialog } from "../supervision/SupervisionSessionDialog";
import { CosignNoteDialog } from "../supervision/CosignNoteDialog";
import { CompetenciesDialog } from "../supervision/CompetenciesDialog";
import { RelationshipStatusDialog } from "../supervision/RelationshipStatusDialog";
import { RecentSessionsCard } from "../supervision/RecentSessionsCard";
import { ActionItemsCard } from "../supervision/ActionItemsCard";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";

export function SupervisorDashboard() {
  const { user } = useAuth();
  const [showNewRelationship, setShowNewRelationship] = useState(false);
  const [showSessionDialog, setShowSessionDialog] = useState(false);
  const [selectedRelationship, setSelectedRelationship] = useState<any>(null);
  const [showCosignDialog, setShowCosignDialog] = useState(false);
  const [selectedCosignature, setSelectedCosignature] = useState<any>(null);
  const [showCompetenciesDialog, setShowCompetenciesDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  
  // Filters for cosignatures table
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'dueDate' | 'clientName' | 'noteType'>('dueDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  const { relationships, loading: loadingRel } = useSupervisionRelationships(user?.id);
  const { cosignatures, loading: loadingCosig } = useNoteCosignatures(user?.id); // Get all, not just pending

  const activeRelationships = relationships.filter(r => r.status === 'Active');
  
  // Calculate cosignature statuses based on due dates
  const categorizedCosignatures = useMemo(() => {
    const today = new Date();
    const overdue = cosignatures.filter(c => {
      if (c.status === 'Cosigned') return false;
      if (!c.due_date) return false;
      return differenceInDays(new Date(c.due_date), today) < 0;
    });
    
    const dueSoon = cosignatures.filter(c => {
      if (c.status === 'Cosigned') return false;
      if (!c.due_date) return false;
      const days = differenceInDays(new Date(c.due_date), today);
      return days >= 0 && days <= 2;
    });
    
    const underReview = cosignatures.filter(c => 
      c.status === 'Under Review'
    );
    
    const pending = cosignatures.filter(c => 
      ['Pending', 'Pending Review'].includes(c.status) && 
      !overdue.includes(c) && 
      !dueSoon.includes(c)
    );
    
    return { overdue, dueSoon, underReview, pending, all: cosignatures };
  }, [cosignatures]);
  
  // Filtered and sorted cosignatures for the table
  const filteredCosignatures = useMemo(() => {
    let filtered = statusFilter === 'all' 
      ? categorizedCosignatures.all 
      : categorizedCosignatures[statusFilter as keyof typeof categorizedCosignatures] as any[];
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c => 
        c.client?.first_name?.toLowerCase().includes(query) ||
        c.client?.last_name?.toLowerCase().includes(query) ||
        c.clinician?.first_name?.toLowerCase().includes(query) ||
        c.clinician?.last_name?.toLowerCase().includes(query) ||
        c.note_type?.toLowerCase().includes(query)
      );
    }
    
    // Sort
    const sorted = [...filtered].sort((a, b) => {
      let compareValue = 0;
      switch (sortBy) {
        case 'dueDate':
          compareValue = new Date(a.due_date || 0).getTime() - new Date(b.due_date || 0).getTime();
          break;
        case 'clientName':
          const aName = `${a.client?.first_name} ${a.client?.last_name}`;
          const bName = `${b.client?.first_name} ${b.client?.last_name}`;
          compareValue = aName.localeCompare(bName);
          break;
        case 'noteType':
          compareValue = (a.note_type || '').localeCompare(b.note_type || '');
          break;
      }
      return sortOrder === 'asc' ? compareValue : -compareValue;
    });
    
    return sorted;
  }, [categorizedCosignatures, searchQuery, statusFilter, sortBy, sortOrder]);
  
  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };
  
  const getStatusBadge = (cosig: any) => {
    if (cosig.status === 'Cosigned') {
      return <Badge className="bg-green-600">Cosigned</Badge>;
    }
    
    const today = new Date();
    const daysUntilDue = cosig.due_date 
      ? differenceInDays(new Date(cosig.due_date), today)
      : null;
    
    if (daysUntilDue !== null && daysUntilDue < 0) {
      return <Badge variant="destructive">Overdue ({Math.abs(daysUntilDue)}d)</Badge>;
    }
    
    if (daysUntilDue !== null && daysUntilDue <= 2) {
      return <Badge className="bg-amber-600">Due Soon ({daysUntilDue}d)</Badge>;
    }
    
    if (cosig.status === 'Under Review') {
      return <Badge className="bg-blue-600">Under Review</Badge>;
    }
    
    return <Badge variant="outline">Pending</Badge>;
  };
  
  // For showing recent sessions, we'll use the first active relationship
  const firstActiveRelationship = activeRelationships[0];
  const { sessions: recentSessions } = useSupervisionSessions(firstActiveRelationship?.id);
  
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
                <p className="text-2xl font-bold">
                  {categorizedCosignatures.all.filter(c => c.status !== 'Cosigned').length}
                </p>
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

        {/* Prominent Notes Pending Cosign Section */}
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <FileCheck className="h-6 w-6 text-primary" />
                  Notes Pending Co-Signature
                </CardTitle>
                <CardDescription className="text-base">
                  Review and approve clinical documentation
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-lg px-4 py-2">
                {categorizedCosignatures.all.filter(c => c.status !== 'Cosigned').length} Total
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status Counts */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-destructive/10 border-destructive/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-destructive">Overdue</p>
                      <p className="text-3xl font-bold text-destructive">
                        {categorizedCosignatures.overdue.length}
                      </p>
                    </div>
                    <AlertCircle className="h-10 w-10 text-destructive" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Past due date</p>
                </CardContent>
              </Card>

              <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-900">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-amber-700 dark:text-amber-500">Due Soon</p>
                      <p className="text-3xl font-bold text-amber-700 dark:text-amber-500">
                        {categorizedCosignatures.dueSoon.length}
                      </p>
                    </div>
                    <Clock className="h-10 w-10 text-amber-600 dark:text-amber-500" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Within 2 days</p>
                </CardContent>
              </Card>

              <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-900">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-700 dark:text-blue-500">Under Review</p>
                      <p className="text-3xl font-bold text-blue-700 dark:text-blue-500">
                        {categorizedCosignatures.underReview.length}
                      </p>
                    </div>
                    <FileText className="h-10 w-10 text-blue-600 dark:text-blue-500" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Currently reviewing</p>
                </CardContent>
              </Card>
            </div>

            {/* Filters and Search */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by client, clinician, or note type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Notes</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="dueSoon">Due Soon</SelectItem>
                  <SelectItem value="underReview">Under Review</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Cosignatures Table */}
            {loadingCosig ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : filteredCosignatures.length === 0 ? (
              <div className="text-center py-12 border rounded-lg">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <p className="text-lg font-medium">All caught up!</p>
                <p className="text-sm text-muted-foreground">No notes pending co-signature</p>
              </div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <Button variant="ghost" onClick={() => toggleSort('clientName')} className="h-auto p-0 hover:bg-transparent">
                          Client Name
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead>Clinician</TableHead>
                      <TableHead>
                        <Button variant="ghost" onClick={() => toggleSort('noteType')} className="h-auto p-0 hover:bg-transparent">
                          Note Type
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" onClick={() => toggleSort('dueDate')} className="h-auto p-0 hover:bg-transparent">
                          Due Date
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCosignatures.map((cosig) => (
                      <TableRow key={cosig.id}>
                        <TableCell className="font-medium">
                          {cosig.client?.first_name} {cosig.client?.last_name}
                        </TableCell>
                        <TableCell>
                          {cosig.clinician?.first_name} {cosig.clinician?.last_name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{cosig.note_type}</Badge>
                        </TableCell>
                        <TableCell>
                          {cosig.due_date 
                            ? format(new Date(cosig.due_date), 'MMM dd, yyyy')
                            : 'N/A'
                          }
                        </TableCell>
                        <TableCell>{getStatusBadge(cosig)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedCosignature(cosig);
                              setShowCosignDialog(true);
                            }}
                          >
                            <FileCheck className="mr-2 h-4 w-4" />
                            Review
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

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
        </div>

        {/* Recent Supervision Sessions */}
        {recentSessions && recentSessions.length > 0 && (
          <RecentSessionsCard 
            sessions={recentSessions}
            title="Recent Supervision Sessions"
            description="Latest documented sessions"
            maxSessions={10}
          />
        )}

        {/* Action Items from Supervision */}
        {recentSessions && recentSessions.length > 0 && (
          <ActionItemsCard
            sessions={recentSessions}
            title="Pending Action Items"
            description="Tasks and follow-ups from supervision sessions"
            showCompleted={false}
          />
        )}

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
