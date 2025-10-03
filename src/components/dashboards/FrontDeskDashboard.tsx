import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  Phone, 
  Users, 
  Clock, 
  CheckCircle2,
  AlertCircle,
  UserPlus,
  ClipboardList
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const FrontDeskDashboard = () => {
  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Scheduled today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Check-ins</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Patients checked in</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Waiting</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">In waiting room</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages</CardTitle>
            <Phone className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Pending callbacks</p>
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
            <CardDescription>Items requiring attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Return Calls</p>
                    <p className="text-xs text-muted-foreground">Patient inquiries</p>
                  </div>
                </div>
                <Badge variant="secondary">0</Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-4 w-4 text-warning" />
                  <div>
                    <p className="text-sm font-medium">Insurance Verification</p>
                    <p className="text-xs text-muted-foreground">Pending verification</p>
                  </div>
                </div>
                <Badge variant="secondary">0</Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-success" />
                  <div>
                    <p className="text-sm font-medium">New Patient Forms</p>
                    <p className="text-xs text-muted-foreground">Awaiting review</p>
                  </div>
                </div>
                <Badge variant="secondary">0</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Check-in Queue */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Check-in Queue
          </CardTitle>
          <CardDescription>Patients in waiting room</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No patients waiting</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common front desk tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Button variant="outline" className="h-auto flex flex-col gap-2 p-4">
              <UserPlus className="h-5 w-5" />
              <span className="text-sm">Check-in Patient</span>
            </Button>
            <Button variant="outline" className="h-auto flex flex-col gap-2 p-4">
              <Calendar className="h-5 w-5" />
              <span className="text-sm">Schedule</span>
            </Button>
            <Button variant="outline" className="h-auto flex flex-col gap-2 p-4">
              <Phone className="h-5 w-5" />
              <span className="text-sm">Log Call</span>
            </Button>
            <Button variant="outline" className="h-auto flex flex-col gap-2 p-4">
              <Users className="h-5 w-5" />
              <span className="text-sm">Patient Lookup</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
