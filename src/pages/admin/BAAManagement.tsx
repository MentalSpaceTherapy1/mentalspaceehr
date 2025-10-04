import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, XCircle, AlertTriangle, Plus } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

interface BAARecord {
  id: string;
  provider_name: string;
  baa_signed: boolean;
  baa_signed_date: string | null;
  baa_expiration_date: string | null;
  baa_document_url: string | null;
  contact_email: string | null;
  notes: string | null;
  is_active: boolean;
}

export default function BAAManagement() {
  const [baas, setBaas] = useState<BAARecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBaa, setEditingBaa] = useState<BAARecord | null>(null);

  useEffect(() => {
    loadBAAs();
  }, []);

  const loadBAAs = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_provider_baa')
        .select('*')
        .order('provider_name');

      if (error) throw error;
      setBaas(data || []);
    } catch (error) {
      console.error('Error loading BAAs:', error);
      toast.error('Failed to load BAA records');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const baaData = {
      provider_name: formData.get('provider_name') as string,
      baa_signed: formData.get('baa_signed') === 'on',
      baa_signed_date: formData.get('baa_signed_date') as string || null,
      baa_expiration_date: formData.get('baa_expiration_date') as string || null,
      baa_document_url: formData.get('baa_document_url') as string || null,
      contact_email: formData.get('contact_email') as string || null,
      notes: formData.get('notes') as string || null,
      is_active: formData.get('is_active') === 'on',
    };

    try {
      if (editingBaa) {
        const { error } = await supabase
          .from('ai_provider_baa')
          .update(baaData)
          .eq('id', editingBaa.id);

        if (error) throw error;
        toast.success('BAA record updated successfully');
      } else {
        const { error } = await supabase
          .from('ai_provider_baa')
          .insert([baaData]);

        if (error) throw error;
        toast.success('BAA record created successfully');
      }

      setIsDialogOpen(false);
      setEditingBaa(null);
      loadBAAs();
    } catch (error) {
      console.error('Error saving BAA:', error);
      toast.error('Failed to save BAA record');
    }
  };

  const isExpiringSoon = (expirationDate: string | null) => {
    if (!expirationDate) return false;
    const expDate = new Date(expirationDate);
    const today = new Date();
    const daysUntilExpiry = Math.floor((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 90 && daysUntilExpiry >= 0;
  };

  const isExpired = (expirationDate: string | null) => {
    if (!expirationDate) return false;
    return new Date(expirationDate) < new Date();
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading BAA records...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">HIPAA BAA Management</h1>
            <p className="text-muted-foreground mt-2">Manage Business Associate Agreements with AI providers</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingBaa(null)}>
                <Plus className="h-4 w-4 mr-2" />
                Add BAA
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingBaa ? 'Edit' : 'Add'} BAA Record</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="provider_name">Provider Name</Label>
                  <Input
                    id="provider_name"
                    name="provider_name"
                    defaultValue={editingBaa?.provider_name}
                    required
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="baa_signed"
                    name="baa_signed"
                    defaultChecked={editingBaa?.baa_signed}
                  />
                  <Label htmlFor="baa_signed">BAA Signed</Label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="baa_signed_date">Signed Date</Label>
                    <Input
                      id="baa_signed_date"
                      name="baa_signed_date"
                      type="date"
                      defaultValue={editingBaa?.baa_signed_date || ''}
                    />
                  </div>
                  <div>
                    <Label htmlFor="baa_expiration_date">Expiration Date</Label>
                    <Input
                      id="baa_expiration_date"
                      name="baa_expiration_date"
                      type="date"
                      defaultValue={editingBaa?.baa_expiration_date || ''}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="baa_document_url">Document URL</Label>
                  <Input
                    id="baa_document_url"
                    name="baa_document_url"
                    type="url"
                    defaultValue={editingBaa?.baa_document_url || ''}
                  />
                </div>
                <div>
                  <Label htmlFor="contact_email">Contact Email</Label>
                  <Input
                    id="contact_email"
                    name="contact_email"
                    type="email"
                    defaultValue={editingBaa?.contact_email || ''}
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    rows={3}
                    defaultValue={editingBaa?.notes || ''}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="is_active"
                    name="is_active"
                    defaultChecked={editingBaa?.is_active ?? true}
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Save</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4">
          {baas.map((baa) => (
            <Card key={baa.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {baa.provider_name}
                      {baa.baa_signed ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                    </CardTitle>
                    <CardDescription>
                      {baa.baa_signed ? 'BAA Signed' : 'BAA Not Signed'}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {baa.baa_expiration_date && isExpiringSoon(baa.baa_expiration_date) && !isExpired(baa.baa_expiration_date) && (
                      <Badge variant="outline" className="bg-yellow-50">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Expiring Soon
                      </Badge>
                    )}
                    {baa.baa_expiration_date && isExpired(baa.baa_expiration_date) && (
                      <Badge variant="destructive">Expired</Badge>
                    )}
                    {!baa.is_active && <Badge variant="secondary">Inactive</Badge>}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingBaa(baa);
                        setIsDialogOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {baa.baa_signed_date && (
                    <div>
                      <span className="font-medium">Signed Date:</span>{' '}
                      {new Date(baa.baa_signed_date).toLocaleDateString()}
                    </div>
                  )}
                  {baa.baa_expiration_date && (
                    <div>
                      <span className="font-medium">Expiration:</span>{' '}
                      {new Date(baa.baa_expiration_date).toLocaleDateString()}
                    </div>
                  )}
                  {baa.contact_email && (
                    <div>
                      <span className="font-medium">Contact:</span> {baa.contact_email}
                    </div>
                  )}
                  {baa.baa_document_url && (
                    <div>
                      <span className="font-medium">Document:</span>{' '}
                      <a href={baa.baa_document_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        View BAA
                      </a>
                    </div>
                  )}
                </div>
                {baa.notes && (
                  <div className="mt-4 p-3 bg-muted rounded-md">
                    <p className="text-sm text-muted-foreground">{baa.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
