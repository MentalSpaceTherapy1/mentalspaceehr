import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { SupervisionSession, ActionItem } from "@/hooks/useSupervisionSessions";
import { CheckSquare, AlertCircle, Calendar, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

interface ActionItemsCardProps {
  sessions: SupervisionSession[];
  title?: string;
  description?: string;
  showCompleted?: boolean;
  onToggleComplete?: (sessionId: string, itemIndex: number) => void;
}

export function ActionItemsCard({ 
  sessions, 
  title = "Supervision Action Items",
  description = "Tasks and follow-ups from supervision sessions",
  showCompleted = false,
  onToggleComplete
}: ActionItemsCardProps) {
  // Flatten all action items from all sessions
  const allActionItems: Array<{
    sessionId: string;
    sessionDate: string;
    item: ActionItem;
    itemIndex: number;
  }> = [];

  sessions.forEach(session => {
    if (session.action_items && session.action_items.length > 0) {
      session.action_items.forEach((item, index) => {
        if (showCompleted || !item.completed) {
          allActionItems.push({
            sessionId: session.id,
            sessionDate: session.session_date,
            item,
            itemIndex: index
          });
        }
      });
    }
  });

  // Sort by due date (items with due dates first, then by date)
  allActionItems.sort((a, b) => {
    if (a.item.due_date && !b.item.due_date) return -1;
    if (!a.item.due_date && b.item.due_date) return 1;
    if (a.item.due_date && b.item.due_date) {
      return new Date(a.item.due_date).getTime() - new Date(b.item.due_date).getTime();
    }
    return new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime();
  });

  const pendingItems = allActionItems.filter(a => !a.item.completed);
  const overdueItems = pendingItems.filter(a => 
    a.item.due_date && new Date(a.item.due_date) < new Date()
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5" />
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          {overdueItems.length > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertCircle className="h-3 w-3" />
              {overdueItems.length} overdue
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {allActionItems.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-2" />
            <p className="text-sm text-muted-foreground">
              {showCompleted ? "No action items recorded" : "All action items complete!"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {allActionItems.map((actionData, idx) => {
              const isOverdue = actionData.item.due_date && 
                new Date(actionData.item.due_date) < new Date() && 
                !actionData.item.completed;
              const daysUntilDue = actionData.item.due_date 
                ? Math.ceil((new Date(actionData.item.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                : null;

              return (
                <div 
                  key={`${actionData.sessionId}-${idx}`}
                  className={`border rounded-lg p-3 space-y-2 ${
                    actionData.item.completed ? 'opacity-60 bg-muted/30' : ''
                  } ${isOverdue ? 'border-destructive' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    {onToggleComplete && (
                      <Checkbox
                        checked={actionData.item.completed}
                        onCheckedChange={() => 
                          onToggleComplete(actionData.sessionId, actionData.itemIndex)
                        }
                        className="mt-1"
                      />
                    )}
                    <div className="flex-1 space-y-2">
                      <p className={`text-sm ${actionData.item.completed ? 'line-through' : ''}`}>
                        {actionData.item.item}
                      </p>
                      
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <Badge variant="outline" className="gap-1">
                          <Calendar className="h-3 w-3" />
                          From {format(new Date(actionData.sessionDate), 'MMM dd')}
                        </Badge>
                        
                        {actionData.item.due_date && (
                          <Badge 
                            variant={isOverdue ? "destructive" : "secondary"}
                            className="gap-1"
                          >
                            {isOverdue ? (
                              <>
                                <AlertCircle className="h-3 w-3" />
                                Overdue
                              </>
                            ) : actionData.item.completed ? (
                              <>
                                <CheckCircle2 className="h-3 w-3" />
                                Completed
                              </>
                            ) : daysUntilDue !== null && daysUntilDue <= 3 ? (
                              <>
                                <AlertCircle className="h-3 w-3" />
                                Due in {daysUntilDue} day{daysUntilDue !== 1 ? 's' : ''}
                              </>
                            ) : (
                              `Due ${format(new Date(actionData.item.due_date), 'MMM dd')}`
                            )}
                          </Badge>
                        )}

                        {actionData.item.completed && (
                          <Badge variant="default" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Complete
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
