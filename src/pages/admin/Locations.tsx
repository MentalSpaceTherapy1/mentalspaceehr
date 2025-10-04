import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Plus, Edit, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

interface Location {
  id: string;
  location_name: string;
  street1: string;
  street2: string | null;
  city: string;
  state: string;
  zip_code: string;
  phone_number: string;
  is_active: boolean;
  place_of_service_code: string;
}

export default function Locations() {
  const navigate = useNavigate();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [formData, setFormData] = useState({
    location_name: '',
    street1: '',
    street2: '',
    city: '',
    state: '',
    zip_code: '',
    phone_number: '',
    is_active: true,
    place_of_service_code: '11',
  });

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('practice_locations')
        .select('*')
        .order('location_name');

      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load locations',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingLocation(null);
    setFormData({
      location_name: '',
      street1: '',
      street2: '',
      city: '',
      state: '',
      zip_code: '',
      phone_number: '',
      is_active: true,
      place_of_service_code: '11',
    });
    setDialogOpen(true);
  };

  const handleEdit = (location: Location) => {
    setEditingLocation(location);
    setFormData({
      location_name: location.location_name,
      street1: location.street1,
      street2: location.street2 || '',
      city: location.city,
      state: location.state,
      zip_code: location.zip_code,
      phone_number: location.phone_number,
      is_active: location.is_active,
      place_of_service_code: location.place_of_service_code,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editingLocation) {
        const { error } = await supabase
          .from('practice_locations')
          .update(formData)
          .eq('id', editingLocation.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('practice_locations')
          .insert([formData]);

        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: `Location ${editingLocation ? 'updated' : 'created'} successfully`,
      });

      setDialogOpen(false);
      fetchLocations();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save location',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading locations...</p>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/admin/practice-settings')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Practice Locations</h1>
              <p className="text-muted-foreground mt-1">
                Manage multiple office locations
              </p>
            </div>
          </div>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Add Location
          </Button>
        </div>

        {locations.length === 0 ? (
          <Card className="p-12 text-center">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No locations yet</h3>
            <p className="text-muted-foreground mb-4">
              Add your first practice location to get started
            </p>
            <Button onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Add Location
            </Button>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Location Name</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>POS Code</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.map((location) => (
                  <TableRow key={location.id}>
                    <TableCell className="font-medium">{location.location_name}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{location.street1}</div>
                        {location.street2 && <div>{location.street2}</div>}
                        <div>{location.city}, {location.state} {location.zip_code}</div>
                      </div>
                    </TableCell>
                    <TableCell>{location.phone_number}</TableCell>
                    <TableCell>{location.place_of_service_code}</TableCell>
                    <TableCell>
                      <Badge variant={location.is_active ? 'default' : 'outline'}>
                        {location.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(location)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingLocation ? 'Edit Location' : 'Add New Location'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="location_name">Location Name *</Label>
                <Input
                  id="location_name"
                  value={formData.location_name}
                  onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
                  placeholder="e.g., Main Office, Downtown Branch"
                />
              </div>

              <div>
                <Label htmlFor="street1">Street Address *</Label>
                <Input
                  id="street1"
                  value={formData.street1}
                  onChange={(e) => setFormData({ ...formData, street1: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="street2">Street Address Line 2</Label>
                <Input
                  id="street2"
                  value={formData.street2}
                  onChange={(e) => setFormData({ ...formData, street2: e.target.value })}
                  placeholder="Suite, Unit, Building, Floor, etc."
                />
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    maxLength={2}
                    placeholder="CA"
                  />
                </div>
                <div>
                  <Label htmlFor="zip_code">ZIP *</Label>
                  <Input
                    id="zip_code"
                    value={formData.zip_code}
                    onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone_number">Phone Number *</Label>
                  <Input
                    id="phone_number"
                    type="tel"
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="place_of_service_code">Place of Service Code *</Label>
                  <Input
                    id="place_of_service_code"
                    value={formData.place_of_service_code}
                    onChange={(e) => setFormData({ ...formData, place_of_service_code: e.target.value })}
                    placeholder="11 for Office"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <Label>Location Status</Label>
                  <p className="text-sm text-muted-foreground">
                    Inactive locations won't appear in scheduling
                  </p>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                {editingLocation ? 'Update' : 'Create'} Location
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
