/**
 * Insurance Card Upload Component
 *
 * Allows uploading insurance card images with OCR extraction
 */

import { useState, useCallback } from 'react';
import { Upload, Camera, X, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface InsuranceCardUploadProps {
  clientId: string;
  insuranceId?: string;
  onExtracted?: (data: ExtractedInsuranceData) => void;
}

interface ExtractedInsuranceData {
  insuranceCompany?: string;
  memberId?: string;
  groupNumber?: string;
  payerId?: string;
  planName?: string;
  effectiveDate?: string;
  copay?: string;
  phoneNumber?: string;
  rxBin?: string;
  rxPcn?: string;
}

export function InsuranceCardUpload({
  clientId,
  insuranceId,
  onExtracted,
}: InsuranceCardUploadProps) {
  const { toast } = useToast();
  const [frontImage, setFrontImage] = useState<File | null>(null);
  const [backImage, setBackImage] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedInsuranceData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = useCallback((file: File, side: 'front' | 'back') => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid File',
        description: 'Please upload an image file (JPEG, PNG, etc.)',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Please upload an image smaller than 10MB',
        variant: 'destructive',
      });
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      if (side === 'front') {
        setFrontImage(file);
        setFrontPreview(reader.result as string);
      } else {
        setBackImage(file);
        setBackPreview(reader.result as string);
      }
    };
    reader.readAsDataURL(file);
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent, side: 'front' | 'back') => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file, side);
    }
  }, [handleFileSelect]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const removeImage = (side: 'front' | 'back') => {
    if (side === 'front') {
      setFrontImage(null);
      setFrontPreview(null);
    } else {
      setBackImage(null);
      setBackPreview(null);
    }
  };

  const uploadAndExtract = async () => {
    if (!frontImage) {
      toast({
        title: 'Missing Image',
        description: 'Please upload at least the front of the insurance card',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // Upload front image
      console.log('[InsuranceCard] Uploading front image...');
      const frontFileName = `${clientId}/insurance-card-front-${Date.now()}.${frontImage.name.split('.').pop()}`;
      const { data: frontUpload, error: frontError } = await supabase.storage
        .from('insurance-cards')
        .upload(frontFileName, frontImage, {
          cacheControl: '3600',
          upsert: false,
        });

      if (frontError) throw frontError;

      // Upload back image if provided
      let backFileName: string | null = null;
      if (backImage) {
        console.log('[InsuranceCard] Uploading back image...');
        backFileName = `${clientId}/insurance-card-back-${Date.now()}.${backImage.name.split('.').pop()}`;
        const { data: backUpload, error: backError } = await supabase.storage
          .from('insurance-cards')
          .upload(backFileName, backImage, {
            cacheControl: '3600',
            upsert: false,
          });

        if (backError) throw backError;
      }

      // Get public URLs
      const { data: frontUrl } = supabase.storage
        .from('insurance-cards')
        .getPublicUrl(frontUpload.path);

      setIsUploading(false);
      setIsExtracting(true);

      // Extract data using OCR (via Edge Function)
      console.log('[InsuranceCard] Extracting data with OCR...');
      const { data: ocrData, error: ocrError } = await supabase.functions.invoke('extract-insurance-card', {
        body: {
          frontImageUrl: frontUrl.publicUrl,
          backImageUrl: backFileName ? supabase.storage.from('insurance-cards').getPublicUrl(backFileName).data.publicUrl : null,
          clientId,
          insuranceId,
        },
      });

      if (ocrError) {
        console.error('[InsuranceCard] OCR error:', ocrError);
        // Continue without OCR data
        toast({
          title: 'OCR Extraction Warning',
          description: 'Card uploaded but automatic data extraction failed. Please enter details manually.',
          variant: 'default',
        });
      } else if (ocrData) {
        console.log('[InsuranceCard] Extracted data:', ocrData);
        setExtractedData(ocrData);
        onExtracted?.(ocrData);

        toast({
          title: 'Card Uploaded & Processed',
          description: 'Insurance card uploaded and data extracted successfully',
        });
      }

      // Store card images in database
      if (insuranceId) {
        await supabase
          .from('client_insurance')
          .update({
            front_card_image: frontUpload.path,
            back_card_image: backFileName,
            updated_at: new Date().toISOString(),
          })
          .eq('id', insuranceId);
      }

    } catch (err: any) {
      console.error('[InsuranceCard] Error:', err);
      setError(err.message || 'Failed to upload insurance card');
      toast({
        title: 'Upload Failed',
        description: err.message || 'Failed to upload insurance card',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      setIsExtracting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Insurance Card Upload
        </CardTitle>
        <CardDescription>
          Upload front and back images of the insurance card for automatic data extraction
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Front Image */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Front of Card <span className="text-red-500">*</span>
            </label>
            {frontPreview ? (
              <div className="relative group">
                <img
                  src={frontPreview}
                  alt="Front of insurance card"
                  className="w-full h-48 object-contain border-2 border-dashed border-primary rounded-lg bg-muted"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeImage('front')}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div
                className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary/50 cursor-pointer transition-colors bg-muted/50"
                onDrop={(e) => handleDrop(e, 'front')}
                onDragOver={handleDragOver}
                onClick={() => document.getElementById('front-upload')?.click()}
              >
                <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Drag & drop or click to upload
                </p>
                <input
                  id="front-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file, 'front');
                  }}
                />
              </div>
            )}
          </div>

          {/* Back Image */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Back of Card (Optional)
            </label>
            {backPreview ? (
              <div className="relative group">
                <img
                  src={backPreview}
                  alt="Back of insurance card"
                  className="w-full h-48 object-contain border-2 border-dashed border-primary rounded-lg bg-muted"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeImage('back')}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div
                className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary/50 cursor-pointer transition-colors bg-muted/50"
                onDrop={(e) => handleDrop(e, 'back')}
                onDragOver={handleDragOver}
                onClick={() => document.getElementById('back-upload')?.click()}
              >
                <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Drag & drop or click to upload
                </p>
                <input
                  id="back-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file, 'back');
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Extracted Data Display */}
        {extractedData && (
          <div className="border rounded-lg p-4 bg-green-50 dark:bg-green-950/30 space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <h4 className="font-semibold text-green-900 dark:text-green-100">
                Extracted Information
              </h4>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {extractedData.insuranceCompany && (
                <div>
                  <p className="text-muted-foreground">Insurance Company</p>
                  <p className="font-semibold">{extractedData.insuranceCompany}</p>
                </div>
              )}
              {extractedData.memberId && (
                <div>
                  <p className="text-muted-foreground">Member ID</p>
                  <p className="font-semibold">{extractedData.memberId}</p>
                </div>
              )}
              {extractedData.groupNumber && (
                <div>
                  <p className="text-muted-foreground">Group Number</p>
                  <p className="font-semibold">{extractedData.groupNumber}</p>
                </div>
              )}
              {extractedData.planName && (
                <div>
                  <p className="text-muted-foreground">Plan Name</p>
                  <p className="font-semibold">{extractedData.planName}</p>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Please verify all extracted information is correct before saving
            </p>
          </div>
        )}

        <Button
          onClick={uploadAndExtract}
          disabled={!frontImage || isUploading || isExtracting}
          className="w-full"
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : isExtracting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Extracting Data...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload & Extract
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Supported formats: JPG, PNG, PDF • Max size: 10MB
        </p>
      </CardContent>
    </Card>
  );
}
