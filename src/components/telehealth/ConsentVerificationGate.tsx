import { useEffect, useState } from 'react';
import { useTelehealthConsent } from '@/hooks/useTelehealthConsent';
import { TelehealthConsentForm } from './TelehealthConsentForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { validateTelehealthLicensure } from '@/lib/stateLicensure';
import { supabase } from '@/integrations/supabase/client';

interface ConsentVerificationGateProps {
  clientId: string;
  clinicianId: string;
  onConsentVerified: (consentId: string) => void;
  children?: React.ReactNode;
}

export const ConsentVerificationGate = ({
  clientId,
  clinicianId,
  onConsentVerified,
  children,
}: ConsentVerificationGateProps) => {
  const [loading, setLoading] = useState(true);
  const [consentStatus, setConsentStatus] = useState<'missing' | 'expired' | 'expiring_soon' | 'active' | 'invalid_licensure' | 'not_required'>('missing');
  const [existingConsent, setExistingConsent] = useState<any>(null);
  const [daysUntilExpiration, setDaysUntilExpiration] = useState(0);
  const [showForm, setShowForm] = useState(false);
  
  const { getActiveConsent, checkConsentExpiration, createConsent, renewConsent } = useTelehealthConsent();

  useEffect(() => {
    checkConsent();
  }, [clientId]);

  const checkConsent = async () => {
    setLoading(true);
    
    // Check if consent is required
    const { data: settings } = await supabase
      .from('practice_settings')
      .select('telehealth_settings')
      .single();
    
    const requireConsent = (settings?.telehealth_settings as any)?.require_consent ?? true;
    
    // If consent not required, bypass all checks
    if (!requireConsent) {
      setConsentStatus('not_required');
      setLoading(false);
      onConsentVerified('consent-not-required');
      return;
    }

    // Check state licensure first
    const licensure = await validateTelehealthLicensure(clientId, clinicianId);
    
    if (!licensure.isValid) {
      setConsentStatus('invalid_licensure');
      setLoading(false);
      return;
    }

    // Check consent status
    const { data: consent } = await getActiveConsent(clientId);
    const { status, daysUntilExpiration: days } = await checkConsentExpiration(clientId);

    setExistingConsent(consent);
    setConsentStatus(status as any);
    setDaysUntilExpiration(days);
    setLoading(false);

    // Auto-proceed if consent is active and not expiring soon
    if (status === 'active' && days > 30 && consent) {
      onConsentVerified(consent.id);
    }
  };

  const handleConsentComplete = async (formData: any) => {
    if (existingConsent && (consentStatus === 'expired' || consentStatus === 'expiring_soon')) {
      const { data } = await renewConsent(existingConsent.id, formData);
      if (data) {
        onConsentVerified(data.id);
      }
    } else {
      const { data } = await createConsent(formData);
      if (data) {
        onConsentVerified(data.id);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Verifying consent status...</p>
        </div>
      </div>
    );
  }

  // Invalid licensure - block access
  if (consentStatus === 'invalid_licensure') {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle />
              Licensure Verification Required
            </CardTitle>
            <CardDescription>
              Unable to conduct telehealth session
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>
                The clinician is not licensed in the client's state of residence. Telehealth services cannot be provided across state lines without proper licensure.
              </AlertDescription>
            </Alert>
            <p className="text-sm text-muted-foreground mt-4">
              Please contact your administrator to update licensure information or schedule an in-person appointment.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Missing consent - show full form
  if (consentStatus === 'missing' || showForm) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <TelehealthConsentForm
          clientId={clientId}
          onComplete={handleConsentComplete}
          onCancel={() => setShowForm(false)}
        />
      </div>
    );
  }

  // Expired consent - show renewal prompt
  if (consentStatus === 'expired') {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="text-amber-500" />
              Consent Renewal Required
            </CardTitle>
            <CardDescription>
              Your telehealth consent has expired
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">
              To continue with telehealth services, you must review and renew your consent. This ensures you're informed of current policies and procedures.
            </p>
            <Button onClick={() => setShowForm(true)} className="w-full">
              Renew Consent
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Expiring soon - show warning with option to proceed
  if (consentStatus === 'expiring_soon') {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="text-amber-500" />
              Consent Expiring Soon
            </CardTitle>
            <CardDescription>
              {daysUntilExpiration} days until renewal required
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                Your telehealth consent will expire in {daysUntilExpiration} days. Consider renewing now to avoid interruption to services.
              </AlertDescription>
            </Alert>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => existingConsent && onConsentVerified(existingConsent.id)}
                className="flex-1"
              >
                Continue to Session
              </Button>
              <Button onClick={() => setShowForm(true)} className="flex-1">
                Renew Now
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Active consent or consent not required - render children (session)
  if (consentStatus === 'active' || consentStatus === 'not_required') {
    return <>{children}</>;
  }

  // Default fallback
  return <>{children}</>;
};
