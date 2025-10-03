import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreVertical, Phone, Mail, Calendar, Star } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';
import type { Database } from '@/integrations/supabase/types';
import { format, differenceInYears } from 'date-fns';

type Client = Database['public']['Tables']['clients']['Row'];

interface ClientListProps {
  clients: Client[];
  loading: boolean;
  onToggleFavorite?: (clientId: string) => void;
  favoriteClients?: string[];
}

const statusColors = {
  Active: 'bg-green-500/10 text-green-500 border-green-500/20',
  Inactive: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
  Discharged: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  Deceased: 'bg-slate-700/10 text-slate-700 border-slate-700/20',
};

export function ClientList({ clients, loading, onToggleFavorite, favoriteClients = [] }: ClientListProps) {
  const navigate = useNavigate();

  const getAge = (dateOfBirth: string) => {
    return differenceInYears(new Date(), new Date(dateOfBirth));
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-6 animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
            <div className="h-3 bg-muted rounded w-1/2"></div>
          </Card>
        ))}
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <Card className="p-12 text-center">
        <p className="text-muted-foreground">No clients found. Create your first client to get started!</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {clients.map((client) => (
        <Card
          key={client.id}
          className="p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between gap-4">
            <div 
              className="flex-1 space-y-3 cursor-pointer" 
              onClick={() => navigate(`/clients/${client.id}`)}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg">
                    {client.last_name}, {client.first_name} {client.middle_name || ''}
                    {client.preferred_name && ` "${client.preferred_name}"`}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    MRN: {client.medical_record_number} | DOB: {format(new Date(client.date_of_birth), 'MM/dd/yyyy')} (Age {getAge(client.date_of_birth)})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={statusColors[client.status as keyof typeof statusColors]}>
                  {client.status}
                </Badge>
                {client.gender && (
                  <Badge variant="outline">{client.gender}</Badge>
                )}
                {client.pronouns && (
                  <Badge variant="outline">{client.pronouns}</Badge>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{client.primary_phone}</span>
                </div>
                {client.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{client.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Registered: {format(new Date(client.registration_date), 'MM/dd/yyyy')}</span>
                </div>
              </div>

              {(client as any).primary_therapist && (
                <div className="text-sm text-muted-foreground">
                  Primary Therapist: {(client as any).primary_therapist.first_name} {(client as any).primary_therapist.last_name}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {onToggleFavorite && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(client.id);
                  }}
                >
                  <Star 
                    className={`h-5 w-5 ${favoriteClients?.includes(client.id) ? 'fill-yellow-400 text-yellow-400' : ''}`}
                  />
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-card border z-50">
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/clients/${client.id}`);
                  }}>
                    View Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/clients/${client.id}/edit`);
                  }}>
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => e.stopPropagation()}>Schedule Appointment</DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => e.stopPropagation()}>View Chart</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
