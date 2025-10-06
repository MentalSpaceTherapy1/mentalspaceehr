import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface ClientProvidersPharmacyProps {
  formData: any;
  setFormData: (data: any) => void;
}

export function ClientProvidersPharmacy({ formData, setFormData }: ClientProvidersPharmacyProps) {
  const [clinicians, setClinicians] = useState<Array<{ id: string; name: string; role: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClinicians();
  }, []);

  const fetchClinicians = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .order('last_name');

      if (error) throw error;

      if (profiles) {
        // Get roles for each profile
        const { data: userRoles } = await supabase
          .from('user_roles')
          .select('user_id, role')
          .in('user_id', profiles.map(p => p.id));

        const cliniciansWithRoles = profiles.map(profile => {
          const roles = userRoles?.filter(ur => ur.user_id === profile.id).map(ur => ur.role) || [];
          const roleLabel = roles.includes('therapist') ? 'Therapist' : 
                          roles.includes('supervisor') ? 'Supervisor' :
                          roles.includes('administrator') ? 'Administrator' : 
                          'Staff';
          
          return {
            id: profile.id,
            name: `${profile.first_name} ${profile.last_name}`,
            role: roleLabel
          };
        });

        setClinicians(cliniciansWithRoles);
      }
    } catch (error) {
      console.error('Error fetching clinicians:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Treatment Team</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg">
        <div className="space-y-2">
          <Label htmlFor="primaryTherapist">Primary Therapist</Label>
          <Select
            value={formData.primaryTherapistId || 'none'}
            onValueChange={(value) => setFormData({
              ...formData,
              primaryTherapistId: value === 'none' ? undefined : value
            })}
            disabled={loading}
          >
            <SelectTrigger id="primaryTherapist">
              <SelectValue placeholder="Select therapist" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {clinicians.map(clinician => (
                <SelectItem key={clinician.id} value={clinician.id}>
                  {clinician.name} ({clinician.role})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="psychiatrist">Psychiatrist</Label>
          <Select
            value={formData.psychiatristId || 'none'}
            onValueChange={(value) => setFormData({
              ...formData,
              psychiatristId: value === 'none' ? undefined : value
            })}
            disabled={loading}
          >
            <SelectTrigger id="psychiatrist">
              <SelectValue placeholder="Select psychiatrist" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {clinicians.map(clinician => (
                <SelectItem key={clinician.id} value={clinician.id}>
                  {clinician.name} ({clinician.role})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="caseManager">Case Manager</Label>
          <Select
            value={formData.caseManagerId || 'none'}
            onValueChange={(value) => setFormData({
              ...formData,
              caseManagerId: value === 'none' ? undefined : value
            })}
            disabled={loading}
          >
            <SelectTrigger id="caseManager">
              <SelectValue placeholder="Select case manager" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {clinicians.map(clinician => (
                <SelectItem key={clinician.id} value={clinician.id}>
                  {clinician.name} ({clinician.role})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <h3 className="text-lg font-semibold pt-4">Primary Care Provider</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg">
        <div className="space-y-2">
          <Label htmlFor="pcpName">Provider Name</Label>
          <Input
            id="pcpName"
            value={formData.primaryCareProvider?.name || ''}
            onChange={(e) => setFormData({
              ...formData,
              primaryCareProvider: { ...formData.primaryCareProvider, name: e.target.value }
            })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pcpPhone">Phone Number</Label>
          <Input
            id="pcpPhone"
            type="tel"
            value={formData.primaryCareProvider?.phoneNumber || ''}
            onChange={(e) => setFormData({
              ...formData,
              primaryCareProvider: { ...formData.primaryCareProvider, phoneNumber: e.target.value }
            })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pcpFax">Fax Number</Label>
          <Input
            id="pcpFax"
            type="tel"
            value={formData.primaryCareProvider?.faxNumber || ''}
            onChange={(e) => setFormData({
              ...formData,
              primaryCareProvider: { ...formData.primaryCareProvider, faxNumber: e.target.value }
            })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pcpAddress">Address</Label>
          <Input
            id="pcpAddress"
            value={formData.primaryCareProvider?.address || ''}
            onChange={(e) => setFormData({
              ...formData,
              primaryCareProvider: { ...formData.primaryCareProvider, address: e.target.value }
            })}
          />
        </div>

        <div className="space-y-2">
          <Label>Last Visit Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !formData.primaryCareProvider?.lastVisitDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.primaryCareProvider?.lastVisitDate ? format(formData.primaryCareProvider.lastVisitDate, 'PPP') : 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-card border z-50" align="start">
              <Calendar
                mode="single"
                selected={formData.primaryCareProvider?.lastVisitDate}
                onSelect={(date) => setFormData({
                  ...formData,
                  primaryCareProvider: { ...formData.primaryCareProvider, lastVisitDate: date }
                })}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <h3 className="text-lg font-semibold pt-4">Referring Provider</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg">
        <div className="space-y-2">
          <Label htmlFor="refName">Provider Name</Label>
          <Input
            id="refName"
            value={formData.referringProvider?.name || ''}
            onChange={(e) => setFormData({
              ...formData,
              referringProvider: { ...formData.referringProvider, name: e.target.value }
            })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="refSpecialty">Specialty</Label>
          <Input
            id="refSpecialty"
            value={formData.referringProvider?.specialty || ''}
            onChange={(e) => setFormData({
              ...formData,
              referringProvider: { ...formData.referringProvider, specialty: e.target.value }
            })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="refPhone">Phone Number</Label>
          <Input
            id="refPhone"
            type="tel"
            value={formData.referringProvider?.phoneNumber || ''}
            onChange={(e) => setFormData({
              ...formData,
              referringProvider: { ...formData.referringProvider, phoneNumber: e.target.value }
            })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="refFax">Fax Number</Label>
          <Input
            id="refFax"
            type="tel"
            value={formData.referringProvider?.faxNumber || ''}
            onChange={(e) => setFormData({
              ...formData,
              referringProvider: { ...formData.referringProvider, faxNumber: e.target.value }
            })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="refNPI">NPI Number</Label>
          <Input
            id="refNPI"
            value={formData.referringProvider?.npi || ''}
            onChange={(e) => setFormData({
              ...formData,
              referringProvider: { ...formData.referringProvider, npi: e.target.value }
            })}
          />
        </div>

        <div className="space-y-2">
          <Label>Referral Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !formData.referringProvider?.referralDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.referringProvider?.referralDate ? format(formData.referringProvider.referralDate, 'PPP') : 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-card border z-50" align="start">
              <Calendar
                mode="single"
                selected={formData.referringProvider?.referralDate}
                onSelect={(date) => setFormData({
                  ...formData,
                  referringProvider: { ...formData.referringProvider, referralDate: date }
                })}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="refReason">Referral Reason</Label>
          <Textarea
            id="refReason"
            value={formData.referringProvider?.referralReason || ''}
            onChange={(e) => setFormData({
              ...formData,
              referringProvider: { ...formData.referringProvider, referralReason: e.target.value }
            })}
            placeholder="Reason for referral"
          />
        </div>
      </div>

      <h3 className="text-lg font-semibold pt-4">Preferred Pharmacy</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg">
        <div className="space-y-2">
          <Label htmlFor="pharmName">Pharmacy Name</Label>
          <Input
            id="pharmName"
            value={formData.preferredPharmacy?.pharmacyName || ''}
            onChange={(e) => setFormData({
              ...formData,
              preferredPharmacy: { ...formData.preferredPharmacy, pharmacyName: e.target.value }
            })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pharmPhone">Phone Number</Label>
          <Input
            id="pharmPhone"
            type="tel"
            value={formData.preferredPharmacy?.phoneNumber || ''}
            onChange={(e) => setFormData({
              ...formData,
              preferredPharmacy: { ...formData.preferredPharmacy, phoneNumber: e.target.value }
            })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pharmFax">Fax Number</Label>
          <Input
            id="pharmFax"
            type="tel"
            value={formData.preferredPharmacy?.faxNumber || ''}
            onChange={(e) => setFormData({
              ...formData,
              preferredPharmacy: { ...formData.preferredPharmacy, faxNumber: e.target.value }
            })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pharmNCPDP">NCPDP ID</Label>
          <Input
            id="pharmNCPDP"
            value={formData.preferredPharmacy?.ncpdpId || ''}
            onChange={(e) => setFormData({
              ...formData,
              preferredPharmacy: { ...formData.preferredPharmacy, ncpdpId: e.target.value }
            })}
            placeholder="National Council for Prescription Drug Programs ID"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="pharmAddress">Address</Label>
          <Input
            id="pharmAddress"
            value={formData.preferredPharmacy?.address || ''}
            onChange={(e) => setFormData({
              ...formData,
              preferredPharmacy: { ...formData.preferredPharmacy, address: e.target.value }
            })}
          />
        </div>
      </div>

      <h3 className="text-lg font-semibold pt-4">Guarantor/Responsible Party</h3>
      <p className="text-sm text-muted-foreground">If different from client</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg">
        <div className="space-y-2">
          <Label htmlFor="guarName">Full Name</Label>
          <Input
            id="guarName"
            value={formData.guarantor?.name || ''}
            onChange={(e) => setFormData({
              ...formData,
              guarantor: { ...formData.guarantor, name: e.target.value }
            })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="guarRelationship">Relationship to Client</Label>
          <Input
            id="guarRelationship"
            value={formData.guarantor?.relationship || ''}
            onChange={(e) => setFormData({
              ...formData,
              guarantor: { ...formData.guarantor, relationship: e.target.value }
            })}
          />
        </div>

        <div className="space-y-2">
          <Label>Date of Birth</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !formData.guarantor?.dateOfBirth && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.guarantor?.dateOfBirth ? format(formData.guarantor.dateOfBirth, 'PPP') : 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-card border z-50" align="start">
              <Calendar
                mode="single"
                selected={formData.guarantor?.dateOfBirth}
                onSelect={(date) => setFormData({
                  ...formData,
                  guarantor: { ...formData.guarantor, dateOfBirth: date }
                })}
                initialFocus
                className="pointer-events-auto"
                captionLayout="dropdown-buttons"
                fromYear={1900}
                toYear={new Date().getFullYear()}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label htmlFor="guarSSN">SSN (Optional)</Label>
          <Input
            id="guarSSN"
            type="password"
            value={formData.guarantor?.ssn || ''}
            onChange={(e) => setFormData({
              ...formData,
              guarantor: { ...formData.guarantor, ssn: e.target.value }
            })}
            placeholder="XXX-XX-XXXX"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="guarPhone">Phone</Label>
          <Input
            id="guarPhone"
            type="tel"
            value={formData.guarantor?.phone || ''}
            onChange={(e) => setFormData({
              ...formData,
              guarantor: { ...formData.guarantor, phone: e.target.value }
            })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="guarEmail">Email</Label>
          <Input
            id="guarEmail"
            type="email"
            value={formData.guarantor?.email || ''}
            onChange={(e) => setFormData({
              ...formData,
              guarantor: { ...formData.guarantor, email: e.target.value }
            })}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label>Address</Label>
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="guarStreet1">Street Address</Label>
          <Input
            id="guarStreet1"
            value={formData.guarantor?.address?.street1 || ''}
            onChange={(e) => setFormData({
              ...formData,
              guarantor: {
                ...formData.guarantor,
                address: { ...formData.guarantor?.address, street1: e.target.value }
              }
            })}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="guarStreet2">Street Address Line 2</Label>
          <Input
            id="guarStreet2"
            value={formData.guarantor?.address?.street2 || ''}
            onChange={(e) => setFormData({
              ...formData,
              guarantor: {
                ...formData.guarantor,
                address: { ...formData.guarantor?.address, street2: e.target.value }
              }
            })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="guarCity">City</Label>
          <Input
            id="guarCity"
            value={formData.guarantor?.address?.city || ''}
            onChange={(e) => setFormData({
              ...formData,
              guarantor: {
                ...formData.guarantor,
                address: { ...formData.guarantor?.address, city: e.target.value }
              }
            })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="guarState">State</Label>
          <Input
            id="guarState"
            value={formData.guarantor?.address?.state || ''}
            onChange={(e) => setFormData({
              ...formData,
              guarantor: {
                ...formData.guarantor,
                address: { ...formData.guarantor?.address, state: e.target.value }
              }
            })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="guarZipCode">ZIP Code</Label>
          <Input
            id="guarZipCode"
            value={formData.guarantor?.address?.zipCode || ''}
            onChange={(e) => setFormData({
              ...formData,
              guarantor: {
                ...formData.guarantor,
                address: { ...formData.guarantor?.address, zipCode: e.target.value }
              }
            })}
          />
        </div>
      </div>
    </div>
  );
}
