import { useState } from 'react';
import { Upload, FileText, CheckCircle2, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { parse835EDI } from '@/lib/advancedmd/era-835-parser';
import { postERAPayments } from '@/lib/advancedmd/payment-posting';
const sb = supabase as any;

interface ProcessingStatus {
  status: 'idle' | 'uploading' | 'parsing' | 'posting' | 'complete' | 'error';
  progress: number;
  message: string;
  eraFileId?: string;
  results?: {
    totalClaims: number;
    successfulPosts: number;
    failedPosts: number;
  };
  errors?: string[];
  warnings?: string[];
}

export function ERAUploadProcessor() {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState<ProcessingStatus>({
    status: 'idle',
    progress: 0,
    message: '',
  });
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      if (!selectedFile.name.match(/\.(835|edi|x12|txt)$/i)) {
        toast({
          title: 'Invalid File Type',
          description: 'Please select a valid 835 EDI file (.835, .edi, .x12, or .txt)',
          variant: 'destructive',
        });
        return;
      }

      setFile(selectedFile);
      setProcessing({
        status: 'idle',
        progress: 0,
        message: '',
      });
    }
  };

  const processERAFile = async () => {
    if (!file) return;

    try {
      // Step 1: Upload file
      setProcessing({
        status: 'uploading',
        progress: 10,
        message: 'Uploading ERA file...',
      });

      const fileContent = await file.text();

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Create ERA file record
      const { data: eraFile, error: eraFileError } = await sb
        .from('advancedmd_era_files')
        .insert({
          file_name: file.name,
          file_content: fileContent,
          file_size: file.size,
          processing_status: 'Uploaded',
          uploaded_by: user.id,
        })
        .select()
        .single();

      if (eraFileError || !eraFile) {
        throw new Error(`Failed to create ERA file record: ${eraFileError?.message}`);
      }

      // Step 2: Parse EDI file
      setProcessing({
        status: 'parsing',
        progress: 30,
        message: 'Parsing 835 EDI file...',
        eraFileId: eraFile.id,
      });

      const parseResult = parse835EDI(fileContent);

      if (!parseResult.success || !parseResult.data) {
        await sb
          .from('advancedmd_era_files')
          .update({
            processing_status: 'Error',
            error_message: parseResult.errors?.[0] || 'Parse failed',
            error_details: { errors: parseResult.errors },
          })
          .eq('id', eraFile.id);

        setProcessing({
          status: 'error',
          progress: 0,
          message: 'Failed to parse ERA file',
          errors: parseResult.errors,
          eraFileId: eraFile.id,
        });
        return;
      }

      const eraData = parseResult.data;

      // Update ERA file with parsed data
      await sb
        .from('advancedmd_era_files')
        .update({
          processing_status: 'Parsed',
          interchange_control_number: eraData.interchangeControlNumber,
          transaction_control_number: eraData.transactionControlNumber,
          payer_id: eraData.payer.identificationCode,
          payer_name: eraData.payer.name,
          payer_address: eraData.payer.address,
          payment_method: eraData.paymentMethod,
          payment_amount: eraData.paymentAmount,
          payment_date: eraData.paymentDate.toISOString().split('T')[0],
          check_eft_number: eraData.checkEFTNumber,
          total_claims: eraData.claims.length,
          total_service_lines: eraData.claims.reduce((sum, c) => sum + c.serviceLines.length, 0),
        })
        .eq('id', eraFile.id);

      // Step 3: Post payments
      setProcessing({
        status: 'posting',
        progress: 50,
        message: `Posting payments for ${eraData.claims.length} claims...`,
        eraFileId: eraFile.id,
      });

      const postingResult = await postERAPayments(eraFile.id, eraData, user.id);

      // Step 4: Complete
      setProcessing({
        status: 'complete',
        progress: 100,
        message: 'ERA processing complete',
        eraFileId: eraFile.id,
        results: {
          totalClaims: postingResult.totalClaims,
          successfulPosts: postingResult.successfulPosts,
          failedPosts: postingResult.failedPosts,
        },
        warnings: parseResult.warnings,
      });

      toast({
        title: 'ERA Processing Complete',
        description: `Successfully posted ${postingResult.successfulPosts} of ${postingResult.totalClaims} claims`,
      });
    } catch (error) {
      console.error('ERA processing error:', error);

      setProcessing({
        status: 'error',
        progress: 0,
        message: 'Failed to process ERA file',
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      });

      toast({
        title: 'Processing Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const resetProcessor = () => {
    setFile(null);
    setProcessing({
      status: 'idle',
      progress: 0,
      message: '',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          ERA File Upload & Processing
        </CardTitle>
        <CardDescription>
          Upload and automatically process 835 Electronic Remittance Advice files
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File Upload */}
        {processing.status === 'idle' && (
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <input
                type="file"
                id="era-file-upload"
                className="hidden"
                accept=".835,.edi,.x12,.txt"
                onChange={handleFileSelect}
              />
              <label
                htmlFor="era-file-upload"
                className="flex flex-col items-center gap-2 cursor-pointer"
              >
                <FileText className="h-12 w-12 text-muted-foreground" />
                <div className="text-sm text-muted-foreground">
                  {file ? (
                    <>
                      <span className="font-medium text-foreground">{file.name}</span>
                      <br />
                      {(file.size / 1024).toFixed(2)} KB
                    </>
                  ) : (
                    <>
                      Click to upload or drag and drop
                      <br />
                      835 EDI files (.835, .edi, .x12, .txt)
                    </>
                  )}
                </div>
              </label>
            </div>

            {file && (
              <div className="flex gap-2">
                <Button onClick={processERAFile} className="flex-1">
                  <Upload className="h-4 w-4 mr-2" />
                  Process ERA File
                </Button>
                <Button onClick={resetProcessor} variant="outline">
                  Cancel
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Processing Status */}
        {(processing.status === 'uploading' ||
          processing.status === 'parsing' ||
          processing.status === 'posting') && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="font-medium">{processing.message}</span>
            </div>
            <Progress value={processing.progress} />
            <Alert>
              <AlertDescription>
                Processing ERA file. This may take a few moments...
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Complete Status */}
        {processing.status === 'complete' && processing.results && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">{processing.message}</span>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{processing.results.totalClaims}</div>
                  <div className="text-sm text-muted-foreground">Total Claims</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-green-600">
                    {processing.results.successfulPosts}
                  </div>
                  <div className="text-sm text-muted-foreground">Posted Successfully</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-red-600">
                    {processing.results.failedPosts}
                  </div>
                  <div className="text-sm text-muted-foreground">Failed to Post</div>
                </CardContent>
              </Card>
            </div>

            {processing.warnings && processing.warnings.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-2">Warnings:</div>
                  <ul className="list-disc list-inside space-y-1">
                    {processing.warnings.map((warning, index) => (
                      <li key={index} className="text-sm">
                        {warning}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button onClick={resetProcessor} className="flex-1">
                Process Another File
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (processing.eraFileId) {
                    window.location.href = `/payment-dashboard?era=${processing.eraFileId}`;
                  }
                }}
              >
                View Payment Details
              </Button>
            </div>
          </div>
        )}

        {/* Error Status */}
        {processing.status === 'error' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              <span className="font-medium">{processing.message}</span>
            </div>

            {processing.errors && processing.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertDescription>
                  <div className="font-medium mb-2">Errors:</div>
                  <ul className="list-disc list-inside space-y-1">
                    {processing.errors.map((error, index) => (
                      <li key={index} className="text-sm">
                        {error}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <Button onClick={resetProcessor} variant="outline" className="w-full">
              Try Again
            </Button>
          </div>
        )}

        {/* Info Box */}
        <div className="rounded-lg bg-muted p-4 text-sm">
          <div className="font-medium mb-2">About ERA Processing</div>
          <ul className="space-y-1 text-muted-foreground">
            <li>• Automatically matches payments to claims in your system</li>
            <li>• Posts payments and adjustments to claim records</li>
            <li>• Updates claim statuses based on payment information</li>
            <li>• Generates payment reconciliation records</li>
            <li>• Supports HIPAA-compliant 835 EDI format</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
