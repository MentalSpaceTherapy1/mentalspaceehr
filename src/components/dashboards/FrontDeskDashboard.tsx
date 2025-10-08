import { useNavigate } from 'react-router-dom';
import { GradientCard, GradientCardContent, GradientCardDescription, GradientCardHeader, GradientCardTitle } from '@/components/ui/gradient-card';
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
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <GradientCard gradient="info" className="hover:shadow-colored border-l-4 border-l-primary">
          <GradientCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <GradientCardTitle className="text-sm font-medium">Today's Appointments</GradientCardTitle>
            <Calendar className="h-5 w-5 text-primary" />
          </GradientCardHeader>
          <GradientCardContent>
            <div className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">0</div>
            <p className="text-xs text-muted-foreground">Scheduled today</p>
          </GradientCardContent>
        </GradientCard>

        <GradientCard gradient="success" className="hover:shadow-colored border-l-4 border-l-success">
          <GradientCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <GradientCardTitle className="text-sm font-medium">Check-ins</GradientCardTitle>
            <CheckCircle2 className="h-5 w-5 text-success" />
          </GradientCardHeader>
          <GradientCardContent>
            <div className="text-3xl font-bold text-success">0</div>
            <p className="text-xs text-muted-foreground">Patients checked in</p>
          </GradientCardContent>
        </GradientCard>

        <GradientCard gradient="warning" className="hover:shadow-colored border-l-4 border-l-warning">
          <GradientCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <GradientCardTitle className="text-sm font-medium">Waiting</GradientCardTitle>
            <Clock className="h-5 w-5 text-warning" />
          </GradientCardHeader>
          <GradientCardContent>
            <div className="text-3xl font-bold text-warning">0</div>
            <p className="text-xs text-muted-foreground">In waiting room</p>
          </GradientCardContent>
        </GradientCard>

        <GradientCard gradient="secondary" className="hover:shadow-colored border-l-4 border-l-secondary">
          <GradientCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <GradientCardTitle className="text-sm font-medium">Messages</GradientCardTitle>
            <Phone className="h-5 w-5 text-secondary" />
          </GradientCardHeader>
          <GradientCardContent>
            <div className="text-3xl font-bold text-secondary">0</div>
            <p className="text-xs text-muted-foreground">Pending callbacks</p>
          </GradientCardContent>
        </GradientCard>
      </div>

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
            <GradientCardDescription>Items requiring attention</GradientCardDescription>
          </GradientCardHeader>
          <GradientCardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Return Calls</p>
                    <p className="text-xs text-muted-foreground">Patient inquiries</p>
                  </div>
                </div>
                <Badge variant="secondary">0</Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-4 w-4 text-warning" />
                  <div>
                    <p className="text-sm font-medium">Insurance Verification</p>
                    <p className="text-xs text-muted-foreground">Pending verification</p>
                  </div>
                </div>
                <Badge variant="secondary">0</Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
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
          </GradientCardContent>
        </GradientCard>
      </div>

      {/* Check-in Queue */}
      <GradientCard gradient="accent" className="hover:shadow-colored">
        <GradientCardHeader>
          <GradientCardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-accent" />
            Check-in Queue
          </GradientCardTitle>
          <GradientCardDescription>Patients in waiting room</GradientCardDescription>
        </GradientCardHeader>
        <GradientCardContent>
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No patients waiting</p>
            </div>
          </div>
        </GradientCardContent>
      </GradientCard>

      {/* Quick Actions */}
      <GradientCard gradient="primary" className="hover:shadow-colored">
        <GradientCardHeader>
          <GradientCardTitle>Quick Actions</GradientCardTitle>
          <GradientCardDescription>Common front desk tasks</GradientCardDescription>
        </GradientCardHeader>
        <GradientCardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Button 
              variant="outline" 
              className="h-auto flex flex-col gap-2 p-4 hover:bg-primary/5 hover:border-primary transition-all"
              onClick={() => navigate('/schedule')}
            >
              <UserPlus className="h-5 w-5" />
              <span className="text-sm">Check-in Patient</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto flex flex-col gap-2 p-4 hover:bg-accent/5 hover:border-accent transition-all"
              onClick={() => navigate('/schedule')}
            >
              <Calendar className="h-5 w-5" />
              <span className="text-sm">Schedule</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto flex flex-col gap-2 p-4 hover:bg-secondary/5 hover:border-secondary transition-all"
              onClick={() => navigate('/messages')}
            >
              <Phone className="h-5 w-5" />
              <span className="text-sm">Log Call</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto flex flex-col gap-2 p-4 hover:bg-primary/5 hover:border-primary transition-all"
              onClick={() => navigate('/clients')}
            >
              <Users className="h-5 w-5" />
              <span className="text-sm">Patient Lookup</span>
            </Button>
          </div>
        </GradientCardContent>
      </GradientCard>
    </div>
  );
};
