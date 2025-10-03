import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GradientCard, GradientCardContent, GradientCardDescription, GradientCardHeader, GradientCardTitle } from '@/components/ui/gradient-card';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  FileText, 
  TrendingUp, 
  Users,
  UserPlus,
  FileSpreadsheet
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

export const AdminDashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* System Health & Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <Activity className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">Operational</div>
            <p className="text-xs text-muted-foreground">All systems running smoothly</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Currently logged in</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Items awaiting review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance Alerts</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Issues requiring attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Financial Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Financial Summary
          </CardTitle>
          <CardDescription>Revenue overview for current period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Today</p>
              <p className="text-2xl font-bold">$0.00</p>
              <p className="text-xs text-success flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                0% from yesterday
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">This Week</p>
              <p className="text-2xl font-bold">$0.00</p>
              <p className="text-xs text-success flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                0% from last week
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">This Month</p>
              <p className="text-2xl font-bold">$0.00</p>
              <p className="text-xs text-success flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                0% from last month
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compliance Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Compliance Alerts
            </CardTitle>
            <CardDescription>Items requiring immediate attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-warning" />
                  <div>
                    <p className="text-sm font-medium">Overdue Notes</p>
                    <p className="text-xs text-muted-foreground">0 notes past due date</p>
                  </div>
                </div>
                <Badge variant="secondary">0</Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-warning" />
                  <div>
                    <p className="text-sm font-medium">License Expirations</p>
                    <p className="text-xs text-muted-foreground">Within 90 days</p>
                  </div>
                </div>
                <Badge variant="secondary">0</Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <div>
                    <p className="text-sm font-medium">Unlocking Requests</p>
                    <p className="text-xs text-muted-foreground">Pending approval</p>
                  </div>
                </div>
                <Badge variant="secondary">0</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent System Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent System Activity
            </CardTitle>
            <CardDescription>Latest administrative actions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-2 w-2 rounded-full bg-success mt-2" />
                <div className="flex-1">
                  <p className="text-sm">No recent activity</p>
                  <p className="text-xs text-muted-foreground">System is ready</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              className="h-auto flex flex-col items-center gap-2 p-4"
              onClick={() => navigate('/admin/users/create')}
            >
              <UserPlus className="h-6 w-6" />
              <span>Add New User</span>
            </Button>

            <Button 
              variant="outline" 
              className="h-auto flex flex-col items-center gap-2 p-4"
              onClick={() => navigate('/admin/practice-settings')}
            >
              <Activity className="h-6 w-6" />
              <span>Practice Settings</span>
            </Button>

            <Button 
              variant="outline" 
              className="h-auto flex flex-col items-center gap-2 p-4"
            >
              <FileSpreadsheet className="h-6 w-6" />
              <span>View Reports</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
