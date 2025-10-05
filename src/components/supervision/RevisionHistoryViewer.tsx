import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock } from "lucide-react";
import { RevisionHistoryItem } from "@/hooks/useNoteCosignatures";

interface RevisionHistoryViewerProps {
  revisionHistory: RevisionHistoryItem[];
}

export function RevisionHistoryViewer({ revisionHistory }: RevisionHistoryViewerProps) {
  if (!revisionHistory || revisionHistory.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Revision History</CardTitle>
          <CardDescription>No revisions have been requested for this note.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revision History</CardTitle>
        <CardDescription>
          {revisionHistory.length} revision{revisionHistory.length !== 1 ? 's' : ''} requested
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {revisionHistory.map((revision, index) => (
            <div
              key={index}
              className="border-l-2 border-primary/20 pl-4 pb-4 last:pb-0"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {revision.revisionCompleteDate ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <Clock className="h-5 w-5 text-amber-600" />
                  )}
                  <span className="font-medium">
                    Revision {revisionHistory.length - index}
                  </span>
                </div>
                <Badge 
                  variant="secondary"
                  className={revision.revisionCompleteDate ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" : ""}
                >
                  {revision.revisionCompleteDate ? "Completed" : "Pending"}
                </Badge>
              </div>

              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Requested:</span>{" "}
                  <span className="font-medium">
                    {format(new Date(revision.revisionDate), "PPp")}
                  </span>
                </div>

                {revision.revisionCompleteDate && (
                  <div>
                    <span className="text-muted-foreground">Completed:</span>{" "}
                    <span className="font-medium">
                      {format(new Date(revision.revisionCompleteDate), "PPp")}
                    </span>
                  </div>
                )}

                <div className="mt-2">
                  <p className="text-muted-foreground mb-1">Revision Details:</p>
                  <p className="bg-muted/50 p-3 rounded-md">
                    {revision.revisionReason}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
