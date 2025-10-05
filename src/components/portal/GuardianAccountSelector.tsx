import { useState } from 'react';
import { usePortalAccount } from '@/hooks/usePortalAccount';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, User } from 'lucide-react';

interface GuardianAccountSelectorProps {
  onClientSelected: (clientId: string) => void;
}

export const GuardianAccountSelector = ({ onClientSelected }: GuardianAccountSelectorProps) => {
  const { portalContext } = usePortalAccount();
  const [selectedClientId, setSelectedClientId] = useState<string>(
    portalContext?.client.id || ''
  );

  if (!portalContext?.account.isGuardianAccount) {
    return null;
  }

  const handleSelectClient = (clientId: string) => {
    setSelectedClientId(clientId);
    onClientSelected(clientId);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Account Selector
        </CardTitle>
        <CardDescription>
          You are managing multiple accounts. Select which account to view.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Guardian's own account */}
        <Button
          variant={selectedClientId === portalContext.client.id ? 'secondary' : 'outline'}
          className="w-full justify-between"
          onClick={() => handleSelectClient(portalContext.client.id)}
        >
          <span className="flex items-center gap-2">
            <User className="h-4 w-4" />
            {portalContext.client.firstName} {portalContext.client.lastName} (You)
          </span>
          {selectedClientId === portalContext.client.id && (
            <Badge variant="secondary">Active</Badge>
          )}
        </Button>

        {/* Minor accounts */}
        {portalContext.minorClients?.map((minor) => (
          <Button
            key={minor.id}
            variant={selectedClientId === minor.id ? 'secondary' : 'outline'}
            className="w-full justify-between"
            onClick={() => handleSelectClient(minor.id)}
          >
            <span className="flex items-center gap-2">
              <User className="h-4 w-4" />
              {minor.firstName} {minor.lastName}
            </span>
            {selectedClientId === minor.id && (
              <Badge variant="secondary">Active</Badge>
            )}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
};
