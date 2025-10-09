import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import {
  contentPackManager,
  ContentPackVersion,
  ContentPackSummary,
  ContentType,
} from "@/lib/contentPacks";
import {
  Package,
  Download,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  XCircle,
  FileText,
  Play,
  History,
  Info,
} from "lucide-react";
import { format } from "date-fns";

export function ContentPackManager() {
  const [versions, setVersions] = useState<ContentPackVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<ContentPackSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<ContentType | 'all'>('all');
  const { toast } = useToast();

  useEffect(() => {
    loadVersions();
  }, [selectedType]);

  const loadVersions = async () => {
    setLoading(true);
    try {
      const data = await contentPackManager.listVersions({
        contentType: selectedType === 'all' ? undefined : selectedType,
        includeArchived: true,
      });
      setVersions(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (versionId: string) => {
    try {
      const details = await contentPackManager.getVersionDetails(versionId);
      setSelectedVersion(details);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleInstall = async (versionId: string) => {
    setLoading(true);
    try {
      await contentPackManager.installVersion(versionId);
      toast({
        title: "Success",
        description: "Content pack installed successfully",
      });
      loadVersions();
    } catch (error: any) {
      toast({
        title: "Installation Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async (versionId: string) => {
    setLoading(true);
    try {
      const result = await contentPackManager.validateVersion(versionId);
      if (result.isValid) {
        toast({
          title: "Validation Passed",
          description: "Content pack is valid and ready for installation",
        });
      } else {
        toast({
          title: "Validation Failed",
          description: `Found ${result.errors.length} error(s)`,
          variant: "destructive",
        });
      }
      loadVersions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (version: ContentPackVersion) => {
    if (version.is_active) {
      return <Badge className="bg-green-500">Active</Badge>;
    }
    if (version.is_draft) {
      return <Badge variant="secondary">Draft</Badge>;
    }
    return <Badge variant="outline">Available</Badge>;
  };

  const getValidationBadge = (status: string) => {
    switch (status) {
      case 'passed':
        return (
          <Badge className="bg-green-500">
            <CheckCircle className="w-3 h-3 mr-1" />
            Passed
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <AlertCircle className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Content Pack Manager</h2>
          <p className="text-muted-foreground">
            Manage clinical content versions including templates, code sets, and assessments
          </p>
        </div>
        <Button onClick={loadVersions} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Content Type Filter */}
      <Tabs value={selectedType} onValueChange={(v) => setSelectedType(v as ContentType | 'all')}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="document_templates">Templates</TabsTrigger>
          <TabsTrigger value="cpt_codes">CPT Codes</TabsTrigger>
          <TabsTrigger value="problem_lists">Problem Lists</TabsTrigger>
          <TabsTrigger value="assessments">Assessments</TabsTrigger>
          <TabsTrigger value="mixed">Mixed</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedType} className="space-y-4">
          {/* Versions Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="w-5 h-5 mr-2" />
                Available Versions
              </CardTitle>
              <CardDescription>
                View and manage content pack versions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Version</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Validation</TableHead>
                    <TableHead>Release Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {versions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No content packs found
                      </TableCell>
                    </TableRow>
                  ) : (
                    versions.map((version) => (
                      <TableRow key={version.id}>
                        <TableCell className="font-mono">
                          {version.version_number}
                        </TableCell>
                        <TableCell>{version.version_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {version.content_type.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(version)}</TableCell>
                        <TableCell>{getValidationBadge(version.validation_status)}</TableCell>
                        <TableCell>
                          {format(new Date(version.release_date), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewDetails(version.id)}
                                >
                                  <Info className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl max-h-[80vh]">
                                <DialogHeader>
                                  <DialogTitle>
                                    Version {selectedVersion?.version.version_number} Details
                                  </DialogTitle>
                                  <DialogDescription>
                                    {selectedVersion?.version.description}
                                  </DialogDescription>
                                </DialogHeader>
                                <ScrollArea className="max-h-[60vh]">
                                  {selectedVersion && (
                                    <div className="space-y-4">
                                      {/* Breaking Changes Alert */}
                                      {selectedVersion.hasBreakingChanges && (
                                        <Alert variant="destructive">
                                          <AlertCircle className="h-4 w-4" />
                                          <AlertDescription>
                                            This version contains breaking changes
                                          </AlertDescription>
                                        </Alert>
                                      )}

                                      {/* Installation Status */}
                                      {selectedVersion.installation && (
                                        <Card>
                                          <CardHeader>
                                            <CardTitle className="text-sm">Installation Status</CardTitle>
                                          </CardHeader>
                                          <CardContent>
                                            <div className="space-y-2">
                                              <div>
                                                <span className="font-semibold">Status: </span>
                                                {selectedVersion.installation.installation_status}
                                              </div>
                                              <div>
                                                <span className="font-semibold">Installed: </span>
                                                {format(
                                                  new Date(selectedVersion.installation.installed_at),
                                                  'MMM d, yyyy HH:mm'
                                                )}
                                              </div>
                                            </div>
                                          </CardContent>
                                        </Card>
                                      )}

                                      {/* Changelog */}
                                      <Card>
                                        <CardHeader>
                                          <CardTitle className="text-sm">
                                            <FileText className="w-4 h-4 inline mr-2" />
                                            Changelog
                                          </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                          <div className="space-y-3">
                                            {selectedVersion.changelog.map((entry) => (
                                              <div
                                                key={entry.id}
                                                className="border-l-2 border-primary pl-4"
                                              >
                                                <div className="flex items-center gap-2 mb-1">
                                                  <Badge variant="outline">
                                                    {entry.change_type}
                                                  </Badge>
                                                  <Badge variant="secondary">
                                                    {entry.entity_type}
                                                  </Badge>
                                                  {entry.breaking_change && (
                                                    <Badge variant="destructive">Breaking</Badge>
                                                  )}
                                                </div>
                                                <div className="font-semibold">
                                                  {entry.entity_name}
                                                </div>
                                                <div className="text-sm text-muted-foreground">
                                                  {entry.change_summary}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </CardContent>
                                      </Card>
                                    </div>
                                  )}
                                </ScrollArea>
                              </DialogContent>
                            </Dialog>

                            {!version.is_active && version.validation_status === 'passed' && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleInstall(version.id)}
                                disabled={loading}
                              >
                                <Download className="w-4 h-4 mr-1" />
                                Install
                              </Button>
                            )}

                            {version.validation_status === 'pending' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleValidate(version.id)}
                                disabled={loading}
                              >
                                <Play className="w-4 h-4 mr-1" />
                                Validate
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
