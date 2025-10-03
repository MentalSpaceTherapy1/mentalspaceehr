import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ClientFiltersProps {
  filters: {
    status: string;
    therapist: string;
  };
  onFiltersChange: (filters: any) => void;
}

export function ClientFilters({ filters, onFiltersChange }: ClientFiltersProps) {
  return (
    <Card className="p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="status-filter">Status</Label>
          <Select
            value={filters.status}
            onValueChange={(value) => onFiltersChange({ ...filters, status: value })}
          >
            <SelectTrigger id="status-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border z-50">
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
              <SelectItem value="Discharged">Discharged</SelectItem>
              <SelectItem value="Deceased">Deceased</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="therapist-filter">Primary Therapist</Label>
          <Select
            value={filters.therapist}
            onValueChange={(value) => onFiltersChange({ ...filters, therapist: value })}
          >
            <SelectTrigger id="therapist-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border z-50">
              <SelectItem value="all">All Therapists</SelectItem>
              {/* TODO: Load therapists dynamically */}
            </SelectContent>
          </Select>
        </div>
      </div>
    </Card>
  );
}
