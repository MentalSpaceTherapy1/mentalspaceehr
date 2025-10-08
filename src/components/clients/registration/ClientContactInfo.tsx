import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ClientContactInfoProps {
  formData: any;
  setFormData: (data: any) => void;
}

export function ClientContactInfo({ formData, setFormData }: ClientContactInfoProps) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Phone & Email</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="primaryPhone">Primary Phone *</Label>
          <Input
            id="primaryPhone"
            type="tel"
            value={formData.primaryPhone}
            onChange={(e) => setFormData({ ...formData, primaryPhone: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="primaryPhoneType">Phone Type</Label>
          <Select
            value={formData.primaryPhoneType}
            onValueChange={(value) => setFormData({ ...formData, primaryPhoneType: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border z-50">
              <SelectItem value="Mobile">Mobile</SelectItem>
              <SelectItem value="Home">Home</SelectItem>
              <SelectItem value="Work">Work</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="secondaryPhone">Secondary Phone</Label>
          <Input
            id="secondaryPhone"
            type="tel"
            value={formData.secondaryPhone}
            onChange={(e) => setFormData({ ...formData, secondaryPhone: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="secondaryPhoneType">Secondary Phone Type</Label>
          <Select
            value={formData.secondaryPhoneType}
            onValueChange={(value) => setFormData({ ...formData, secondaryPhoneType: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent className="bg-card border z-50">
              <SelectItem value="Mobile">Mobile</SelectItem>
              <SelectItem value="Home">Home</SelectItem>
              <SelectItem value="Work">Work</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label>Preferred Contact Method</Label>
          <Select
            value={formData.preferredContactMethod}
            onValueChange={(value) => setFormData({ ...formData, preferredContactMethod: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border z-50">
              <SelectItem value="Phone">Phone</SelectItem>
              <SelectItem value="Email">Email</SelectItem>
              <SelectItem value="Text">Text</SelectItem>
              <SelectItem value="Portal">Portal</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2 pt-8">
          <Checkbox
            id="okayToLeaveMessage"
            checked={formData.okayToLeaveMessage}
            onCheckedChange={(checked) => setFormData({ ...formData, okayToLeaveMessage: checked })}
          />
          <Label htmlFor="okayToLeaveMessage" className="cursor-pointer">
            Okay to leave message
          </Label>
        </div>
      </div>

      <div className="p-4 border rounded-lg bg-muted/50">
        <h4 className="font-medium mb-3">Communication Preferences</h4>
        <div className="space-y-3">
          <div className="flex items-start space-x-2">
            <Checkbox
              id="smsConsent"
              checked={formData.smsConsent || false}
              onCheckedChange={(checked) => setFormData({ ...formData, smsConsent: checked })}
            />
            <div className="flex-1">
              <Label htmlFor="smsConsent" className="cursor-pointer font-normal">
                I consent to receive appointment reminders via SMS text message
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Standard message and data rates may apply. You can opt out at any time.
              </p>
            </div>
          </div>
        </div>
      </div>

      <h3 className="text-lg font-semibold pt-4">Address</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="street1">Street Address *</Label>
          <Input
            id="street1"
            value={formData.street1}
            onChange={(e) => setFormData({ ...formData, street1: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="street2">Street Address Line 2</Label>
          <Input
            id="street2"
            value={formData.street2}
            onChange={(e) => setFormData({ ...formData, street2: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="city">City *</Label>
          <Input
            id="city"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="state">State *</Label>
          <Input
            id="state"
            value={formData.state}
            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="zipCode">ZIP Code *</Label>
          <Input
            id="zipCode"
            value={formData.zipCode}
            onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="county">County</Label>
          <Input
            id="county"
            value={formData.county}
            onChange={(e) => setFormData({ ...formData, county: e.target.value })}
          />
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="isTemporaryAddress"
            checked={formData.isTemporaryAddress}
            onCheckedChange={(checked) => setFormData({ ...formData, isTemporaryAddress: checked })}
          />
          <Label htmlFor="isTemporaryAddress" className="cursor-pointer">
            Temporary Address
          </Label>
        </div>

        {formData.isTemporaryAddress && (
          <div className="space-y-2">
            <Label>Temporary Until</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !formData.temporaryUntil && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.temporaryUntil ? format(formData.temporaryUntil, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-card border z-50" align="start">
                <Calendar
                  mode="single"
                  selected={formData.temporaryUntil}
                  onSelect={(date) => setFormData({ ...formData, temporaryUntil: date })}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>

      <h3 className="text-lg font-semibold pt-4">Mailing Address</h3>
      <div className="flex items-center space-x-2 mb-4">
        <Checkbox
          id="hasMailingAddress"
          checked={formData.hasMailingAddress}
          onCheckedChange={(checked) => setFormData({ ...formData, hasMailingAddress: checked })}
        />
        <Label htmlFor="hasMailingAddress" className="cursor-pointer">
          Mailing address different from physical address
        </Label>
      </div>

      {formData.hasMailingAddress && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="mailingStreet1">Street Address</Label>
            <Input
              id="mailingStreet1"
              value={formData.mailingAddress?.street1 || ''}
              onChange={(e) => setFormData({
                ...formData,
                mailingAddress: { ...formData.mailingAddress, street1: e.target.value }
              })}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="mailingStreet2">Street Address Line 2</Label>
            <Input
              id="mailingStreet2"
              value={formData.mailingAddress?.street2 || ''}
              onChange={(e) => setFormData({
                ...formData,
                mailingAddress: { ...formData.mailingAddress, street2: e.target.value }
              })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mailingCity">City</Label>
            <Input
              id="mailingCity"
              value={formData.mailingAddress?.city || ''}
              onChange={(e) => setFormData({
                ...formData,
                mailingAddress: { ...formData.mailingAddress, city: e.target.value }
              })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mailingState">State</Label>
            <Input
              id="mailingState"
              value={formData.mailingAddress?.state || ''}
              onChange={(e) => setFormData({
                ...formData,
                mailingAddress: { ...formData.mailingAddress, state: e.target.value }
              })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mailingZipCode">ZIP Code</Label>
            <Input
              id="mailingZipCode"
              value={formData.mailingAddress?.zipCode || ''}
              onChange={(e) => setFormData({
                ...formData,
                mailingAddress: { ...formData.mailingAddress, zipCode: e.target.value }
              })}
            />
          </div>
        </div>
      )}
    </div>
  );
}
