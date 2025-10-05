import { useState } from 'react';
import { PortalLayout } from '@/components/portal/PortalLayout';
import { usePortalProgress, ProgressTracker } from '@/hooks/usePortalProgress';
import { usePortalAccount } from '@/hooks/usePortalAccount';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Activity, Target, BookOpen, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { AddTrackerEntryDialog } from '@/components/portal/AddTrackerEntryDialog';
import { TrackerDetailsDialog } from '@/components/portal/TrackerDetailsDialog';
import { useToast } from '@/hooks/use-toast';

export default function PortalProgress() {
  const { portalContext } = usePortalAccount();
  const { trackers, loading, addEntry, refreshTrackers } = usePortalProgress(portalContext?.client?.id);
  const { toast } = useToast();
  
  const [selectedTracker, setSelectedTracker] = useState<ProgressTracker | null>(null);
  const [addEntryDialogOpen, setAddEntryDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  
  const handleAddEntry = (tracker: ProgressTracker) => {
    setSelectedTracker(tracker);
    setAddEntryDialogOpen(true);
  };
  
  const handleViewDetails = (tracker: ProgressTracker) => {
    setSelectedTracker(tracker);
    setDetailsDialogOpen(true);
  };
  
  const handleSubmitEntry = async (data: any) => {
    if (!selectedTracker) return;
    
    try {
      await addEntry(selectedTracker.id, data);
      await refreshTrackers();
      toast({
        title: 'Success',
        description: 'Entry added successfully',
      });
    } catch (error) {
      throw error;
    }
  };

  const activeTrackers = trackers.filter(t => t.status === 'Active');
  const completedTrackers = trackers.filter(t => t.status === 'Completed');

  const getTrackerIcon = (type: string) => {
    switch (type) {
      case 'Symptom Tracker':
        return <Activity className="h-5 w-5" />;
      case 'Mood Log':
        return <LineChart className="h-5 w-5" />;
      case 'Goal Progress':
        return <Target className="h-5 w-5" />;
      case 'Journal':
        return <BookOpen className="h-5 w-5" />;
      default:
        return <Calendar className="h-5 w-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'default';
      case 'Completed':
        return 'secondary';
      case 'Paused':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  if (loading) {
    return (
      <PortalLayout>
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Progress Tracking</h1>
          <p className="text-muted-foreground">Track your symptoms, mood, and treatment progress</p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Trackers</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeTrackers.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {trackers.reduce((sum, t) => sum + t.entries.length, 0)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Goals</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedTrackers.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Trackers List */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all">All Trackers</TabsTrigger>
            <TabsTrigger value="active">Active ({activeTrackers.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completedTrackers.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            {trackers.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No trackers assigned yet</p>
                  <p className="text-sm mt-2">Your clinician will assign trackers to help monitor your progress</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {trackers.map((tracker) => (
                  <Card key={tracker.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            {getTrackerIcon(tracker.trackerType)}
                            <CardTitle className="text-base">{tracker.trackerTitle}</CardTitle>
                          </div>
                          <CardDescription>
                            {tracker.trackerType} • {tracker.frequency}
                          </CardDescription>
                        </div>
                        <Badge variant={getStatusColor(tracker.status)}>
                          {tracker.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Total Entries:</span>
                          <span className="font-medium">{tracker.entries.length}</span>
                        </div>
                        {tracker.entries.length > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Last Entry:</span>
                            <span className="font-medium">
                              {format(new Date(tracker.entries[0].entryDate), 'MMM dd, yyyy')}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Assigned:</span>
                          <span className="font-medium">
                            {format(new Date(tracker.assignedDate), 'MMM dd, yyyy')}
                          </span>
                        </div>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Button 
                          className="flex-1" 
                          size="sm"
                          onClick={() => handleAddEntry(tracker)}
                        >
                          Add Entry
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewDetails(tracker)}
                        >
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="active" className="mt-6">
            {activeTrackers.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No active trackers</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {activeTrackers.map((tracker) => (
                  <Card key={tracker.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            {getTrackerIcon(tracker.trackerType)}
                            <CardTitle className="text-base">{tracker.trackerTitle}</CardTitle>
                          </div>
                          <CardDescription>
                            {tracker.trackerType} • {tracker.frequency}
                          </CardDescription>
                        </div>
                        <Badge variant="default">Active</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Total Entries:</span>
                          <span className="font-medium">{tracker.entries.length}</span>
                        </div>
                        {tracker.entries.length > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Last Entry:</span>
                            <span className="font-medium">
                              {format(new Date(tracker.entries[0].entryDate), 'MMM dd, yyyy')}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Button 
                          className="flex-1" 
                          size="sm"
                          onClick={() => handleAddEntry(tracker)}
                        >
                          Add Entry
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewDetails(tracker)}
                        >
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-6">
            {completedTrackers.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12 text-muted-foreground">
                  <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No completed trackers</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {completedTrackers.map((tracker) => (
                  <Card key={tracker.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            {getTrackerIcon(tracker.trackerType)}
                            <CardTitle className="text-base">{tracker.trackerTitle}</CardTitle>
                          </div>
                          <CardDescription>
                            {tracker.trackerType} • {tracker.frequency}
                          </CardDescription>
                        </div>
                        <Badge variant="secondary">Completed</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Total Entries:</span>
                          <span className="font-medium">{tracker.entries.length}</span>
                        </div>
                      </div>
                      <div className="mt-4">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full"
                          onClick={() => handleViewDetails(tracker)}
                        >
                          View History
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Dialogs */}
      {selectedTracker && (
        <>
          <AddTrackerEntryDialog
            open={addEntryDialogOpen}
            onOpenChange={setAddEntryDialogOpen}
            tracker={selectedTracker}
            onSubmit={handleSubmitEntry}
          />
          
          <TrackerDetailsDialog
            open={detailsDialogOpen}
            onOpenChange={setDetailsDialogOpen}
            tracker={selectedTracker}
          />
        </>
      )}
    </PortalLayout>
  );
}
