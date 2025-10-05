import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, FileText, Loader2, Mail } from 'lucide-react';

interface InsuranceSectionProps {
  clientData: any;
  insuranceData: any[];
  onUpdate: () => void;
}

export function InsuranceSection({ clientData, insuranceData, onUpdate }: InsuranceSectionProps) {
  const [uploading, setUploading] = useState(false);
  const [selectedInsuranceId, setSelectedInsuranceId] = useState<string | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [frontCard, setFrontCard] = useState<File | null>(null);
  const [backCard, setBackCard] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (JPG or PNG)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    if (side === 'front') {
      setFrontCard(file);
    } else {
      setBackCard(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedInsuranceId || (!frontCard && !backCard)) {
      toast.error('Please select at least one card image to upload');
      return;
    }

    setUploading(true);
    try {
      const timestamp = Date.now();
      const updates: any = {};

      if (frontCard) {
        const frontPath = `${clientData.id}/${timestamp}_front.${frontCard.name.split('.').pop()}`;
        const { error: frontError } = await supabase.storage
          .from('client-insurance-cards')
          .upload(frontPath, frontCard);

        if (frontError) throw frontError;
        updates.front_card_image = frontPath;
      }

      if (backCard) {
        const backPath = `${clientData.id}/${timestamp}_back.${backCard.name.split('.').pop()}`;
        const { error: backError } = await supabase.storage
          .from('client-insurance-cards')
          .upload(backPath, backCard);

        if (backError) throw backError;
        updates.back_card_image = backPath;
      }

      // Update insurance record
      const { error: updateError } = await supabase
        .from('client_insurance')
        .update(updates)
        .eq('id', selectedInsuranceId);

      if (updateError) throw updateError;

      toast.success('Insurance cards uploaded successfully');
      setUploadDialogOpen(false);
      setFrontCard(null);
      setBackCard(null);
      setSelectedInsuranceId(null);
      onUpdate();
    } catch (error) {
      console.error('Error uploading insurance cards:', error);
      toast.error('Failed to upload insurance cards');
    } finally {
      setUploading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    try {
      const { error } = await supabase
        .from('client_portal_messages')
        .insert({
          client_id: clientData.id,
          clinician_id: clientData.primary_therapist_id,
          sender_id: clientData.portal_user_id,
          subject: 'Insurance Information Update Request',
          message: message,
          requires_response: true,
        });

      if (error) throw error;

      toast.success('Message sent to billing staff');
      setMessageDialogOpen(false);
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const maskMemberId = (id: string) => {
    if (!id || id.length < 4) return id;
    return '*'.repeat(id.length - 4) + id.slice(-4);
  };

  const getInsuranceImageUrl = async (path: string) => {
    if (!path) return null;
    const { data } = await supabase.storage
      .from('client-insurance-cards')
      .createSignedUrl(path, 3600);
    return data?.signedUrl || null;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Insurance Information</h3>
          <p className="text-sm text-muted-foreground">View your insurance coverage and upload card images</p>
        </div>
        <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Mail className="mr-2 h-4 w-4" />
              Request Update
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Insurance Update</DialogTitle>
              <DialogDescription>
                Send a message to billing staff to request changes to your insurance information
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Message</Label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Please describe the changes needed to your insurance information..."
                  rows={5}
                />
              </div>
              <Button onClick={handleSendMessage}>Send Message</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {insuranceData.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No insurance information on file. Contact your provider to add insurance.
          </CardContent>
        </Card>
      ) : (
        insuranceData.map((insurance) => (
          <Card key={insurance.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{insurance.insurance_company}</CardTitle>
                  <CardDescription>{insurance.plan_name}</CardDescription>
                </div>
                <Badge>{insurance.rank}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Member ID</Label>
                  <p className="font-medium">{maskMemberId(insurance.member_id)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Group Number</Label>
                  <p className="font-medium">{insurance.group_number || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Plan Type</Label>
                  <p className="font-medium">{insurance.plan_type}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Effective Date</Label>
                  <p className="font-medium">{new Date(insurance.effective_date).toLocaleDateString()}</p>
                </div>
              </div>

              {(insurance.front_card_image || insurance.back_card_image) && (
                <div>
                  <Label className="text-muted-foreground">Insurance Cards</Label>
                  <div className="flex gap-4 mt-2">
                    {insurance.front_card_image && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          const url = await getInsuranceImageUrl(insurance.front_card_image);
                          if (url) window.open(url, '_blank');
                        }}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        View Front Card
                      </Button>
                    )}
                    {insurance.back_card_image && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          const url = await getInsuranceImageUrl(insurance.back_card_image);
                          if (url) window.open(url, '_blank');
                        }}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        View Back Card
                      </Button>
                    )}
                  </div>
                </div>
              )}

              <Dialog open={uploadDialogOpen && selectedInsuranceId === insurance.id} onOpenChange={(open) => {
                setUploadDialogOpen(open);
                if (!open) setSelectedInsuranceId(null);
              }}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedInsuranceId(insurance.id)}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Insurance Cards
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Upload Insurance Cards</DialogTitle>
                    <DialogDescription>
                      Upload images of your insurance card (front and back). Max file size: 5MB.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Front of Card</Label>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, 'front')}
                      />
                      {frontCard && <p className="text-sm text-muted-foreground mt-1">{frontCard.name}</p>}
                    </div>
                    <div>
                      <Label>Back of Card</Label>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, 'back')}
                      />
                      {backCard && <p className="text-sm text-muted-foreground mt-1">{backCard.name}</p>}
                    </div>
                    <Button onClick={handleUpload} disabled={uploading}>
                      {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Upload Cards
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
