import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  FileCheck, 
  Clock, 
  AlertCircle, 
  Calendar,
  TrendingUp,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export const SupervisorDashboard = () => {
  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Supervisees</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Under supervision</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Co-Signs</CardTitle>
            <FileCheck className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Notes awaiting signature</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Supervision Hours</CardTitle>
            <Clock className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Hours this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance Issues</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Items needing attention</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Supervisees Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Supervisees
            </CardTitle>
            <CardDescription>Current supervision relationships</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center p-8">
              <div className="text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No active supervisees</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Contact an administrator to set up supervision relationships
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes Pending Co-Signature */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5" />
              Notes Pending Co-Signature
            </CardTitle>
            <CardDescription>Documents awaiting your approval</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-center p-8">
                <div className="text-center">
                  <FileCheck className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">All caught up!</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    No notes pending co-signature
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Supervision Hours Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Supervision Hours Summary
          </CardTitle>
          <CardDescription>Hours provided by supervisee</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-center p-8">
              <p className="text-sm text-muted-foreground">No supervision hours recorded</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Supervisee Compliance Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Supervisee Compliance Status
            </CardTitle>
            <CardDescription>Documentation and licensing compliance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-success" />
                  <div>
                    <p className="text-sm font-medium">Documentation Current</p>
                    <p className="text-xs text-muted-foreground">All notes up to date</p>
                  </div>
                </div>
                <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                  0
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-4 w-4 text-warning" />
                  <div>
                    <p className="text-sm font-medium">Documentation Overdue</p>
                    <p className="text-xs text-muted-foreground">Needs attention</p>
                  </div>
                </div>
                <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                  0
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium">License Renewals</p>
                    <p className="text-xs text-muted-foreground">Due within 90 days</p>
                  </div>
                </div>
                <Badge variant="secondary">0</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Supervision Meetings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Supervision Meetings
            </CardTitle>
            <CardDescription>Scheduled supervision sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center p-8">
              <div className="text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No upcoming meetings</p>
                <Button variant="link" className="mt-2">Schedule supervision</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
            <Button variant="outline" className="h-auto flex flex-col gap-2 p-4">
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
  );
};
