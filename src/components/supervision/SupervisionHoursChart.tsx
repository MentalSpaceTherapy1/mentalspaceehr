import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Clock, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";
import { format, differenceInWeeks, addWeeks } from "date-fns";

interface SupervisionHoursChartProps {
  relationship: {
    id: string;
    start_date: string;
    required_supervision_hours: number;
    required_direct_hours?: number;
    required_indirect_hours?: number;
    required_group_hours?: number;
    completed_hours?: number;
    direct_hours_completed?: number;
    indirect_hours_completed?: number;
    group_hours_completed?: number;
    supervision_frequency?: string;
  };
  recentSessions?: Array<{
    session_date: string;
    session_duration_minutes: number;
    session_type: string;
  }>;
}

export function SupervisionHoursChart({ relationship, recentSessions = [] }: SupervisionHoursChartProps) {
  const totalCompleted = relationship.completed_hours || 0;
  const totalRequired = relationship.required_supervision_hours;
  const totalProgress = (totalCompleted / totalRequired) * 100;
  const hoursRemaining = Math.max(0, totalRequired - totalCompleted);

  // Calculate projected completion date
  const weeksSinceStart = Math.max(1, differenceInWeeks(new Date(), new Date(relationship.start_date)));
  const averageHoursPerWeek = totalCompleted / weeksSinceStart;
  const weeksToComplete = averageHoursPerWeek > 0 ? Math.ceil(hoursRemaining / averageHoursPerWeek) : 0;
  const projectedCompletionDate = addWeeks(new Date(), weeksToComplete);

  // Check if on track (assuming ~1 year = 52 weeks for completion)
  const expectedProgress = (weeksSinceStart / 52) * 100;
  const isBehindSchedule = totalProgress < expectedProgress * 0.8; // 20% tolerance

  const getHourTypeProgress = (completed: number = 0, required: number = 0) => {
    if (required === 0) return { progress: 0, status: 'N/A' as const };
    const progress = (completed / required) * 100;
    return {
      progress,
      status: progress >= 100 ? 'complete' as const : 
              progress >= 75 ? 'ontrack' as const : 
              progress >= 50 ? 'warning' as const : 
              'behind' as const
    };
  };

  const directProgress = getHourTypeProgress(
    relationship.direct_hours_completed,
    relationship.required_direct_hours
  );
  const indirectProgress = getHourTypeProgress(
    relationship.indirect_hours_completed,
    relationship.required_indirect_hours
  );
  const groupProgress = getHourTypeProgress(
    relationship.group_hours_completed,
    relationship.required_group_hours
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete': return 'bg-green-500';
      case 'ontrack': return 'bg-blue-500';
      case 'warning': return 'bg-yellow-500';
      case 'behind': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'complete':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
          <CheckCircle className="h-3 w-3 mr-1" />Complete
        </Badge>;
      case 'ontrack':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
          On Track
        </Badge>;
      case 'warning':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
          Attention Needed
        </Badge>;
      case 'behind':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
          <AlertCircle className="h-3 w-3 mr-1" />Behind Schedule
        </Badge>;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Supervision Hours Progress
        </CardTitle>
        <CardDescription>
          Detailed breakdown and projections
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Progress */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Overall Progress</h4>
            {isBehindSchedule && (
              <Badge variant="destructive" className="text-xs">
                <AlertCircle className="h-3 w-3 mr-1" />
                Behind Schedule
              </Badge>
            )}
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Total Hours</span>
              <span className="font-medium">
                {totalCompleted.toFixed(1)} / {totalRequired}h
              </span>
            </div>
            <Progress value={totalProgress} className="h-3" />
            <p className="text-xs text-muted-foreground">
              {hoursRemaining.toFixed(1)} hours remaining
            </p>
          </div>
        </div>

        {/* Hours by Type */}
        <div className="space-y-4">
          <h4 className="font-semibold">Hours by Type</h4>
          
          {relationship.required_direct_hours && (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Direct Clinical
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {(relationship.direct_hours_completed || 0).toFixed(1)} / {relationship.required_direct_hours}h
                  </span>
                  {directProgress.status !== 'N/A' && getStatusBadge(directProgress.status)}
                </div>
              </div>
              <div className="relative">
                <Progress value={directProgress.progress} className="h-2" />
                <div 
                  className={`absolute top-0 left-0 h-2 rounded-full ${getStatusColor(directProgress.status)}`}
                  style={{ width: `${Math.min(100, directProgress.progress)}%` }}
                />
              </div>
            </div>
          )}

          {relationship.required_indirect_hours && (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Indirect/Admin
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {(relationship.indirect_hours_completed || 0).toFixed(1)} / {relationship.required_indirect_hours}h
                  </span>
                  {indirectProgress.status !== 'N/A' && getStatusBadge(indirectProgress.status)}
                </div>
              </div>
              <div className="relative">
                <Progress value={indirectProgress.progress} className="h-2" />
                <div 
                  className={`absolute top-0 left-0 h-2 rounded-full ${getStatusColor(indirectProgress.status)}`}
                  style={{ width: `${Math.min(100, indirectProgress.progress)}%` }}
                />
              </div>
            </div>
          )}

          {relationship.required_group_hours && (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Group Supervision
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {(relationship.group_hours_completed || 0).toFixed(1)} / {relationship.required_group_hours}h
                  </span>
                  {groupProgress.status !== 'N/A' && getStatusBadge(groupProgress.status)}
                </div>
              </div>
              <div className="relative">
                <Progress value={groupProgress.progress} className="h-2" />
                <div 
                  className={`absolute top-0 left-0 h-2 rounded-full ${getStatusColor(groupProgress.status)}`}
                  style={{ width: `${Math.min(100, groupProgress.progress)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Projections */}
        <div className="p-4 bg-muted/50 rounded-lg space-y-3">
          <h4 className="font-semibold text-sm">Projections</h4>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Average per Week</p>
              <p className="font-medium">{averageHoursPerWeek.toFixed(1)}h</p>
            </div>
            <div>
              <p className="text-muted-foreground">Weeks to Complete</p>
              <p className="font-medium">
                {weeksToComplete > 0 ? `~${weeksToComplete} weeks` : 'Complete'}
              </p>
            </div>
          </div>

          {weeksToComplete > 0 && (
            <div>
              <p className="text-xs text-muted-foreground">Projected Completion</p>
              <p className="text-sm font-medium">
                {format(projectedCompletionDate, 'MMMM dd, yyyy')}
              </p>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        {recentSessions.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Recent Sessions</h4>
            <div className="space-y-2">
              {recentSessions.slice(0, 5).map((session, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm border-b pb-2">
                  <div>
                    <p className="font-medium">{session.session_type}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(session.session_date), 'MMM dd, yyyy')}
                    </p>
                  </div>
                  <Badge variant="outline">{session.session_duration_minutes} min</Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}