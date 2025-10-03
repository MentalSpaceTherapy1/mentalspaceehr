import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';

interface ClientConsentsProps {
  formData: any;
  setFormData: (data: any) => void;
}

export function ClientConsents({ formData, setFormData }: ClientConsentsProps) {
  const updateConsent = (field: string, value: boolean) => {
    setFormData({
      ...formData,
      consents: {
        ...formData.consents,
        [field]: value,
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
            <div className="space-y-1">
              <Label htmlFor="treatmentConsent" className="cursor-pointer font-medium">
                Treatment Consent
              </Label>
              <p className="text-sm text-muted-foreground">
                Client consents to receive mental health treatment services
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="hipaaAcknowledgment"
              checked={formData.consents.hipaaAcknowledgment}
              onCheckedChange={(checked) => updateConsent('hipaaAcknowledgment', !!checked)}
              className="mt-1"
            />
            <div className="space-y-1">
              <Label htmlFor="hipaaAcknowledgment" className="cursor-pointer font-medium">
                HIPAA Acknowledgment
              </Label>
              <p className="text-sm text-muted-foreground">
                Client acknowledges receipt of HIPAA Notice of Privacy Practices
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="releaseOfInformation"
              checked={formData.consents.releaseOfInformation}
              onCheckedChange={(checked) => updateConsent('releaseOfInformation', !!checked)}
              className="mt-1"
            />
            <div className="space-y-1">
              <Label htmlFor="releaseOfInformation" className="cursor-pointer font-medium">
                Release of Information
              </Label>
              <p className="text-sm text-muted-foreground">
                Client authorizes release of information to specified parties
              </p>
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
        </div>
      </Card>
    </div>
  );
}
