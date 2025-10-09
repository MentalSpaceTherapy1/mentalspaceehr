import { useState, useEffect } from 'react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PersonalInformationSection } from '@/components/portal/profile/PersonalInformationSection';
import { InsuranceSection } from '@/components/portal/profile/InsuranceSection';
import { PreferencesSection } from '@/components/portal/profile/PreferencesSection';
import { SecuritySettingsSection } from '@/components/portal/profile/SecuritySettingsSection';
import { usePortalAccount } from '@/hooks/usePortalAccount';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function PortalProfile() {
  const { portalContext, loading, updatePreferences, updateSecurity, refreshContext } = usePortalAccount();
  const [insuranceData, setInsuranceData] = useState<any[]>([]);
  const [loadingInsurance, setLoadingInsurance] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');

  useEffect(() => {
    // Only load insurance data when Insurance tab is active and context is ready
    if (activeTab === 'insurance' && portalContext?.client?.id && insuranceData.length === 0) {
      loadInsuranceData();
    }
  }, [activeTab, portalContext?.client?.id]);

  const loadInsuranceData = async () => {
    if (!portalContext?.client?.id) return;

    setLoadingInsurance(true);
    try {
      const { data, error } = await supabase
        .from('client_insurance')
        .select('*')
        .eq('client_id', portalContext.client.id)
        .order('rank');

      if (error) {
        console.error('[PortalProfile] Error loading insurance:', error);
        toast.error('Unable to load insurance information');
        return;
      }
      setInsuranceData(data || []);
    } catch (error) {
      console.error('[PortalProfile] Exception loading insurance:', error);
      toast.error('Unable to load insurance information');
    } finally {
      setLoadingInsurance(false);
    }
  };

  const handleUpdate = () => {
    refreshContext();
    loadInsuranceData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Unable to load profile data</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Profile Settings</h1>
          <p className="text-muted-foreground">Manage your personal information and account preferences</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="personal">Personal Info</TabsTrigger>
            <TabsTrigger value="insurance">Insurance</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="personal">
            <PersonalInformationSection
              clientData={portalContext.client}
              onUpdate={handleUpdate}
            />
          </TabsContent>

          <TabsContent value="insurance">
            {loadingInsurance ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <InsuranceSection
                clientData={portalContext.client}
                insuranceData={insuranceData}
                onUpdate={handleUpdate}
              />
            )}
          </TabsContent>

          <TabsContent value="preferences">
            <PreferencesSection
              preferences={portalContext.preferences}
              onUpdate={updatePreferences}
            />
          </TabsContent>

          <TabsContent value="security">
            <SecuritySettingsSection
              security={portalContext.security}
              onUpdate={updateSecurity}
            />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
