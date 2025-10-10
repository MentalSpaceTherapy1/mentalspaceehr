import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClinicalDocuments } from '@/hooks/useClinicalDocuments';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  FileText,
  Plus,
  Search,
  LayoutGrid,
  LayoutList,
  Filter,
  Calendar as CalendarIcon,
  Users,
  FileCheck,
  ClipboardList,
  Eye,
  Edit,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ClinicalDocumentsDashboardProps {
  clientId: string;
}

export function ClinicalDocumentsDashboard({ clientId }: ClinicalDocumentsDashboardProps) {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNoteTypes, setSelectedNoteTypes] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'date' | 'noteType' | 'status' | 'clinician'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const { documents, loading, stats } = useClinicalDocuments({
    clientId,
    filters: {
      noteTypes: selectedNoteTypes.length > 0 ? selectedNoteTypes : undefined,
      statuses: selectedStatuses.length > 0 ? selectedStatuses : undefined,
      searchQuery: searchQuery || undefined,
    },
    sortBy,
    sortOrder,
  });

  const noteTypes = [
    { value: 'progress_note', label: 'Progress Note' },
    { value: 'intake_assessment', label: 'Intake Assessment' },
    { value: 'psychiatric_evaluation', label: 'Psychiatric Evaluation' },
    { value: 'treatment_plan', label: 'Treatment Plan' },
    { value: 'consultation', label: 'Consultation Note' },
    { value: 'contact', label: 'Contact Note' },
    { value: 'miscellaneous', label: 'Miscellaneous Note' },
    { value: 'cancellation', label: 'Cancellation Note' },
    { value: 'termination', label: 'Termination Note' },
  ];

  const statuses = [
    { value: 'Draft', label: 'Draft' },
    { value: 'Completed', label: 'Completed' },
    { value: 'Locked', label: 'Locked' },
    { value: 'Active', label: 'Active' },
  ];

  const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'draft':
        return 'secondary';
      case 'completed':
        return 'default';
      case 'locked':
        return 'outline';
      case 'active':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const toggleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const SortIcon = ({ column }: { column: typeof sortBy }) => {
    if (sortBy !== column) return <ArrowUpDown className="h-4 w-4 opacity-50" />;
    return sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  const handleCreateNote = (noteType: string) => {
    const pathMap: Record<string, string> = {
      'progress_note': '/progress-note',
      'intake_assessment': '/intake-assessment',
      'psychiatric_evaluation': '/clinical-note',
      'treatment_plan': '/treatment-plan',
      'consultation': '/consultation-note',
      'contact': '/contact-note',
      'miscellaneous': '/miscellaneous-note',
      'cancellation': '/cancellation-note',
      'termination': '/termination-note',
    };

    navigate(`${pathMap[noteType] || '/progress-note'}/${clientId}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Clinical Documents</h2>
          <p className="text-muted-foreground">
            Manage all clinical notes and documentation in one place
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'table' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('table')}
          >
            <LayoutList className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create New Note
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {noteTypes.map((type) => (
                <DropdownMenuItem
                  key={type.value}
                  onClick={() => handleCreateNote(type.value)}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {type.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Notes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.thisMonth}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Cosignatures</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingCosignatures}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Draft Notes</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.drafts}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={selectedNoteTypes[0] || 'all'}
              onValueChange={(value) => setSelectedNoteTypes(value === 'all' ? [] : [value])}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Note Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Note Types</SelectItem>
                {noteTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={selectedStatuses[0] || 'all'}
              onValueChange={(value) => setSelectedStatuses(value === 'all' ? [] : [value])}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {statuses.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(selectedNoteTypes.length > 0 || selectedStatuses.length > 0 || searchQuery) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedNoteTypes([]);
                setSelectedStatuses([]);
                setSearchQuery('');
              }}
            >
              Clear Filters
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : documents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No clinical documents found</p>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery || selectedNoteTypes.length > 0 || selectedStatuses.length > 0
                ? 'Try adjusting your filters'
                : 'Create your first clinical note to get started'}
            </p>
            <Button onClick={() => handleCreateNote('progress_note')}>
              <Plus className="h-4 w-4 mr-2" />
              Create Progress Note
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === 'table' ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px]">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleSort('date')}
                      className="h-8 px-2"
                    >
                      Date
                      <SortIcon column="date" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleSort('noteType')}
                      className="h-8 px-2"
                    >
                      Note Type
                      <SortIcon column="noteType" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleSort('status')}
                      className="h-8 px-2"
                    >
                      Status
                      <SortIcon column="status" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleSort('clinician')}
                      className="h-8 px-2"
                    >
                      Clinician
                      <SortIcon column="clinician" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow
                    key={doc.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(doc.viewPath)}
                  >
                    <TableCell className="font-medium">
                      {format(new Date(doc.date), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {doc.noteTypeLabel}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(doc.status)}>
                        {doc.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        {doc.clinician}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(doc.viewPath);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => (
            <Card
              key={doc.id}
              className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]"
              onClick={() => navigate(doc.viewPath)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">{doc.noteTypeLabel}</CardTitle>
                  </div>
                  <Badge variant={getStatusVariant(doc.status)}>
                    {doc.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarIcon className="h-4 w-4" />
                  {format(new Date(doc.date), 'MMM dd, yyyy')}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  {doc.clinician}
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(doc.viewPath);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Note
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
