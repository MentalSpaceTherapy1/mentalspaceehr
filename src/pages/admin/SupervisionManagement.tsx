import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Users, UserPlus, TrendingUp, AlertCircle, FileText, Download, Search, BarChart3, Bell } from 'lucide-react';
import { SupervisionRelationshipDialog } from '@/components/supervision/SupervisionRelationshipDialog';
import { RelationshipStatusDialog } from '@/components/supervision/RelationshipStatusDialog';
import { CosignMetricsDashboard } from '@/components/supervision/CosignMetricsDashboard';
import { DetailedNotificationLog } from '@/components/supervision/DetailedNotificationLog';
import { formatDistanceToNow } from 'date-fns';
import { Progress } from '@/components/ui/progress';

interface RelationshipWithDetails {
  id: string;
  supervisor_id: string;
  supervisee_id: string;
  relationship_type: string;
  start_date: string;
  end_date: string | null;
  status: string;
  required_supervision_hours: number;
  required_direct_hours: number | null;
  required_indirect_hours: number | null;
  required_group_hours: number | null;
  requires_note_cosign: boolean;
  supervisor_name: string;
  supervisee_name: string;
  completed_hours: number;
  direct_hours_completed: number;
  indirect_hours_completed: number;
  group_hours_completed: number;
  pending_cosigns: number;
}

