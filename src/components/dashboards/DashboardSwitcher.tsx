import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AppRole } from '@/hooks/useUserRoles';
import { 
  Shield, 
  Eye, 
  Stethoscope, 
  DollarSign, 
  Calendar,
  GraduationCap
} from 'lucide-react';

interface DashboardOption {
  role: AppRole;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const DASHBOARD_OPTIONS: DashboardOption[] = [
  { role: 'administrator', label: 'Admin Dashboard', icon: Shield },
  { role: 'supervisor', label: 'Supervisor Dashboard', icon: Eye },
  { role: 'therapist', label: 'Clinician Dashboard', icon: Stethoscope },
  { role: 'associate_trainee', label: 'Associate Dashboard', icon: GraduationCap },
  { role: 'billing_staff', label: 'Billing Dashboard', icon: DollarSign },
  { role: 'front_desk', label: 'Front Desk Dashboard', icon: Calendar },
];

interface DashboardSwitcherProps {
  availableRoles: AppRole[];
  selectedRole: AppRole;
  onRoleChange: (role: AppRole) => void;
}

export function DashboardSwitcher({ 
  availableRoles, 
  selectedRole, 
  onRoleChange 
}: DashboardSwitcherProps) {
  const availableDashboards = DASHBOARD_OPTIONS.filter(
    option => availableRoles.includes(option.role)
  );

  if (availableDashboards.length <= 1) {
    return null;
  }

  const selectedDashboard = availableDashboards.find(d => d.role === selectedRole);

  return (
    <Select value={selectedRole} onValueChange={(value) => onRoleChange(value as AppRole)}>
      <SelectTrigger className="w-[200px] bg-background/50 border-border/50">
        <SelectValue>
          {selectedDashboard && (
            <div className="flex items-center gap-2">
              <selectedDashboard.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{selectedDashboard.label}</span>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {availableDashboards.map((dashboard) => (
          <SelectItem key={dashboard.role} value={dashboard.role}>
            <div className="flex items-center gap-2">
              <dashboard.icon className="h-4 w-4" />
              <span>{dashboard.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
