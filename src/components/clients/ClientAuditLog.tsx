import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useClientAuditLog } from "@/hooks/useClientAuditLog";
import { Search, Eye, Edit, Trash2, Plus, Shield } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

interface ClientAuditLogProps {
  clientId: string;
}

export function ClientAuditLog({ clientId }: ClientAuditLogProps) {
  const { auditLogs, isLoading } = useClientAuditLog(clientId);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch = 
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.performedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entity.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAction = 
      actionFilter === "all" || log.actionType === actionFilter;
    
    const matchesEntity = 
      entityFilter === "all" || log.entity === entityFilter;

    return matchesSearch && matchesAction && matchesEntity;
  });

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case "view":
        return <Eye className="h-4 w-4" />;
      case "create":
        return <Plus className="h-4 w-4" />;
      case "update":
        return <Edit className="h-4 w-4" />;
      case "delete":
        return <Trash2 className="h-4 w-4" />;
      case "access":
        return <Shield className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case "view":
        return "secondary";
      case "create":
        return "default";
      case "update":
        return "outline";
      case "delete":
        return "destructive";
      case "access":
        return "secondary";
      default:
        return "secondary";
    }
  };

  const uniqueEntities = Array.from(new Set(auditLogs.map(log => log.entity)));

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">Loading audit log...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit Log</CardTitle>
        <p className="text-sm text-muted-foreground">
          Comprehensive record of all access and modifications to this client's information
        </p>
        <div className="flex gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search audit log..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Action Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="view">View</SelectItem>
              <SelectItem value="create">Create</SelectItem>
              <SelectItem value="update">Update</SelectItem>
              <SelectItem value="delete">Delete</SelectItem>
              <SelectItem value="access">Access</SelectItem>
            </SelectContent>
          </Select>
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Entity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Entities</SelectItem>
              {uniqueEntities.map(entity => (
                <SelectItem key={entity} value={entity}>
                  {entity}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm || actionFilter !== "all" || entityFilter !== "all"
              ? "No audit entries found matching your filters"
              : "No audit log entries available"}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Timestamp</TableHead>
                <TableHead className="w-[120px]">Action Type</TableHead>
                <TableHead className="w-[120px]">Entity</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Performed By</TableHead>
                <TableHead>Details</TableHead>
                <TableHead className="w-[140px]">IP Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm">
                    <div>{format(new Date(log.timestamp), "MM/dd/yyyy")}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(log.timestamp), "hh:mm:ss a")}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={getActionColor(log.actionType)}
                      className="flex items-center gap-1 w-fit"
                    >
                      {getActionIcon(log.actionType)}
                      <span className="capitalize">{log.actionType}</span>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{log.entity}</span>
                  </TableCell>
                  <TableCell>{log.action}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-medium">
                          {log.performedBy.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <span>{log.performedBy}</span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-md">
                    <div className="truncate" title={log.details}>
                      {log.details || "—"}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">
                    {log.ipAddress || "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        
        <div className="mt-4 p-3 bg-muted rounded-md text-sm">
          <div className="flex items-start gap-2">
            <Shield className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div>
              <span className="font-medium">HIPAA Compliance:</span>
              <span className="text-muted-foreground ml-1">
                All access and modifications to protected health information (PHI) are logged for audit purposes.
                Logs are retained for a minimum of 6 years to comply with HIPAA requirements.
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
