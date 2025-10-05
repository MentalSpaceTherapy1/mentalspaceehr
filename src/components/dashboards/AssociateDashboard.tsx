import { useAuth } from "@/hooks/useAuth";
import { useAssociateSupervision } from "@/hooks/useAssociateSupervision";
import { useAssociateCosignatures } from "@/hooks/useAssociateCosignatures";
import { useSupervisionSessions } from "@/hooks/useSupervisionSessions";
import { useAppointments } from "@/hooks/useAppointments";
import { GradientCard, GradientCardContent, GradientCardHeader, GradientCardTitle } from "@/components/ui/gradient-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  GraduationCap, 
  FileSignature, 
  Clock, 
  Calendar,
  ShieldAlert,
  Mail,
  Phone,
  User,
  FileText,
  CalendarPlus,
  Users,
  AlertCircle
} from "lucide-react";
import { format, isToday, differenceInDays, parseISO } from "date-fns";
import { Link } from "react-router-dom";

export function AssociateDashboard() {
  const { user } = useAuth();
  const { relationship, loading: loadingRel } = useAssociateSupervision(user?.id);
  const { cosignatures, loading: loadingCosig } = useAssociateCosignatures(user?.id);
  const { sessions, hours, loading: loadingSessions } = useSupervisionSessions(relationship?.id);
  const { appointments } = useAppointments(undefined, undefined, user?.id || '');

  const todayAppointments = appointments.filter(apt => {
    const aptDate = new Date(apt.appointment_date);
    return isToday(aptDate) && apt.status === 'Scheduled';
  });

  const overdueNotes = cosignatures.filter(c => c.status === 'Overdue');
  const pendingNotes = cosignatures.filter(c => c.status === 'Pending Supervisor Review');

  const requiredHours = relationship?.required_supervision_hours || 0;
  const completedHours = hours.total;
  const progressPercentage = requiredHours > 0 ? (completedHours / requiredHours) * 100 : 0;

  const getDaysWaiting = (createdDate: string) => {
    return differenceInDays(new Date(), new Date(createdDate));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Associate/Trainee Dashboard</h1>
          <p className="text-muted-foreground mt-1">Track your supervision progress and training requirements</p>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <GradientCard gradient="accent" className="hover:shadow-colored border-l-4 border-l-accent">
          <GradientCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <GradientCardTitle className="text-sm font-medium">Supervision Status</GradientCardTitle>
            <GraduationCap className="h-5 w-5 text-accent" />
          </GradientCardHeader>
          <GradientCardContent>
            <div className="text-2xl font-bold text-accent">{relationship?.status || "Inactive"}</div>
            <p className="text-xs text-muted-foreground">
              {relationship ? `${relationship.supervisee?.first_name} ${relationship.supervisee?.last_name}` : "Contact administrator"}
            </p>
          </GradientCardContent>
        </GradientCard>
        
        <GradientCard gradient={overdueNotes.length > 0 ? "warning" : "info"} className={`hover:shadow-colored border-l-4 ${overdueNotes.length > 0 ? 'border-l-warning' : 'border-l-primary'}`}>
          <GradientCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <GradientCardTitle className="text-sm font-medium">Pending Co-Signs</GradientCardTitle>
            <FileSignature className={`h-5 w-5 ${overdueNotes.length > 0 ? 'text-warning' : 'text-primary'}`} />
          </GradientCardHeader>
          <GradientCardContent>
            <div className={`text-3xl font-bold ${overdueNotes.length > 0 ? 'text-warning' : 'text-primary'}`}>
              {cosignatures.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {overdueNotes.length > 0 ? `${overdueNotes.length} overdue` : "All on track"}
            </p>
          </GradientCardContent>
        </GradientCard>
        
        <GradientCard gradient="success" className="hover:shadow-colored border-l-4 border-l-success">
          <GradientCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <GradientCardTitle className="text-sm font-medium">Supervision Hours</GradientCardTitle>
            <Clock className="h-5 w-5 text-success" />
          </GradientCardHeader>
          <GradientCardContent>
            <div className="text-2xl font-bold text-success">{completedHours.toFixed(1)} / {requiredHours}</div>
            <p className="text-xs text-muted-foreground">{progressPercentage.toFixed(0)}% complete</p>
          </GradientCardContent>
        </GradientCard>
        
        <GradientCard gradient="primary" className="hover:shadow-colored border-l-4 border-l-primary">
          <GradientCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <GradientCardTitle className="text-sm font-medium">Today's Sessions</GradientCardTitle>
            <Calendar className="h-5 w-5 text-primary" />
          </GradientCardHeader>
          <GradientCardContent>
            <div className="text-3xl font-bold text-primary">{todayAppointments.length}</div>
            <p className="text-xs text-muted-foreground">
              {todayAppointments.length === 0 ? "No sessions scheduled" : "Scheduled appointments"}
            </p>
          </GradientCardContent>
        </GradientCard>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Supervision Relationship Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Supervision Relationship
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {relationship ? (
                <>
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Supervisor</p>
                        <p className="font-medium">
                          {relationship.supervisee?.first_name} {relationship.supervisee?.last_name}
                        </p>
                      </div>
                      <Badge variant={relationship.status === 'Active' ? 'default' : 'secondary'}>
                        {relationship.status}
                      </Badge>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Start Date</p>
                        <p className="font-medium">{format(new Date(relationship.start_date), 'MMM dd, yyyy')}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Type</p>
                        <p className="font-medium">{relationship.relationship_type}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Required Hours</p>
                      <div className="space-y-1">
                        {relationship.required_direct_hours && (
                          <div className="flex justify-between text-sm">
                            <span>Direct Clinical:</span>
                            <span className="font-medium">{relationship.required_direct_hours}h</span>
                          </div>
                        )}
                        {relationship.required_indirect_hours && (
                          <div className="flex justify-between text-sm">
                            <span>Indirect/Admin:</span>
                            <span className="font-medium">{relationship.required_indirect_hours}h</span>
                          </div>
                        )}
                        {relationship.required_group_hours && (
                          <div className="flex justify-between text-sm">
                            <span>Group Supervision:</span>
                            <span className="font-medium">{relationship.required_group_hours}h</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <p className="text-sm font-medium">Contact Information</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          <span>{relationship.supervisee?.email}</span>
                        </div>
                      </div>
                    </div>

                    <Button className="w-full" asChild>
                      <a href={`mailto:${relationship.supervisee?.email}`}>
                        <Mail className="mr-2 h-4 w-4" />
                        Contact Supervisor
                      </a>
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-6">
                  <ShieldAlert className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No active supervision relationship</p>
                  <p className="text-sm text-muted-foreground mt-1">Contact your administrator</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Supervision Hours Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Supervision Hours Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Overall Progress</span>
                  <span className="text-sm text-muted-foreground">
                    {completedHours.toFixed(1)} / {requiredHours} hours
                  </span>
                </div>
                <Progress value={progressPercentage} className="h-3" />
                <p className="text-xs text-muted-foreground mt-1">
                  {(requiredHours - completedHours).toFixed(1)} hours remaining
                </p>
              </div>

              <Separator />

              <div className="space-y-3">
                <p className="text-sm font-medium">Hours by Type</p>
                
                {relationship?.required_direct_hours && (
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Direct Clinical</span>
                      <span className="text-muted-foreground">
                        {hours.direct.toFixed(1)} / {relationship.required_direct_hours}h
                      </span>
                    </div>
                    <Progress 
                      value={(hours.direct / relationship.required_direct_hours) * 100} 
                      className="h-2"
                    />
                  </div>
                )}

                {relationship?.required_indirect_hours && (
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Indirect/Admin</span>
                      <span className="text-muted-foreground">
                        {hours.indirect.toFixed(1)} / {relationship.required_indirect_hours}h
                      </span>
                    </div>
                    <Progress 
                      value={(hours.indirect / relationship.required_indirect_hours) * 100} 
                      className="h-2"
                    />
                  </div>
                )}

                {relationship?.required_group_hours && (
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Group Supervision</span>
                      <span className="text-muted-foreground">
                        {hours.group.toFixed(1)} / {relationship.required_group_hours}h
                      </span>
                    </div>
                    <Progress 
                      value={(hours.group / relationship.required_group_hours) * 100} 
                      className="h-2"
                    />
                  </div>
                )}
              </div>

              {sessions.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium mb-2">Recent Sessions</p>
                    <div className="space-y-2">
                      {sessions.slice(0, 3).map((session) => (
                        <div key={session.id} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            {format(new Date(session.session_date), 'MMM dd, yyyy')}
                          </span>
                          <span className="font-medium">{session.session_duration_minutes} min</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Notes Awaiting Co-Signature */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSignature className="h-5 w-5" />
                Notes Awaiting Co-Signature
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cosignatures.length === 0 ? (
                <div className="text-center py-6">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No notes awaiting co-signature</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cosignatures.map((cosig) => {
                    const daysWaiting = getDaysWaiting(cosig.created_date);
                    const isOverdue = cosig.status === 'Overdue';
                    
                    return (
                      <div key={cosig.id} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <p className="font-medium text-sm">
                              {cosig.client?.first_name} {cosig.client?.last_name}
                            </p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {cosig.note_type.replace('_', ' ')}
                            </p>
                          </div>
                          <Badge variant={isOverdue ? 'destructive' : 'secondary'} className="text-xs">
                            {isOverdue ? 'Overdue' : 'Pending'}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            {daysWaiting} {daysWaiting === 1 ? 'day' : 'days'} waiting
                          </span>
                          {isOverdue && (
                            <div className="flex items-center gap-1 text-destructive">
                              <AlertCircle className="h-3 w-3" />
                              <span>Action needed</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Trainee Notice */}
          <Card className="border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-900 dark:text-amber-100">
                <ShieldAlert className="h-5 w-5" />
                Trainee Requirements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-amber-900 dark:text-amber-100">
              <p className="flex items-start gap-2">
                <span className="text-amber-600 dark:text-amber-400">•</span>
                All clinical notes require supervisor co-signature
              </p>
              <p className="flex items-start gap-2">
                <span className="text-amber-600 dark:text-amber-400">•</span>
                Regular supervision sessions are mandatory
              </p>
              <p className="flex items-start gap-2">
                <span className="text-amber-600 dark:text-amber-400">•</span>
                Certain features require supervisor approval
              </p>
            </CardContent>
          </Card>

          {/* Today's Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Today's Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              {todayAppointments.length === 0 ? (
                <div className="text-center py-6">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No appointments today</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {todayAppointments.map((apt) => (
                    <div key={apt.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                      <div>
                        <p className="font-medium text-sm">{apt.start_time}</p>
                        <p className="text-xs text-muted-foreground">{apt.appointment_type}</p>
                      </div>
                      <Badge variant="outline">{apt.service_location}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" variant="outline" asChild>
                <Link to="/notes">
                  <FileText className="mr-2 h-4 w-4" />
                  New Note
                  <Badge variant="secondary" className="ml-2 text-xs">Requires Co-Sign</Badge>
                </Link>
              </Button>
              <Button className="w-full" variant="outline" asChild>
                <Link to="/schedule">
                  <CalendarPlus className="mr-2 h-4 w-4" />
                  Schedule Appointment
                </Link>
              </Button>
              <Button className="w-full" variant="outline" asChild>
                <Link to="/clients">
                  <Users className="mr-2 h-4 w-4" />
                  View Clients
                </Link>
              </Button>
              {relationship && (
                <Button className="w-full" variant="outline" asChild>
                  <a href={`mailto:${relationship.supervisee?.email}`}>
                    <Mail className="mr-2 h-4 w-4" />
                    Contact Supervisor
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
