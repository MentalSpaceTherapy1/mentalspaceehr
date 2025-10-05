import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useBandwidthTest, BandwidthTestResult } from '@/hooks/useBandwidthTest';
import { Wifi, WifiOff, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface BandwidthTestDialogProps {
  open: boolean;
  sessionId?: string;
  onComplete: (result: BandwidthTestResult | null) => void;
  onCancel: () => void;
}

export const BandwidthTestDialog = ({
  open,
  sessionId,
  onComplete,
  onCancel,
}: BandwidthTestDialogProps) => {
  const { testing, result, error, runTest, recordUserDecision } = useBandwidthTest();
  const [autoTestStarted, setAutoTestStarted] = useState(false);

  useEffect(() => {
    if (open && !autoTestStarted && !result) {
      setAutoTestStarted(true);
      runTest(sessionId);
    }
  }, [open, autoTestStarted, result, runTest, sessionId]);

  const handleProceed = async () => {
    if (result) {
      const quality = result.quality === 'good' ? 'HD' : result.quality === 'fair' ? 'SD' : 'Audio Only';
      await recordUserDecision(true, quality);
      onComplete(result);
    }
  };

  const handleRetest = async () => {
    setAutoTestStarted(false);
    await runTest(sessionId);
    setAutoTestStarted(true);
  };

  const handleCancel = async () => {
    if (result) {
      await recordUserDecision(false, 'Cancelled');
    }
    onCancel();
  };

  const getQualityIcon = () => {
    if (!result) return null;
    
    switch (result.quality) {
      case 'good':
        return <CheckCircle className="h-12 w-12 text-success" />;
      case 'fair':
        return <AlertTriangle className="h-12 w-12 text-warning" />;
      case 'poor':
        return <WifiOff className="h-12 w-12 text-destructive" />;
    }
  };

  const getQualityColor = () => {
    if (!result) return 'bg-muted';
    
    switch (result.quality) {
      case 'good':
        return 'bg-success';
      case 'fair':
        return 'bg-warning';
      case 'poor':
        return 'bg-destructive';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wifi className="h-5 w-5" />
            Connection Speed Test
          </DialogTitle>
          <DialogDescription>
            Testing your connection to ensure optimal video quality
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {testing && (
            <div className="space-y-3">
              <div className="flex items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
              <Progress value={undefined} className="w-full" />
              <p className="text-center text-sm text-muted-foreground">
                Testing your connection speed...
              </p>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {result && !testing && (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center space-y-2">
                {getQualityIcon()}
                <h3 className="text-lg font-semibold capitalize">
                  {result.quality} Connection
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border bg-card p-3">
                  <p className="text-xs text-muted-foreground">Download</p>
                  <p className="text-2xl font-bold">{result.downloadMbps}</p>
                  <p className="text-xs text-muted-foreground">Mbps</p>
                </div>
                <div className="rounded-lg border bg-card p-3">
                  <p className="text-xs text-muted-foreground">Upload</p>
                  <p className="text-2xl font-bold">{result.uploadMbps}</p>
                  <p className="text-xs text-muted-foreground">Mbps</p>
                </div>
              </div>

              <Alert>
                <AlertDescription className="text-sm">
                  {result.recommendation}
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Connection Quality</p>
                <Progress value={result.quality === 'good' ? 100 : result.quality === 'fair' ? 60 : 30} className={getQualityColor()} />
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {result && !testing && (
            <>
              <Button onClick={handleRetest} variant="outline" className="flex-1">
                Re-test
              </Button>
              <Button onClick={handleCancel} variant="outline" className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleProceed} className="flex-1">
                Proceed
              </Button>
            </>
          )}
          {testing && (
            <Button onClick={handleCancel} variant="outline" className="w-full">
              Cancel Test
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
