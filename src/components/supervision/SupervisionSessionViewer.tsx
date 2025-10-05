import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SupervisionSession } from "@/hooks/useSupervisionSessions";
import { ActionItemsList } from "./ActionItemsList";
import { 
  Calendar, Clock, Users, FileText, Lightbulb, 
  CheckSquare, MessageSquare, PenTool, Video, Phone, Building
} from "lucide-react";
import { format } from "date-fns";

interface SupervisionSessionViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: SupervisionSession | null;
}

export function SupervisionSessionViewer({ 
  open, 
  onOpenChange, 
  session 
}: SupervisionSessionViewerProps) {
  if (!session) return null;

  const formatTime = (time: string | null | undefined) => {
    if (!time) return 'Not specified';
    return time;
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'PPP');
    } catch {
      return dateString;
    }
  };

  const getFormatIcon = () => {
    switch (session.session_format) {
      case 'Telehealth':
        return <Video className="h-4 w-4" />;
      case 'Phone':
        return <Phone className="h-4 w-4" />;
      default:
        return <Building className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Supervision Session Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Session Information
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Date:</span>
                <p className="font-medium">{formatDate(session.session_date)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Duration:</span>
                <p className="font-medium">{session.session_duration_minutes} minutes</p>
              </div>
              <div>
                <span className="text-muted-foreground">Start Time:</span>
                <p className="font-medium">{formatTime(session.session_start_time)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">End Time:</span>
                <p className="font-medium">{formatTime(session.session_end_time)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Type:</span>
                <Badge variant="secondary">{session.session_type}</Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Format:</span>
                <Badge variant="outline" className="gap-1">
                  {getFormatIcon()}
                  {session.session_format || 'Not specified'}
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Topics Covered */}
          {session.topics_covered && session.topics_covered.length > 0 && (
            <>
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Topics Covered</h3>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {session.topics_covered.map((topic, i) => (
                    <li key={i}>{topic}</li>
                  ))}
                </ul>
              </div>
              <Separator />
            </>
          )}

          {/* General Notes */}
          {session.notes && (
            <>
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Session Notes</h3>
                <p className="text-sm whitespace-pre-wrap p-3 bg-muted rounded-lg">
                  {session.notes}
                </p>
              </div>
              <Separator />
            </>
          )}

          {/* Cases Discussed */}
          {session.cases_discussed && session.cases_discussed.length > 0 && (
            <>
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Cases Discussed ({session.cases_discussed.length})
                </h3>
                {session.cases_discussed.map((caseItem, i) => (
                  <div key={i} className="border rounded-lg p-4 space-y-2 bg-card">
                    <h4 className="font-medium text-sm">Case {i + 1}</h4>
                    {caseItem.client_id && (
                      <p className="text-sm">
                        <span className="text-muted-foreground">Client:</span> {caseItem.client_id}
                      </p>
                    )}
                    {caseItem.discussion_summary && (
                      <p className="text-sm">{caseItem.discussion_summary}</p>
                    )}
                    {caseItem.clinical_issues && caseItem.clinical_issues.length > 0 && (
                      <div className="text-sm">
                        <span className="text-muted-foreground font-medium">Clinical Issues:</span>
                        <ul className="list-disc list-inside ml-2 mt-1">
                          {caseItem.clinical_issues.map((issue, j) => (
                            <li key={j}>{issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {caseItem.interventions_recommended && caseItem.interventions_recommended.length > 0 && (
                      <div className="text-sm">
                        <span className="text-muted-foreground font-medium">Interventions Recommended:</span>
                        <ul className="list-disc list-inside ml-2 mt-1">
                          {caseItem.interventions_recommended.map((intervention, j) => (
                            <li key={j}>{intervention}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <Separator />
            </>
          )}

          {/* Skills & Development */}
          {(session.skills_developed?.length || session.feedback_provided || 
            session.areas_of_strength?.length || session.areas_for_improvement?.length) && (
            <>
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  Skills & Development
                </h3>
                
                {session.skills_developed && session.skills_developed.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Skills Developed</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {session.skills_developed.map((skill, i) => (
                        <li key={i}>{skill}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {session.feedback_provided && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Feedback Provided</h4>
                    <p className="text-sm whitespace-pre-wrap p-3 bg-muted rounded-lg">
                      {session.feedback_provided}
                    </p>
                  </div>
                )}

                {session.areas_of_strength && session.areas_of_strength.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Areas of Strength</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {session.areas_of_strength.map((strength, i) => (
                        <li key={i} className="text-green-700 dark:text-green-400">{strength}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {session.areas_for_improvement && session.areas_for_improvement.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Areas for Improvement</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {session.areas_for_improvement.map((area, i) => (
                        <li key={i}>{area}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <Separator />
            </>
          )}

          {/* Action Items */}
          {session.action_items && session.action_items.length > 0 && (
            <>
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <CheckSquare className="h-4 w-4" />
                  Action Items
                </h3>
                <ActionItemsList 
                  items={session.action_items}
                  onChange={() => {}}
                  readOnly
                  showCompleted
                />
              </div>
              <Separator />
            </>
          )}

          {/* Follow-up */}
          {session.next_session_scheduled && (
            <>
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Follow-up Session</h3>
                <p className="text-sm">
                  Next session scheduled for:{' '}
                  <span className="font-medium">
                    {session.next_session_date ? formatDate(session.next_session_date) : 'Date TBD'}
                  </span>
                </p>
              </div>
              <Separator />
            </>
          )}

          {/* Supervisee Reflection */}
          {session.supervisee_reflection && (
            <>
              <div className="space-y-2">
                <h3 className="font-semibold flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Supervisee Reflection
                </h3>
                <p className="text-sm whitespace-pre-wrap p-3 bg-muted rounded-lg">
                  {session.supervisee_reflection}
                </p>
              </div>
              <Separator />
            </>
          )}

          {/* Signatures */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <PenTool className="h-4 w-4" />
              Signatures
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="border rounded-lg p-3 bg-card">
                <p className="text-xs text-muted-foreground mb-1">Supervisor</p>
                <p className="font-medium">{session.supervisor_signature_name || 'Not signed'}</p>
                {session.supervisor_signed_date && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Signed: {format(new Date(session.supervisor_signed_date), 'PPp')}
                  </p>
                )}
              </div>
              <div className="border rounded-lg p-3 bg-card">
                <p className="text-xs text-muted-foreground mb-1">Supervisee</p>
                <p className="font-medium">{session.supervisee_signature_name || 'Not signed'}</p>
                {session.supervisee_signed_date && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Signed: {format(new Date(session.supervisee_signed_date), 'PPp')}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
