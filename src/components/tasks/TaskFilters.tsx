import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TaskFiltersProps {
  filters: {
    status: string;
    priority: string;
    category: string;
  };
  onFiltersChange: (filters: any) => void;
}

export function TaskFilters({ filters, onFiltersChange }: TaskFiltersProps) {
  return (
    <Card className="p-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="status-filter">Status</Label>
          <Select
            value={filters.status}
            onValueChange={(value) => onFiltersChange({ ...filters, status: value })}
          >
            <SelectTrigger id="status-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="In Progress">In Progress</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="priority-filter">Priority</Label>
          <Select
            value={filters.priority}
            onValueChange={(value) => onFiltersChange({ ...filters, priority: value })}
          >
            <SelectTrigger id="priority-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="category-filter">Category</Label>
          <Select
            value={filters.category}
            onValueChange={(value) => onFiltersChange({ ...filters, category: value })}
          >
            <SelectTrigger id="category-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="Clinical">Clinical</SelectItem>
              <SelectItem value="Administrative">Administrative</SelectItem>
              <SelectItem value="Billing">Billing</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </Card>
  );
}