export default function SupervisionManagement() {
  const [relationships, setRelationships] = useState<RelationshipWithDetails[]>([]);
  const [filteredRelationships, setFilteredRelationships] = useState<RelationshipWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedRelationship, setSelectedRelationship] = useState<RelationshipWithDetails | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);

  const [stats, setStats] = useState({
    totalRelationships: 0,
    activeSupervisors: 0,
    activeSupervisees: 0,
    totalHoursLogged: 0,
    pendingCosignatures: 0,
  });

  const fetchRelationships = async () => {
    try {
      setLoading(true);

      // Fetch all relationships
      const { data: relationshipsData, error: relError } = await supabase
        .from('supervision_relationships')
        .select('*')
        .order('status', { ascending: true })
        .order('start_date', { ascending: false });

      if (relError) throw relError;

      if (!relationshipsData || relationshipsData.length === 0) {
        setRelationships([]);
        setFilteredRelationships([]);
        setLoading(false);
        return;
      }

      // Get all supervisor and supervisee profiles
      const allUserIds = Array.from(new Set([
        ...relationshipsData.map(r => r.supervisor_id),
        ...relationshipsData.map(r => r.supervisee_id),
      ]));

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', allUserIds);

      if (profilesError) throw profilesError;

      // Get hours summary
      const relationshipIds = relationshipsData.map(r => r.id);
      const { data: hoursData, error: hoursError } = await supabase
        .from('supervision_hours_summary')
        .select('*')
        .in('relationship_id', relationshipIds);

      if (hoursError) {
        console.error('Error fetching hours:', hoursError);
      }

      // Get pending cosignatures count
      const { data: pendingCosigns, error: cosignError } = await supabase
        .from('note_cosignatures')
        .select('relationship_id, status')
        .eq('status', 'pending')
        .in('relationship_id', relationshipIds);

      if (cosignError) {
        console.error('Error fetching cosignatures:', cosignError);
      }

      // Combine all data
      const combined = relationshipsData.map(rel => {
        const supervisor = profiles?.find(p => p.id === rel.supervisor_id);
        const supervisee = profiles?.find(p => p.id === rel.supervisee_id);
        const hours = hoursData?.find((h: any) => h.relationship_id === rel.id);
        const cosignCount = pendingCosigns?.filter(c => c.relationship_id === rel.id).length || 0;

        return {
          ...rel,
          supervisor_name: supervisor ? `${supervisor.first_name} ${supervisor.last_name}` : 'Unknown',
          supervisee_name: supervisee ? `${supervisee.first_name} ${supervisee.last_name}` : 'Unknown',
          completed_hours: hours?.completed_hours || 0,
          direct_hours_completed: hours?.direct_hours_completed || 0,
          indirect_hours_completed: hours?.indirect_hours_completed || 0,
          group_hours_completed: hours?.group_hours_completed || 0,
          pending_cosigns: cosignCount,
        };
      });

      setRelationships(combined);
      setFilteredRelationships(combined);

      // Calculate stats
      const activeRelationships = combined.filter(r => r.status === 'Active');
      const activeSupervisorIds = new Set(activeRelationships.map(r => r.supervisor_id));
      const activeSupervisseeIds = new Set(activeRelationships.map(r => r.supervisee_id));
      const totalHours = combined.reduce((sum, r) => sum + r.completed_hours, 0);
      const totalPendingCosigns = combined.reduce((sum, r) => sum + r.pending_cosigns, 0);

      setStats({
        totalRelationships: combined.length,
        activeSupervisors: activeSupervisorIds.size,
        activeSupervisees: activeSupervisseeIds.size,
        totalHoursLogged: Math.round(totalHours),
        pendingCosignatures: totalPendingCosigns,
      });
    } catch (error) {
      console.error('Error fetching relationships:', error);
      toast({
        title: 'Error',
        description: 'Failed to load supervision relationships',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRelationships();
  }, []);

  useEffect(() => {
    let filtered = relationships;

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.supervisor_name.toLowerCase().includes(query) ||
        r.supervisee_name.toLowerCase().includes(query) ||
        r.relationship_type.toLowerCase().includes(query)
      );
    }

    setFilteredRelationships(filtered);
  }, [searchQuery, statusFilter, relationships]);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Active': return 'default';
      case 'Inactive': return 'secondary';
      case 'Completed': return 'outline';
      default: return 'outline';
    }
  };

  const handleManageStatus = (relationship: RelationshipWithDetails) => {
    setSelectedRelationship(relationship);
    setStatusDialogOpen(true);
  };

  const exportData = () => {
    // Simple CSV export
    const headers = ['Supervisor', 'Supervisee', 'Type', 'Status', 'Hours Completed', 'Hours Required', 'Pending Co-Signs'];
    const rows = filteredRelationships.map(r => [
      r.supervisor_name,
      r.supervisee_name,
      r.relationship_type,
      r.status,
      r.completed_hours,
      r.required_supervision_hours,
      r.pending_cosigns,
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `supervision-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();

    toast({
      title: 'Success',
      description: 'Supervision report exported',
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-muted-foreground">Loading supervision data...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Supervision Management</h1>
            <p className="text-muted-foreground mt-2">
              Manage all supervision relationships across the practice
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportData}>
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Create Relationship
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Relationships</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-2xl font-bold">{stats.totalRelationships}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Supervisors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-success" />
                <span className="text-2xl font-bold">{stats.activeSupervisors}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Trainees</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-accent" />
                <span className="text-2xl font-bold">{stats.activeSupervisees}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Hours Logged</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-2xl font-bold">{stats.totalHoursLogged}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Co-Signs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-warning" />
                <span className="text-2xl font-bold">{stats.pendingCosignatures}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>All Supervision Relationships</CardTitle>
            <CardDescription>View and manage all supervision relationships</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by supervisor, supervisee, or type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Relationships Table */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supervisor</TableHead>
                    <TableHead>Supervisee</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Hours Progress</TableHead>
                    <TableHead>Pending Co-Signs</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRelationships.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        No supervision relationships found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRelationships.map(rel => {
                      const progress = (rel.completed_hours / rel.required_supervision_hours) * 100;
                      return (
                        <TableRow key={rel.id}>
                          <TableCell className="font-medium">{rel.supervisor_name}</TableCell>
                          <TableCell>{rel.supervisee_name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{rel.relationship_type}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(rel.status)}>{rel.status}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span>{rel.completed_hours} / {rel.required_supervision_hours} hrs</span>
                                <span>{Math.round(progress)}%</span>
                              </div>
                              <Progress value={progress} className="h-2" />
                            </div>
                          </TableCell>
                          <TableCell>
                            {rel.pending_cosigns > 0 ? (
                              <Badge variant="destructive" className="gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {rel.pending_cosigns}
                              </Badge>
                            ) : (
                              <span className="text-sm text-muted-foreground">None</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(rel.start_date), { addSuffix: true })}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleManageStatus(rel)}
                            >
                              Manage
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Dialogs */}
        <SupervisionRelationshipDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onSuccess={() => {
            fetchRelationships();
            setCreateDialogOpen(false);
          }}
          supervisorId=""
        />

        {selectedRelationship && (
          <RelationshipStatusDialog
            open={statusDialogOpen}
            onOpenChange={setStatusDialogOpen}
            relationship={{
              id: selectedRelationship.id,
              status: selectedRelationship.status,
              start_date: selectedRelationship.start_date,
              end_date: selectedRelationship.end_date,
              supervisee: {
                first_name: selectedRelationship.supervisee_name.split(' ')[0],
                last_name: selectedRelationship.supervisee_name.split(' ')[1] || '',
              },
            }}
            onSuccess={() => {
              fetchRelationships();
              setStatusDialogOpen(false);
            }}
          />
        )}

        {/* Metrics and Notifications Tabs */}
        <Tabs defaultValue="overview" className="mt-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="metrics">
              <BarChart3 className="mr-2 h-4 w-4" />
              Metrics & Analytics
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="mr-2 h-4 w-4" />
              Notification Log
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            {/* This is where the existing content stays */}
          </TabsContent>

          <TabsContent value="metrics" className="mt-6">
            <CosignMetricsDashboard />
          </TabsContent>

          <TabsContent value="notifications" className="mt-6">
            <DetailedNotificationLog />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
