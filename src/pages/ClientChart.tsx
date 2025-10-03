import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  User, 
  CreditCard, 
  FileText, 
  Pill, 
  Stethoscope, 
  Calendar, 
  FolderOpen, 
  MessageSquare, 
  DollarSign, 
  History,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';
import { InsuranceBillingSection } from '@/components/clients/insurance/InsuranceBillingSection';

type Client = Database['public']['Tables']['clients']['Row'];

const chartSections = [
  { id: 'demographics', label: 'Demographics', icon: User },
  { id: 'insurance-billing', label: 'Insurance & Billing', icon: CreditCard },
  { 
    id: 'clinical-documents', 
    label: 'Clinical Documents', 
    icon: FileText,
    subsections: [
      { id: 'intake-assessment', label: 'Intake Assessment' },
      { id: 'progress-notes', label: 'Progress Notes' },
      { id: 'treatment-plans', label: 'Treatment Plans' },
      { id: 'psychiatric-evaluations', label: 'Psychiatric Evaluations' },
      { id: 'testing-assessments', label: 'Testing/Assessments' },
      { id: 'consultation-notes', label: 'Consultation Notes' },
    ]
  },
  { id: 'medications', label: 'Medications', icon: Pill },
  { id: 'diagnoses', label: 'Diagnoses', icon: Stethoscope },
  { id: 'appointments', label: 'Appointments', icon: Calendar },
  { id: 'documents-forms', label: 'Documents & Forms', icon: FolderOpen },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'payment-history', label: 'Payment History', icon: DollarSign },
  { id: 'audit-log', label: 'Audit Log', icon: History },
];

export default function ClientChart() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('demographics');
  const [expandedSections, setExpandedSections] = useState<string[]>(['clinical-documents']);

  useEffect(() => {
    if (user && id) {
      fetchClient();
      trackRecentlyViewed();
    }
  }, [user, id]);

  const fetchClient = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clients')
        .select(`
          *,
          primary_therapist:primary_therapist_id(id, first_name, last_name),
          psychiatrist:psychiatrist_id(id, first_name, last_name),
          case_manager:case_manager_id(id, first_name, last_name)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setClient(data);
    } catch (error) {
      console.error('Error fetching client:', error);
      toast({
        title: 'Error',
        description: 'Failed to load client information',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const trackRecentlyViewed = async () => {
    if (!user?.id || !id) return;
    
    await supabase
      .from('recently_viewed_clients')
      .upsert({ 
        user_id: user.id, 
        client_id: id,
        viewed_at: new Date().toISOString()
      }, { 
        onConflict: 'user_id,client_id',
        ignoreDuplicates: false 
      });
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'demographics':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Demographics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Full Name</p>
                  <p className="text-base">{client?.first_name} {client?.middle_name} {client?.last_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">MRN</p>
                  <p className="text-base">{client?.medical_record_number}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Date of Birth</p>
                  <p className="text-base">{client?.date_of_birth}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Gender</p>
                  <p className="text-base">{client?.gender || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Phone</p>
                  <p className="text-base">{client?.primary_phone}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="text-base">{client?.email || 'Not provided'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      case 'insurance-billing':
        return <InsuranceBillingSection clientId={id!} />;
      default:
        return (
          <Card>
            <CardHeader>
              <CardTitle>{chartSections.find(s => s.id === activeSection)?.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Content for {activeSection} will be implemented in future phases.</p>
            </CardContent>
          </Card>
        );
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6">Loading...</div>
      </DashboardLayout>
    );
  }

  if (!client) {
    return (
      <DashboardLayout>
        <div className="p-6">Client not found</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex h-full">
        {/* Sidebar */}
        <div className="w-64 border-r bg-card">
          <div className="p-4 border-b">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/clients')}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Clients
            </Button>
            <h3 className="font-semibold text-lg">
              {client.first_name} {client.last_name}
            </h3>
            <p className="text-sm text-muted-foreground">MRN: {client.medical_record_number}</p>
          </div>
          
          <ScrollArea className="h-[calc(100vh-200px)]">
            <nav className="p-2 space-y-1">
              {chartSections.map((section) => {
                const Icon = section.icon;
                const isExpanded = expandedSections.includes(section.id);
                const hasSubsections = section.subsections && section.subsections.length > 0;
                
                return (
                  <div key={section.id}>
                    <Button
                      variant={activeSection === section.id ? 'secondary' : 'ghost'}
                      className="w-full justify-start"
                      onClick={() => {
                        if (hasSubsections) {
                          toggleSection(section.id);
                        }
                        setActiveSection(section.id);
                      }}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {section.label}
                      {hasSubsections && (
                        <ChevronRight 
                          className={`h-4 w-4 ml-auto transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                        />
                      )}
                    </Button>
                    
                    {hasSubsections && isExpanded && (
                      <div className="ml-6 mt-1 space-y-1">
                        {section.subsections.map((subsection) => (
                          <Button
                            key={subsection.id}
                            variant={activeSection === subsection.id ? 'secondary' : 'ghost'}
                            size="sm"
                            className="w-full justify-start"
                            onClick={() => setActiveSection(subsection.id)}
                          >
                            {subsection.label}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </ScrollArea>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-6">
            {renderContent()}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
