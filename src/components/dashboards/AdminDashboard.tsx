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
import { useAuth } from '@/hooks/useAuth';

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="mb-2">
        <h2 className="text-3xl font-bold mb-2">Administrator Dashboard</h2>
        <p className="text-muted-foreground">
          Welcome back, {user?.email?.split('@')[0]}
        </p>
      </div>
      {/* System Health & Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <GradientCard gradient="success" className="hover:shadow-colored border-l-4 border-l-success">
          <GradientCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <GradientCardTitle className="text-sm font-medium">System Status</GradientCardTitle>
            <Activity className="h-5 w-5 text-success" />
          </GradientCardHeader>
          <GradientCardContent>
            <div className="text-3xl font-bold text-success">Operational</div>
            <p className="text-xs text-muted-foreground">All systems running smoothly</p>
          </GradientCardContent>
        </GradientCard>

        <GradientCard gradient="info" className="hover:shadow-colored border-l-4 border-l-primary">
          <GradientCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <GradientCardTitle className="text-sm font-medium">Active Users</GradientCardTitle>
            <Users className="h-5 w-5 text-primary" />
          </GradientCardHeader>
          <GradientCardContent>
            <div className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">0</div>
            <p className="text-xs text-muted-foreground">Currently logged in</p>
          </GradientCardContent>
        </GradientCard>

        <GradientCard gradient="warning" className="hover:shadow-colored border-l-4 border-l-warning">
          <GradientCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <GradientCardTitle className="text-sm font-medium">Pending Approvals</GradientCardTitle>
            <Clock className="h-5 w-5 text-warning" />
          </GradientCardHeader>
          <GradientCardContent>
            <div className="text-3xl font-bold text-warning">0</div>
            <p className="text-xs text-muted-foreground">Items awaiting review</p>
          </GradientCardContent>
        </GradientCard>

        <GradientCard gradient="secondary" className="hover:shadow-colored border-l-4 border-l-secondary">
          <GradientCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <GradientCardTitle className="text-sm font-medium">Compliance Alerts</GradientCardTitle>
            <AlertCircle className="h-5 w-5 text-destructive" />
          </GradientCardHeader>
          <GradientCardContent>
            <div className="text-3xl font-bold text-destructive">0</div>
            <p className="text-xs text-muted-foreground">Issues requiring attention</p>
          </GradientCardContent>
        </GradientCard>
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
