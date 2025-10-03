import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ClientConsentsProps {
  formData: any;
  setFormData: (data: any) => void;
}

export function ClientConsents({ formData, setFormData }: ClientConsentsProps) {
  const updateConsent = (field: string, value: boolean) => {
    const dateField = `${field}Date`;
    setFormData({
      ...formData,
      consents: {
        ...formData.consents,
        [field]: value,
      },
      consentDates: {
        ...formData.consentDates,
        [dateField]: value ? new Date() : null,
      }
    });
  };

  const updateConsentDate = (field: string, date: Date | undefined) => {
    setFormData({
      ...formData,
      consentDates: {
        ...formData.consentDates,
        [`${field}Date`]: date || null,
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-muted/30">
        <p className="text-sm text-muted-foreground mb-4">
          Please review and confirm the following consents. These can be updated later from the client's profile.
        </p>

        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="treatmentConsent"
              checked={formData.consents.treatmentConsent}
              onCheckedChange={(checked) => updateConsent('treatmentConsent', !!checked)}
              className="mt-1"
            />
            <div className="flex-1 space-y-1">
              <Label htmlFor="treatmentConsent" className="cursor-pointer font-medium">
                Treatment Consent
              </Label>
              <p className="text-sm text-muted-foreground">
                Client consents to receive mental health treatment services
              </p>
              {formData.consents.treatmentConsent && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("w-full mt-2", !formData.consentDates?.treatmentConsentDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.consentDates?.treatmentConsentDate ? format(formData.consentDates.treatmentConsentDate, 'PPP') : 'Set consent date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-card border z-50">
                    <Calendar
                      mode="single"
                      selected={formData.consentDates?.treatmentConsentDate}
                      onSelect={(date) => updateConsentDate('treatmentConsent', date)}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="hipaaAcknowledgment"
              checked={formData.consents.hipaaAcknowledgment}
              onCheckedChange={(checked) => updateConsent('hipaaAcknowledgment', !!checked)}
              className="mt-1"
            />
            <div className="flex-1 space-y-1">
              <Label htmlFor="hipaaAcknowledgment" className="cursor-pointer font-medium">
                HIPAA Acknowledgment
              </Label>
              <p className="text-sm text-muted-foreground">
                Client acknowledges receipt of HIPAA Notice of Privacy Practices
              </p>
              {formData.consents.hipaaAcknowledgment && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("w-full mt-2", !formData.consentDates?.hipaaAcknowledgmentDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.consentDates?.hipaaAcknowledgmentDate ? format(formData.consentDates.hipaaAcknowledgmentDate, 'PPP') : 'Set acknowledgment date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-card border z-50">
                    <Calendar
                      mode="single"
                      selected={formData.consentDates?.hipaaAcknowledgmentDate}
                      onSelect={(date) => updateConsentDate('hipaaAcknowledgment', date)}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="releaseOfInformation"
              checked={formData.consents.releaseOfInformation}
              onCheckedChange={(checked) => updateConsent('releaseOfInformation', !!checked)}
              className="mt-1"
            />
            <div className="flex-1 space-y-1">
              <Label htmlFor="releaseOfInformation" className="cursor-pointer font-medium">
                Release of Information
              </Label>
              <p className="text-sm text-muted-foreground">
                Client authorizes release of information to specified parties
              </p>
              {formData.consents.releaseOfInformation && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("w-full mt-2", !formData.consentDates?.releaseOfInformationDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.consentDates?.releaseOfInformationDate ? format(formData.consentDates.releaseOfInformationDate, 'PPP') : 'Set authorization date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-card border z-50">
                    <Calendar
                      mode="single"
                      selected={formData.consentDates?.releaseOfInformationDate}
                      onSelect={(date) => updateConsentDate('releaseOfInformation', date)}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="electronicCommunication"
              checked={formData.consents.electronicCommunication}
              onCheckedChange={(checked) => updateConsent('electronicCommunication', !!checked)}
              className="mt-1"
            />
            <div className="space-y-1">
              <Label htmlFor="electronicCommunication" className="cursor-pointer font-medium">
                Electronic Communication
              </Label>
              <p className="text-sm text-muted-foreground">
                Client consents to receive electronic communications (email, text, portal)
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="appointmentReminders"
              checked={formData.consents.appointmentReminders}
              onCheckedChange={(checked) => updateConsent('appointmentReminders', !!checked)}
              className="mt-1"
            />
            <div className="space-y-1">
              <Label htmlFor="appointmentReminders" className="cursor-pointer font-medium">
                Appointment Reminders
              </Label>
              <p className="text-sm text-muted-foreground">
                Client agrees to receive appointment reminder notifications
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="photographyConsent"
              checked={formData.consents.photographyConsent}
              onCheckedChange={(checked) => updateConsent('photographyConsent', !!checked)}
              className="mt-1"
            />
            <div className="space-y-1">
              <Label htmlFor="photographyConsent" className="cursor-pointer font-medium">
                Photography Consent
              </Label>
              <p className="text-sm text-muted-foreground">
                Client consents to being photographed for identification purposes
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="researchParticipation"
              checked={formData.consents.researchParticipation}
              onCheckedChange={(checked) => updateConsent('researchParticipation', !!checked)}
              className="mt-1"
            />
            <div className="space-y-1">
              <Label htmlFor="researchParticipation" className="cursor-pointer font-medium">
                Research Participation (Optional)
              </Label>
              <p className="text-sm text-muted-foreground">
                Client consents to participate in research studies (if applicable)
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
