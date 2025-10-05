import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SupervisionSession } from "@/hooks/useSupervisionSessions";
import { SupervisionSessionViewer } from "./SupervisionSessionViewer";
import { Clock, Video, Phone, Building, Eye } from "lucide-react";
import { format } from "date-fns";

interface RecentSessionsCardProps {
  sessions: SupervisionSession[];
  title?: string;
  description?: string;
  maxSessions?: number;
}

export function RecentSessionsCard({ 
  sessions, 
  title = "Recent Supervision Sessions",
  description = "Latest documented supervision sessions",
  maxSessions = 5 
}: RecentSessionsCardProps) {
  const [selectedSession, setSelectedSession] = useState<SupervisionSession | null>(null);
  const [showViewer, setShowViewer] = useState(false);

  const recentSessions = sessions.slice(0, maxSessions);

  const getFormatIcon = (format?: string | null) => {
    switch (format) {
      case 'Telehealth':
        return <Video className="h-3 w-3" />;
      case 'Phone':
        return <Phone className="h-3 w-3" />;
      default:
        return <Building className="h-3 w-3" />;
    }
  };

  const handleViewSession = (session: SupervisionSession) => {
    setSelectedSession(session);
    setShowViewer(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          {recentSessions.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No supervision sessions recorded yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentSessions.map((session) => (
                <div key={session.id} className="border rounded-lg p-3 space-y-2 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">
                          {format(new Date(session.session_date), 'MMM dd, yyyy')}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {session.session_type}
                        </Badge>
                        <Badge variant="secondary" className="text-xs gap-1">
                          {getFormatIcon(session.session_format)}
                          {session.session_format || 'In-Person'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{session.session_duration_minutes} minutes</span>
                        {session.session_start_time && session.session_end_time && (
                          <span>{session.session_start_time} - {session.session_end_time}</span>
                        )}
                      </div>
                      
                      {/* Quick preview of content */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {session.cases_discussed && session.cases_discussed.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {session.cases_discussed.length} case{session.cases_discussed.length > 1 ? 's' : ''}
                          </Badge>
                        )}
                        {session.action_items && session.action_items.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {session.action_items.length} action{session.action_items.length > 1 ? 's' : ''}
                          </Badge>
                        )}
                        {session.next_session_scheduled && (
                          <Badge variant="outline" className="text-xs">
                            Follow-up scheduled
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewSession(session)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Signature status */}
                  <div className="flex items-center gap-2 text-xs pt-2 border-t">
                    <span className="text-muted-foreground">Signatures:</span>
                    <Badge variant={session.supervisor_signed ? "default" : "secondary"} className="text-xs">
                      Supervisor {session.supervisor_signed ? '✓' : '✗'}
                    </Badge>
                    <Badge variant={session.supervisee_signed ? "default" : "secondary"} className="text-xs">
                      Supervisee {session.supervisee_signed ? '✓' : '✗'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <SupervisionSessionViewer
        open={showViewer}
        onOpenChange={setShowViewer}
        session={selectedSession}
      />
    </>
  );
}
