import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProgressTracker } from '@/hooks/usePortalProgress';
import { format } from 'date-fns';
import { Download, Calendar, TrendingUp } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface TrackerDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tracker: ProgressTracker;
}

export function TrackerDetailsDialog({ open, onOpenChange, tracker }: TrackerDetailsDialogProps) {
  const exportToCSV = () => {
    const headers = ['Date', 'Time', 'Data', 'Notes'];
    const rows = tracker.entries.map(entry => [
      entry.entryDate,
      entry.entryTime || '',
      JSON.stringify(entry.data),
      entry.notes || '',
    ]);
    
    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tracker.trackerTitle.replace(/\s+/g, '_')}_entries.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const prepareChartData = () => {
    if (tracker.trackerType === 'Symptom Tracker') {
      // For symptom trackers, show trends for each symptom
      return tracker.entries
        .slice(-30) // Last 30 entries
        .map(entry => ({
          date: format(new Date(entry.entryDate), 'MM/dd'),
          ...entry.data.symptomRatings,
        }));
    } else if (tracker.trackerType === 'Mood Log') {
      return tracker.entries
        .slice(-30)
        .map(entry => ({
          date: format(new Date(entry.entryDate), 'MM/dd'),
          intensity: entry.data.intensity,
          mood: entry.data.mood,
        }));
    } else if (tracker.trackerType === 'Goal Progress') {
      return tracker.entries
        .slice(-30)
        .map(entry => ({
          date: format(new Date(entry.entryDate), 'MM/dd'),
          progress: entry.data.progress,
        }));
    }
    return [];
  };

  const chartData = prepareChartData();
  const hasChartData = chartData.length > 0;

  const renderDataCell = (data: any) => {
    if (typeof data === 'object') {
      return (
        <div className="text-xs space-y-1">
          {Object.entries(data).map(([key, value]) => (
            <div key={key}>
              <span className="font-medium">{key}:</span> {String(value)}
            </div>
          ))}
        </div>
      );
    }
    return String(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="space-y-2">
            <DialogTitle className="text-2xl">{tracker.trackerTitle}</DialogTitle>
            <DialogDescription>
              <div className="flex flex-wrap gap-2 items-center">
                <Badge>{tracker.trackerType}</Badge>
                <Badge variant="outline">{tracker.frequency}</Badge>
                <Badge variant={tracker.status === 'Active' ? 'default' : 'secondary'}>
                  {tracker.status}
                </Badge>
                {tracker.assignedByName && (
                  <span className="text-sm">
                    Assigned by {tracker.assignedByName} on {format(new Date(tracker.assignedDate), 'MMM d, yyyy')}
                  </span>
                )}
              </div>
            </DialogDescription>
          </div>
        </DialogHeader>

        <Tabs defaultValue="history" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="history">Entry History</TabsTrigger>
            <TabsTrigger value="charts" disabled={!hasChartData}>
              Trends & Charts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                {tracker.entries.length} total entries
              </p>
              <Button variant="outline" size="sm" onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>

            {tracker.entries.length > 0 ? (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tracker.entries
                      .sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime())
                      .map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="font-medium">
                            {format(new Date(entry.entryDate), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>{entry.entryTime || '-'}</TableCell>
                          <TableCell>{renderDataCell(entry.data)}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            {entry.notes || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12 border rounded-lg bg-muted/50">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No entries yet</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="charts" className="space-y-4">
            {hasChartData && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Trend Analysis (Last 30 Entries)
                  </h3>
                  
                  {tracker.trackerType === 'Symptom Tracker' && (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis domain={[0, 10]} />
                        <Tooltip />
                        <Legend />
                        {tracker.symptoms?.map((symptom, index) => (
                          <Line
                            key={symptom.symptomName}
                            type="monotone"
                            dataKey={symptom.symptomName}
                            stroke={`hsl(${index * 60}, 70%, 50%)`}
                            strokeWidth={2}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                  
                  {tracker.trackerType === 'Mood Log' && (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis domain={[1, 10]} />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="intensity"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          name="Mood Intensity"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                  
                  {tracker.trackerType === 'Goal Progress' && (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="progress" fill="hsl(var(--primary))" name="Progress %" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
