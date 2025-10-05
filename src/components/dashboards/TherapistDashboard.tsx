import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GradientCard, GradientCardContent, GradientCardDescription, GradientCardHeader, GradientCardTitle } from '@/components/ui/gradient-card';
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
import { ComplianceAlerts } from './ComplianceAlerts';

export const TherapistDashboard = () => {
  return (
    <div className="space-y-6">
      {/* Today's Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <GradientCard gradient="primary" className="hover:shadow-colored border-l-4 border-l-primary">
          <GradientCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <GradientCardTitle className="text-sm font-medium">Today's Sessions</GradientCardTitle>
            <Calendar className="h-5 w-5 text-primary" />
          </GradientCardHeader>
          <GradientCardContent>
            <div className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">0</div>
            <p className="text-xs text-muted-foreground">Scheduled appointments</p>
          </GradientCardContent>
        </GradientCard>

        <GradientCard gradient="warning" className="hover:shadow-colored border-l-4 border-l-warning">
          <GradientCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <GradientCardTitle className="text-sm font-medium">Pending Notes</GradientCardTitle>
            <FileText className="h-5 w-5 text-warning" />
          </GradientCardHeader>
          <GradientCardContent>
            <div className="text-3xl font-bold text-warning">0</div>
            <p className="text-xs text-muted-foreground">Unsigned notes</p>
          </GradientCardContent>
        </GradientCard>

        <GradientCard gradient="accent" className="hover:shadow-colored border-l-4 border-l-accent">
          <GradientCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <GradientCardTitle className="text-sm font-medium">Active Clients</GradientCardTitle>
            <Users className="h-5 w-5 text-accent" />
          </GradientCardHeader>
          <GradientCardContent>
            <div className="text-3xl font-bold text-accent">0</div>
            <p className="text-xs text-muted-foreground">On your caseload</p>
          </GradientCardContent>
        </GradientCard>

        <GradientCard gradient="success" className="hover:shadow-colored border-l-4 border-l-success">
          <GradientCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <GradientCardTitle className="text-sm font-medium">Compliance</GradientCardTitle>
            <CheckCircle2 className="h-5 w-5 text-success" />
          </GradientCardHeader>
          <GradientCardContent>
            <div className="text-3xl font-bold text-success">100%</div>
            <p className="text-xs text-muted-foreground">Documentation on time</p>
          </GradientCardContent>
        </GradientCard>
      </div>

      {/* Compliance Alerts Section */}
      <ComplianceAlerts />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Schedule */}
        <GradientCard gradient="primary" className="hover:shadow-colored">
          <GradientCardHeader>
            <GradientCardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Today's Schedule
            </GradientCardTitle>
            <GradientCardDescription>
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </GradientCardDescription>
          </GradientCardHeader>
          <GradientCardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-center p-8 text-center">
                <div>
                  <Calendar className="h-12 w-12 text-primary/50 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No appointments scheduled</p>
                  <Button variant="default" className="mt-2 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90">Schedule an appointment</Button>
                </div>
              </div>
            </div>
          </GradientCardContent>
        </GradientCard>

        {/* Pending Tasks */}
        <GradientCard gradient="secondary" className="hover:shadow-colored">
          <GradientCardHeader>
            <GradientCardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-secondary" />
              Pending Tasks
            </GradientCardTitle>
            <GradientCardDescription>Items requiring your attention</GradientCardDescription>
          </GradientCardHeader>
          <GradientCardContent>
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
            </div>
          </GradientCardContent>
        </GradientCard>
      </div>

      {/* Quick Actions & Productivity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GradientCard gradient="accent" className="hover:shadow-colored">
          <GradientCardHeader>
            <GradientCardTitle>Quick Actions</GradientCardTitle>
            <GradientCardDescription>Common clinical tasks</GradientCardDescription>
          </GradientCardHeader>
          <GradientCardContent>
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
          </GradientCardContent>
        </GradientCard>

        <GradientCard gradient="primary" className="hover:shadow-colored">
          <GradientCardHeader>
            <GradientCardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Productivity Metrics
            </GradientCardTitle>
            <GradientCardDescription>Your performance this week</GradientCardDescription>
          </GradientCardHeader>
          <GradientCardContent>
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
          </GradientCardContent>
        </GradientCard>
      </div>

      {/* Recent Client Activity */}
      <GradientCard gradient="secondary" className="hover:shadow-colored">
        <GradientCardHeader>
          <GradientCardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-secondary" />
            Recent Client Activity
          </GradientCardTitle>
          <GradientCardDescription>Latest interactions with your clients</GradientCardDescription>
        </GradientCardHeader>
        <GradientCardContent>
          <div className="flex items-center justify-center p-8">
            <p className="text-sm text-muted-foreground">No recent activity</p>
          </div>
        </GradientCardContent>
      </GradientCard>
    </div>
  );
};
