import { useState, useEffect } from 'react';
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
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { ChevronLeft, Save } from 'lucide-react';

export default function ClientEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [activeTab, setActiveTab] = useState('basic');
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    suffix: '',
    preferredName: '',
    pronouns: '',
    dateOfBirth: undefined as Date | undefined,
    previousNames: [] as string[],
    primaryPhone: '',
    primaryPhoneType: 'Mobile',
    secondaryPhone: '',
    secondaryPhoneType: '',
    email: '',
    preferredContactMethod: 'Phone',
    okayToLeaveMessage: false,
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
    education: '',
    employmentStatus: '',
    occupation: '',
    employer: '',
    livingArrangement: '',
    housingStatus: '',
    isVeteran: false,
    militaryBranch: '',
    militaryDischargeType: '',
    legalStatus: '',
    guardianName: '',
    guardianPhone: '',
    guardianRelationship: '',
    previousMRN: '',
    previousSystemName: '',
    primaryCareProvider: null as any,
    referringProvider: null as any,
    preferredPharmacy: null as any,
    guarantor: null as any,
    specialNeeds: '',
    accessibilityNeeds: [] as string[],
    allergyAlerts: [] as string[],
    primaryTherapistId: undefined,
    psychiatristId: undefined,
    caseManagerId: undefined,
    emergencyContacts: [] as any[],
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

  useEffect(() => {
    if (id) {
      fetchClientData();
    }
  }, [id]);

  const fetchClientData = async () => {
    try {
      setFetching(true);
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (clientError) throw clientError;
      if (!client) {
        toast({
          title: 'Error',
          description: 'Client not found',
          variant: 'destructive',
        });
        navigate('/clients');
        return;
      }

      // Fetch emergency contacts
      const { data: contacts } = await supabase
        .from('emergency_contacts')
        .select('*')
        .eq('client_id', id);

      setFormData({
        firstName: client.first_name,
        middleName: client.middle_name || '',
        lastName: client.last_name,
        suffix: client.suffix || '',
        preferredName: client.preferred_name || '',
        pronouns: client.pronouns || '',
        dateOfBirth: client.date_of_birth ? new Date(client.date_of_birth) : undefined,
        previousNames: client.previous_names || [],
        primaryPhone: client.primary_phone,
        primaryPhoneType: client.primary_phone_type || 'Mobile',
        secondaryPhone: client.secondary_phone || '',
        secondaryPhoneType: client.secondary_phone_type || '',
        email: client.email || '',
        preferredContactMethod: client.preferred_contact_method || 'Phone',
        okayToLeaveMessage: client.okay_to_leave_message || false,
        street1: client.street1,
        street2: client.street2 || '',
        city: client.city,
        state: client.state,
        zipCode: client.zip_code,
        county: client.county || '',
        isTemporaryAddress: client.is_temporary_address || false,
        temporaryUntil: client.temporary_until ? new Date(client.temporary_until) : undefined,
        hasMailingAddress: !!client.mailing_address,
        mailingAddress: client.mailing_address,
        gender: client.gender,
        genderIdentity: client.gender_identity || '',
        sexAssignedAtBirth: client.sex_assigned_at_birth,
        sexualOrientation: client.sexual_orientation || '',
        maritalStatus: client.marital_status,
        race: client.race || [],
        ethnicity: client.ethnicity,
        primaryLanguage: client.primary_language || 'English',
        otherLanguagesSpoken: client.other_languages_spoken || [],
        needsInterpreter: client.needs_interpreter || false,
        interpreterLanguage: client.interpreter_language || '',
        religion: client.religion || '',
        education: client.education || '',
        employmentStatus: client.employment_status || '',
        occupation: client.occupation || '',
        employer: client.employer || '',
        livingArrangement: client.living_arrangement || '',
        housingStatus: client.housing_status || '',
        isVeteran: client.is_veteran || false,
        militaryBranch: client.military_branch || '',
        militaryDischargeType: client.military_discharge_type || '',
        legalStatus: client.legal_status || '',
        guardianName: client.guardian_name || '',
        guardianPhone: client.guardian_phone || '',
        guardianRelationship: client.guardian_relationship || '',
        previousMRN: client.previous_mrn || '',
        previousSystemName: client.previous_system_name || '',
        primaryCareProvider: client.primary_care_provider,
        referringProvider: client.referring_provider,
        preferredPharmacy: client.preferred_pharmacy,
        guarantor: client.guarantor,
        specialNeeds: client.special_needs || '',
        accessibilityNeeds: client.accessibility_needs || [],
        allergyAlerts: client.allergy_alerts || [],
        primaryTherapistId: client.primary_therapist_id,
        psychiatristId: client.psychiatrist_id,
        caseManagerId: client.case_manager_id,
        emergencyContacts: contacts || [],
        consents: (client.consents as any) || {
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
    } catch (error) {
      console.error('Error fetching client:', error);
      toast({
        title: 'Error',
        description: 'Failed to load client data',
        variant: 'destructive',
      });
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async () => {
    if (!user || !id) return;

    // Validation
    if (!formData.firstName || !formData.lastName || !formData.dateOfBirth) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields (First Name, Last Name, Date of Birth)',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.primaryPhone || !formData.email || !formData.street1 || !formData.city || !formData.state || !formData.zipCode) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields (Phone, Email, Address)',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Update client
      const { error: clientError } = await supabase
        .from('clients')
        .update({
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
          email: formData.email,
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
          updated_by: user.id,
        })
        .eq('id', id);

      if (clientError) throw clientError;

      // Delete existing emergency contacts and insert new ones
      await supabase.from('emergency_contacts').delete().eq('client_id', id);
      
      if (formData.emergencyContacts.length > 0) {
        const emergencyContactsData = formData.emergencyContacts.map(contact => ({
          client_id: id,
          ...contact,
        }));

        const { error: contactsError } = await supabase
          .from('emergency_contacts')
          .insert(emergencyContactsData);

        if (contactsError) throw contactsError;
      }

      toast({
        title: 'Success',
        description: `Client ${formData.firstName} ${formData.lastName} has been updated successfully!`,
      });

      navigate(`/clients/${id}`);
    } catch (error) {
      console.error('Error updating client:', error);
      toast({
        title: 'Error',
        description: 'Failed to update client',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Loading client data...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/clients/${id}`)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">Edit Client: {formData.firstName} {formData.lastName}</h1>
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
            <Button variant="outline" onClick={() => navigate(`/clients/${id}`)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
