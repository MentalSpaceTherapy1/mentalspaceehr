import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Filter } from 'lucide-react';
import { ClientList } from '@/components/clients/ClientList';
import { ClientFilters } from '@/components/clients/ClientFilters';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type Client = Database['public']['Tables']['clients']['Row'];

export default function Clients() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    therapist: 'all',
    dateFrom: '',
    dateTo: '',
    insurance: 'all',
  });
  const [recentlyViewed, setRecentlyViewed] = useState<Client[]>([]);
  const [favoriteClients, setFavoriteClients] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      fetchClients();
      fetchRecentlyViewed();
      fetchFavoriteClients();
      subscribeToClients();
    }
  }, [user]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clients')
        .select(`
          *,
          primary_therapist:primary_therapist_id(id, first_name, last_name),
          psychiatrist:psychiatrist_id(id, first_name, last_name),
          case_manager:case_manager_id(id, first_name, last_name)
        `)
        .order('last_name', { ascending: true });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast({
        title: 'Error',
        description: 'Failed to load clients',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const subscribeToClients = () => {
    const channel = supabase
      .channel('clients_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clients',
        },
        () => {
          fetchClients();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchRecentlyViewed = async () => {
    const { data } = await supabase
      .from('recently_viewed_clients')
      .select(`
        client_id,
        clients (*)
      `)
      .eq('user_id', user?.id)
      .order('viewed_at', { ascending: false })
      .limit(10);
    
    if (data) {
      setRecentlyViewed(data.map((item: any) => item.clients).filter(Boolean));
    }
  };

  const fetchFavoriteClients = async () => {
    const { data } = await supabase
      .from('favorite_clients')
      .select('client_id')
      .eq('user_id', user?.id);
    
    if (data) {
      setFavoriteClients(data.map((item) => item.client_id));
    }
  };

  const toggleFavorite = async (clientId: string) => {
    if (favoriteClients.includes(clientId)) {
      await supabase
        .from('favorite_clients')
        .delete()
        .eq('user_id', user?.id)
        .eq('client_id', clientId);
      setFavoriteClients(favoriteClients.filter((id) => id !== clientId));
    } else {
      await supabase
        .from('favorite_clients')
        .insert({ user_id: user?.id, client_id: clientId });
      setFavoriteClients([...favoriteClients, clientId]);
    }
  };

  const filteredClients = clients.filter((client) => {
    // ✅ FIX: Handle null/undefined values properly in search
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = searchQuery === '' || (
      (client.first_name?.toLowerCase() || '').includes(searchLower) ||
      (client.last_name?.toLowerCase() || '').includes(searchLower) ||
      (client.medical_record_number?.toLowerCase() || '').includes(searchLower) ||
      (client.email?.toLowerCase() || '').includes(searchLower) ||
      (client.primary_phone || '').includes(searchQuery) ||
      (client.date_of_birth || '').includes(searchQuery)
    );

    const matchesStatus = filters.status === 'all' || client.status === filters.status;
    const matchesTherapist = filters.therapist === 'all' || client.primary_therapist_id === filters.therapist;

    const matchesDateRange =
      (!filters.dateFrom || client.registration_date >= filters.dateFrom) &&
      (!filters.dateTo || client.registration_date <= filters.dateTo);

    return matchesSearch && matchesStatus && matchesTherapist && matchesDateRange;
  });

  const favoriteClientsList = clients.filter((client) => favoriteClients.includes(client.id));

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Clients</h1>
          <Button onClick={() => navigate('/clients/new')}>
            <Plus className="h-4 w-4 mr-2" />
            New Client
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>

        {showFilters && (
          <ClientFilters filters={filters} onFiltersChange={setFilters} />
        )}

        {favoriteClientsList.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Favorite Clients</h2>
            <ClientList
              clients={favoriteClientsList}
              loading={false}
              onToggleFavorite={toggleFavorite}
              favoriteClients={favoriteClients}
            />
          </div>
        )}

        {recentlyViewed.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Recently Viewed</h2>
            <ClientList
              clients={recentlyViewed}
              loading={false}
              onToggleFavorite={toggleFavorite}
              favoriteClients={favoriteClients}
            />
          </div>
        )}

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">All Clients</h2>
          <ClientList
            clients={filteredClients}
            loading={loading}
            onToggleFavorite={toggleFavorite}
            favoriteClients={favoriteClients}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
