import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function ConfirmAppointment() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Invalid confirmation link');
      setLoading(false);
      return;
    }

    confirmAppointment();
  }, [token]);

  const confirmAppointment = async () => {
    try {
      setLoading(true);
      
      const { data, error: funcError } = await supabase.functions.invoke('confirm-appointment', {
        body: { token }
      });

      if (funcError) throw funcError;
      if (data.error) throw new Error(data.error);

      setSuccess(true);
    } catch (err) {
      console.error('Error confirming appointment:', err);
      setError(err instanceof Error ? err.message : 'Failed to confirm appointment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="text-center">Appointment Confirmation</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {loading && (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-muted-foreground">Confirming your appointment...</p>
            </div>
          )}

          {!loading && success && (
            <div className="flex flex-col items-center gap-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
              <div>
                <h3 className="text-xl font-semibold mb-2">Appointment Confirmed!</h3>
                <p className="text-muted-foreground">
                  Thank you for confirming your appointment. You will receive further details via email.
                </p>
              </div>
              <Button onClick={() => navigate('/')} className="mt-4">
                Return to Home
              </Button>
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center gap-4">
              <XCircle className="h-16 w-16 text-red-500" />
              <div>
                <h3 className="text-xl font-semibold mb-2">Confirmation Failed</h3>
                <p className="text-muted-foreground">{error}</p>
              </div>
              <Button onClick={() => navigate('/')} variant="outline" className="mt-4">
                Return to Home
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
