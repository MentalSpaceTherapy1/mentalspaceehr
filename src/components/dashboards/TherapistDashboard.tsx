import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  Clock, 
  FileText, 
  AlertCircle, 
  CheckCircle2,
  TrendingUp,
  Users,
  ClipboardList
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export const TherapistDashboard = () => {
  return (
    <div className="space-y-6">
      {/* Today's Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Sessions</CardTitle>
            <Calendar className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Scheduled appointments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Notes</CardTitle>
            <FileText className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Unsigned notes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
            <Users className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">On your caseload</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">100%</div>
            <p className="text-xs text-muted-foreground">Documentation on time</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Today's Schedule
            </CardTitle>
            <CardDescription>
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-center p-8 text-center">
                <div>
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No appointments scheduled</p>
                  <Button variant="link" className="mt-2">Schedule an appointment</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Pending Tasks
            </CardTitle>
            <CardDescription>Items requiring your attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-warning" />
                  <div>
                    <p className="text-sm font-medium">Unsigned Notes</p>
                    <p className="text-xs text-muted-foreground">Complete documentation</p>
                  </div>
                </div>
                <Badge variant="secondary">0</Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <ClipboardList className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Treatment Plans Due</p>
                    <p className="text-xs text-muted-foreground">Review and update</p>
                  </div>
                </div>
                <Badge variant="secondary">0</Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <div>
                    <p className="text-sm font-medium">Compliance Warnings</p>
                    <p className="text-xs text-muted-foreground">Action required</p>
                  </div>
                </div>
                <Badge variant="secondary">0</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Productivity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common clinical tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-auto flex flex-col gap-2 p-4">
                <FileText className="h-5 w-5" />
                <span className="text-sm">New Note</span>
              </Button>
              <Button variant="outline" className="h-auto flex flex-col gap-2 p-4">
                <Calendar className="h-5 w-5" />
                <span className="text-sm">Schedule</span>
              </Button>
              <Button variant="outline" className="h-auto flex flex-col gap-2 p-4">
                <Users className="h-5 w-5" />
                <span className="text-sm">Clients</span>
              </Button>
              <Button variant="outline" className="h-auto flex flex-col gap-2 p-4">
                <ClipboardList className="h-5 w-5" />
                <span className="text-sm">To-Do</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Productivity Metrics
            </CardTitle>
            <CardDescription>Your performance this week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Sessions Completed</span>
                  <span className="font-medium">0</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: '0%' }} />
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Documentation Rate</span>
                  <span className="font-medium">100%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-success" style={{ width: '100%' }} />
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Average Response Time</span>
                <span className="font-medium">N/A</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Client Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Recent Client Activity
          </CardTitle>
          <CardDescription>Latest interactions with your clients</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <p className="text-sm text-muted-foreground">No recent activity</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
