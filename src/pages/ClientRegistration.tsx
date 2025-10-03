import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClientBasicInfo } from '@/components/clients/registration/ClientBasicInfo';
import { ClientContactInfo } from '@/components/clients/registration/ClientContactInfo';
import { ClientDemographics } from '@/components/clients/registration/ClientDemographics';
import { ClientMedicalInfo } from '@/components/clients/registration/ClientMedicalInfo';
import { ClientProvidersPharmacy } from '@/components/clients/registration/ClientProvidersPharmacy';
import { ClientSpecialNeeds } from '@/components/clients/registration/ClientSpecialNeeds';
import { ClientEmergencyContacts } from '@/components/clients/registration/ClientEmergencyContacts';
import { ClientConsents } from '@/components/clients/registration/ClientConsents';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { ChevronLeft, Save } from 'lucide-react';

export default function ClientRegistration() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [formData, setFormData] = useState({
    // Basic Info
    firstName: '',
    middleName: '',
    lastName: '',
    suffix: '',
    preferredName: '',
    pronouns: '',
    dateOfBirth: undefined as Date | undefined,
    previousNames: [] as string[],
    
    // Contact Info
    primaryPhone: '',
    primaryPhoneType: 'Mobile',
    secondaryPhone: '',
    secondaryPhoneType: '',
    email: '',
    preferredContactMethod: 'Phone',
    okayToLeaveMessage: false,
    
    // Address
    street1: '',
    street2: '',
    city: '',
    state: '',
    zipCode: '',
    county: '',
    isTemporaryAddress: false,
    temporaryUntil: undefined as Date | undefined,
    hasMailingAddress: false,
    mailingAddress: null as any,
    
    // Demographics
    gender: undefined,
    genderIdentity: '',
    sexAssignedAtBirth: undefined,
    sexualOrientation: '',
    maritalStatus: undefined,
    race: [] as string[],
    ethnicity: undefined,
    primaryLanguage: 'English',
    otherLanguagesSpoken: [] as string[],
    needsInterpreter: false,
    interpreterLanguage: '',
    religion: '',
    
    // Social Info
    education: '',
    employmentStatus: '',
    occupation: '',
    employer: '',
    livingArrangement: '',
    housingStatus: '',
    
    // Veteran
    isVeteran: false,
    militaryBranch: '',
    militaryDischargeType: '',
    
    // Legal
    legalStatus: '',
    guardianName: '',
    guardianPhone: '',
    guardianRelationship: '',
    
    // Previous System
    previousMRN: '',
    previousSystemName: '',
    
    // Providers & Pharmacy
    primaryCareProvider: null as any,
    referringProvider: null as any,
    preferredPharmacy: null as any,
    guarantor: null as any,
    
    // Special Needs & Alerts
    specialNeeds: '',
    accessibilityNeeds: [] as string[],
    allergyAlerts: [] as string[],
    
    // Assignment
    primaryTherapistId: undefined,
    psychiatristId: undefined,
    caseManagerId: undefined,
    
    // Emergency Contacts
    emergencyContacts: [] as any[],
    
    // Consents
    consents: {
      treatmentConsent: false,
      hipaaAcknowledgment: false,
      releaseOfInformation: false,
      electronicCommunication: false,
      appointmentReminders: false,
      photographyConsent: false,
      researchParticipation: false,
    },
    consentDates: {
      treatmentConsentDate: null,
      hipaaAcknowledgmentDate: null,
      releaseOfInformationDate: null,
    },
  });

  const handleSubmit = async () => {
    if (!user) return;

    // Validation
    if (!formData.firstName || !formData.lastName || !formData.dateOfBirth) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields (First Name, Last Name, Date of Birth)',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.primaryPhone || !formData.street1 || !formData.city || !formData.state || !formData.zipCode) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required contact and address fields',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Generate MRN
      const { data: mrnData, error: mrnError } = await supabase.rpc('generate_mrn');
      if (mrnError) throw mrnError;

      // Create client
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .insert([{
          medical_record_number: mrnData,
          first_name: formData.firstName,
          middle_name: formData.middleName || null,
          last_name: formData.lastName,
          suffix: formData.suffix || null,
          preferred_name: formData.preferredName || null,
          pronouns: formData.pronouns || null,
          previous_names: formData.previousNames.length > 0 ? formData.previousNames : null,
          date_of_birth: formData.dateOfBirth!.toISOString().split('T')[0],
          primary_phone: formData.primaryPhone,
          primary_phone_type: formData.primaryPhoneType,
          secondary_phone: formData.secondaryPhone || null,
          secondary_phone_type: formData.secondaryPhoneType || null,
          email: formData.email || null,
          preferred_contact_method: formData.preferredContactMethod,
          okay_to_leave_message: formData.okayToLeaveMessage,
          street1: formData.street1,
          street2: formData.street2 || null,
          city: formData.city,
          state: formData.state,
          zip_code: formData.zipCode,
          county: formData.county || null,
          is_temporary_address: formData.isTemporaryAddress,
          temporary_until: formData.temporaryUntil?.toISOString().split('T')[0] || null,
          mailing_address: formData.hasMailingAddress ? formData.mailingAddress : null,
          gender: formData.gender || null,
          gender_identity: formData.genderIdentity || null,
          sex_assigned_at_birth: formData.sexAssignedAtBirth || null,
          sexual_orientation: formData.sexualOrientation || null,
          marital_status: formData.maritalStatus || null,
          race: formData.race.length > 0 ? formData.race : null,
          ethnicity: formData.ethnicity || null,
          primary_language: formData.primaryLanguage,
          other_languages_spoken: formData.otherLanguagesSpoken.length > 0 ? formData.otherLanguagesSpoken : null,
          needs_interpreter: formData.needsInterpreter,
          interpreter_language: formData.interpreterLanguage || null,
          religion: formData.religion || null,
          education: formData.education || null,
          employment_status: formData.employmentStatus || null,
          occupation: formData.occupation || null,
          employer: formData.employer || null,
          living_arrangement: formData.livingArrangement || null,
          housing_status: formData.housingStatus || null,
          is_veteran: formData.isVeteran,
          military_branch: formData.militaryBranch || null,
          military_discharge_type: formData.militaryDischargeType || null,
          legal_status: formData.legalStatus || null,
          guardian_name: formData.guardianName || null,
          guardian_phone: formData.guardianPhone || null,
          guardian_relationship: formData.guardianRelationship || null,
          previous_mrn: formData.previousMRN || null,
          previous_system_name: formData.previousSystemName || null,
          primary_care_provider: formData.primaryCareProvider,
          referring_provider: formData.referringProvider,
          preferred_pharmacy: formData.preferredPharmacy,
          guarantor: formData.guarantor,
          special_needs: formData.specialNeeds || null,
          accessibility_needs: formData.accessibilityNeeds.length > 0 ? formData.accessibilityNeeds : null,
          allergy_alerts: formData.allergyAlerts.length > 0 ? formData.allergyAlerts : null,
          primary_therapist_id: formData.primaryTherapistId || null,
          psychiatrist_id: formData.psychiatristId || null,
          case_manager_id: formData.caseManagerId || null,
          consents: formData.consents,
          created_by: user.id,
          updated_by: user.id,
        }])
        .select()
        .single();

      if (clientError) throw clientError;

      // Create emergency contacts
      if (formData.emergencyContacts.length > 0) {
        const emergencyContactsData = formData.emergencyContacts.map(contact => ({
          client_id: clientData.id,
          ...contact,
        }));

        const { error: contactsError } = await supabase
          .from('emergency_contacts')
          .insert(emergencyContactsData);

        if (contactsError) throw contactsError;
      }

      toast({
        title: 'Success',
        description: `Client ${formData.firstName} ${formData.lastName} has been registered successfully!`,
      });

      navigate(`/clients/${clientData.id}`);
    } catch (error) {
      console.error('Error creating client:', error);
      toast({
        title: 'Error',
        description: 'Failed to register client',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/clients')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">New Client Registration</h1>
        </div>

        <Card className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 gap-1">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="contact">Contact</TabsTrigger>
              <TabsTrigger value="demographics">Demographics</TabsTrigger>
              <TabsTrigger value="medical">Medical</TabsTrigger>
              <TabsTrigger value="providers">Providers</TabsTrigger>
              <TabsTrigger value="special">Special Needs</TabsTrigger>
              <TabsTrigger value="emergency">Emergency</TabsTrigger>
              <TabsTrigger value="consents">Consents</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-6">
              <ClientBasicInfo formData={formData} setFormData={setFormData} />
            </TabsContent>

            <TabsContent value="contact" className="space-y-4 mt-6">
              <ClientContactInfo formData={formData} setFormData={setFormData} />
            </TabsContent>

            <TabsContent value="demographics" className="space-y-4 mt-6">
              <ClientDemographics formData={formData} setFormData={setFormData} />
            </TabsContent>

            <TabsContent value="medical" className="space-y-4 mt-6">
              <ClientMedicalInfo formData={formData} setFormData={setFormData} />
            </TabsContent>

            <TabsContent value="providers" className="space-y-4 mt-6">
              <ClientProvidersPharmacy formData={formData} setFormData={setFormData} />
            </TabsContent>

            <TabsContent value="special" className="space-y-4 mt-6">
              <ClientSpecialNeeds formData={formData} setFormData={setFormData} />
            </TabsContent>

            <TabsContent value="emergency" className="space-y-4 mt-6">
              <ClientEmergencyContacts formData={formData} setFormData={setFormData} />
            </TabsContent>

            <TabsContent value="consents" className="space-y-4 mt-6">
              <ClientConsents formData={formData} setFormData={setFormData} />
            </TabsContent>
          </Tabs>

          <div className="flex justify-between mt-6 pt-6 border-t">
            <Button variant="outline" onClick={() => navigate('/clients')}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Saving...' : 'Save Client'}
            </Button>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
