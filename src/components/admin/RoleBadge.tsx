import { Badge } from '@/components/ui/badge';
import { AppRole } from '@/hooks/useUserRoles';
import { roleDisplayNames, roleColors } from '@/lib/roleUtils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { roleDescriptions } from '@/lib/roleUtils';

interface RoleBadgeProps {
  role: AppRole;
  showTooltip?: boolean;
}

export const RoleBadge = ({ role, showTooltip = true }: RoleBadgeProps) => {
  const badge = (
    <Badge variant={roleColors[role] as any}>
      {roleDisplayNames[role]}
    </Badge>
  );

  if (!showTooltip) return badge;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">{roleDescriptions[role]}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
