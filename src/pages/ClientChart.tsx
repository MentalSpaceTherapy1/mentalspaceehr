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
  Calendar, 
  FolderOpen, 
  MessageSquare, 
  DollarSign, 
  History,
  ChevronRight,
  ArrowLeft,
  Video,
  AlertTriangle,
  FileCheck,
  CheckCircle,
  XCircle,
  UserCog,
  Edit,
  Link
} from 'lucide-react';
import { toast, useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import type { Database } from '@/integrations/supabase/types';
import { InsuranceBillingSection } from '@/components/clients/insurance/InsuranceBillingSection';
import { ClientAppointments } from '@/components/clients/ClientAppointments';
import { useTelehealthConsent } from '@/hooks/useTelehealthConsent';
import { RevokeConsentDialog } from '@/components/telehealth/RevokeConsentDialog';
import { downloadConsentPdf } from '@/lib/consentPdfGenerator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PortalAccessDialog } from '@/components/admin/PortalAccessDialog';
import { useCurrentUserRoles } from '@/hooks/useUserRoles';
import { DocumentManagementPanel } from '@/components/documents/DocumentManagementPanel';
import { ClinicalNotesSection } from '@/components/clients/ClinicalNotesSection';
import { ClinicalDocumentsDashboard } from '@/components/clients/ClinicalDocumentsDashboard';
import { ClientPortalFormsSection } from '@/components/clients/ClientPortalFormsSection';
import { ClientMessagesSection } from '@/components/clients/ClientMessagesSection';
import { ClientPaymentHistory } from '@/components/clients/ClientPaymentHistory';
import { ClientAuditLog } from '@/components/clients/ClientAuditLog';
import { logPHIAccess } from '@/lib/auditLogger';

type Client = Database['public']['Tables']['clients']['Row'];

const chartSections = [
  {
    group: 'CLIENT INFORMATION',
    groupIcon: User,
    sections: [
      { id: 'demographics', label: 'Demographics', icon: User },
      { id: 'insurance-billing', label: 'Insurance & Billing', icon: CreditCard },
    ]
  },
  {
    group: 'CLINICAL RECORDS',
    groupIcon: FileText,
    sections: [
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
          { id: 'contact-notes', label: 'Contact Notes' },
          { id: 'miscellaneous-notes', label: 'Miscellaneous Notes' },
          { id: 'cancellation-notes', label: 'Cancellation Notes' },
          { id: 'termination-notes', label: 'Termination Notes' },
        ]
      },
      { id: 'documents-forms', label: 'Documents & Forms', icon: FolderOpen },
    ]
  },
  {
    group: 'SCHEDULING',
    groupIcon: Calendar,
    sections: [
      { id: 'appointments', label: 'Appointments', icon: Calendar },
    ]
  },
  {
    group: 'COMMUNICATION',
    groupIcon: MessageSquare,
    sections: [
      { id: 'client-portal', label: 'Client Portal', icon: UserCog },
      { id: 'messages', label: 'Messages', icon: MessageSquare },
    ]
  },
  {
    group: 'COMPLIANCE',
    groupIcon: Video,
    sections: [
      { id: 'telehealth-consent', label: 'Telehealth Consent', icon: Video },
      { id: 'audit-log', label: 'Audit Log', icon: History },
    ]
  },
];

export default function ClientChart() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('demographics');
  const [expandedSections, setExpandedSections] = useState<string[]>(['clinical-documents']);
  const [consent, setConsent] = useState<any>(null);
  const [consentStatus, setConsentStatus] = useState<any>(null);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [portalDialogOpen, setPortalDialogOpen] = useState(false);
  const { checkConsentExpiration, revokeConsent, loading: consentLoading } = useTelehealthConsent();
  const { toast: toastHook } = useToast();
  const { roles } = useCurrentUserRoles();
  const isAdmin = roles.includes('administrator');

  useEffect(() => {
    if (user && id) {
      fetchClient();
      trackRecentlyViewed();
      
      // HIPAA COMPLIANCE: Log PHI access
      logPHIAccess(
        user.id,
        id,
        'client_chart',
        'Viewed client chart',
        { section: activeSection }
      );
      
      if (activeSection === 'telehealth-consent') {
        fetchConsent();
      }
    }
  }, [user, id, activeSection]);

  
  // Fetch consent data when needed
  useEffect(() => {
    if (activeSection === 'telehealth-consent' && id) {
      fetchConsent();
    }
  }, [activeSection, id]);

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
      toast({
        title: 'Error',
        description: 'Failed to load client information',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchConsent = async () => {
    if (!id) return;
    
    try {
      const { data } = await supabase
        .from('telehealth_consents')
        .select('*')
        .eq('client_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      setConsent(data);
      
      if (data) {
        const status = await checkConsentExpiration(id);
        setConsentStatus(status);
      }
    } catch (error) {
      console.error('Error fetching consent:', error);
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

  const handleRevokeConsent = async (reason: string) => {
    if (!consent) return;
    
    const { error } = await revokeConsent(consent.id, reason);
    if (!error) {
      setRevokeDialogOpen(false);
      fetchConsent();
    }
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
      case 'client-portal':
        return <ClientPortalFormsSection clientId={id!} />;
      
      case 'demographics':
        return (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Demographics</CardTitle>
                {isAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPortalDialogOpen(true)}
                  >
                    <UserCog className="h-4 w-4 mr-2" />
                    Manage Portal Access
                    <Badge variant={client?.portal_enabled ? 'default' : 'secondary'} className="ml-2">
                      {client?.portal_enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </Button>
                )}
              </div>
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
        return (
          <div className="space-y-6">
            <InsuranceBillingSection clientId={id!} />
            <ClientPaymentHistory clientId={id!} />
          </div>
        );
      case 'appointments':
        return <ClientAppointments clientId={id!} />;
      case 'clinical-documents':
        return <ClinicalDocumentsDashboard clientId={id!} />;
      case 'progress-notes':
      case 'intake-assessment':
      case 'treatment-plans':
      case 'psychiatric-evaluations':
      case 'testing-assessments':
      case 'consultation-notes':
      case 'contact-notes':
      case 'miscellaneous-notes':
      case 'cancellation-notes':
      case 'termination-notes':
        return <ClinicalNotesSection clientId={id!} noteType={activeSection as any} />;
      case 'messages':
        return <ClientMessagesSection clientId={id!} />;
      case 'audit-log':
        return <ClientAuditLog clientId={id!} />;
      case 'telehealth-consent':
        return (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Telehealth Consent Status</CardTitle>
              </CardHeader>
              <CardContent>
                {consent ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Status:</span>
                      <Badge 
                        variant={
                          consentStatus?.status === 'active' ? 'default' :
                          consentStatus?.status === 'expiring_soon' ? 'secondary' :
                          'destructive'
                        }
                      >
                        {consentStatus?.status === 'active' && <CheckCircle className="h-3 w-3 mr-1" />}
                        {consentStatus?.status === 'expiring_soon' && <AlertTriangle className="h-3 w-3 mr-1" />}
                        {consentStatus?.status === 'expired' && <XCircle className="h-3 w-3 mr-1" />}
                        {consentStatus?.status === 'active' ? 'Active' :
                         consentStatus?.status === 'expiring_soon' ? 'Expiring Soon' :
                         'Expired'}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm text-muted-foreground">Consent Date:</span>
                        <p className="font-medium">{format(new Date(consent.consent_date), 'MMM d, yyyy')}</p>
                      </div>
                      
                      <div>
                        <span className="text-sm text-muted-foreground">Expiration Date:</span>
                        <p className="font-medium">{format(new Date(consent.expiration_date), 'MMM d, yyyy')}</p>
                      </div>

                      <div>
                        <span className="text-sm text-muted-foreground">State of Residence:</span>
                        <p className="font-medium">{consent.client_state_of_residence}</p>
                      </div>

                      <div>
                        <span className="text-sm text-muted-foreground">Recording Consent:</span>
                        <p className="font-medium">{consent.consents_to_recording ? 'Yes' : 'No'}</p>
                      </div>
                    </div>
                    
                    {consentStatus?.status === 'expiring_soon' && (
                      <Alert variant="default">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Expiring Soon</AlertTitle>
                        <AlertDescription>
                          Consent expires in {consentStatus.daysUntilExpiration} days. Please renew before the next telehealth session.
                        </AlertDescription>
                      </Alert>
                    )}

                    {consentStatus?.status === 'expired' && (
                      <Alert variant="destructive">
                        <XCircle className="h-4 w-4" />
                        <AlertTitle>Consent Expired</AlertTitle>
                        <AlertDescription>
                          This consent has expired. The client must complete a new consent form before the next telehealth session.
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    <div className="flex gap-2 flex-wrap">
                      <Button 
                        onClick={() => navigate(`/telehealth/consent-form/${id}`)}
                        variant={consentStatus?.status === 'expired' ? 'default' : 'outline'}
                      >
                        {consentStatus?.status === 'expired' ? 'Complete New Consent' : 'Renew Consent'}
                      </Button>
                      
                      {!consent.consent_revoked && (
                        <Button 
                          variant="destructive" 
                          onClick={() => setRevokeDialogOpen(true)}
                        >
                          Revoke Consent
                        </Button>
                      )}
                      
                      {consent.pdf_document_url && (
                        <Button 
                          variant="ghost"
                          onClick={async () => {
                            try {
                              await downloadConsentPdf(consent.pdf_document_url);
                              toastHook({
                                title: 'PDF Downloaded',
                                description: 'Consent PDF has been downloaded.',
                              });
                            } catch (error) {
                              toastHook({
                                title: 'Download Failed',
                                description: 'Could not download the PDF.',
                                variant: 'destructive',
                              });
                            }
                          }}
                        >
                          <FileCheck className="mr-2 h-4 w-4" />
                          Download PDF
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">No telehealth consent on file</p>
                    <Button onClick={() => navigate(`/telehealth/consent-form/${id}`)}>
                      Complete Consent Form
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <RevokeConsentDialog
              open={revokeDialogOpen}
              onOpenChange={setRevokeDialogOpen}
              onConfirm={handleRevokeConsent}
              loading={consentLoading}
            />
          </>
        );
      case 'documents-forms':
        return <DocumentManagementPanel clientId={id!} />;
      default:
        const currentSection = chartSections
          .flatMap(g => g.sections)
          .find(s => s.id === activeSection);
        
        return (
          <Card>
            <CardHeader>
              <CardTitle>{currentSection?.label}</CardTitle>
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
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-lg">
                  {client.first_name} {client.last_name}
                </h3>
                <p className="text-sm text-muted-foreground">MRN: {client.medical_record_number}</p>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const portalLink = `${window.location.origin}/portal/login`;
                    navigator.clipboard.writeText(portalLink);
                    toast({
                      title: 'Portal Link Copied',
                      description: 'Client portal login link has been copied to clipboard',
                    });
                  }}
                  title="Copy portal login link"
                >
                  <Link className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/clients/${id}/edit`)}
                  title="Edit client"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          
          <ScrollArea className="h-[calc(100vh-200px)]">
            <nav className="p-2 space-y-3">
              {chartSections.map((group, groupIndex) => {
                const GroupIcon = group.groupIcon;
                
                return (
                  <div key={group.group}>
                    {/* Group Header */}
                    <div className="px-3 py-2 mb-1">
                      <div className="flex items-center gap-2">
                        <GroupIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs font-semibold text-muted-foreground tracking-wide">
                          {group.group}
                        </span>
                      </div>
                    </div>
                    
                    {/* Group Sections */}
                    <div className="space-y-1">
                      {group.sections.map((section) => {
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
                    </div>
                    
                    {/* Separator between groups (except last) */}
                    {groupIndex < chartSections.length - 1 && (
                      <Separator className="my-3" />
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

      {/* Portal Access Dialog - rendered at component level */}
      <PortalAccessDialog
        open={portalDialogOpen}
        onOpenChange={setPortalDialogOpen}
        clientId={id!}
        clientName={`${client?.first_name} ${client?.last_name}`}
        currentEmail={client?.email || ''}
        portalEnabled={client?.portal_enabled || false}
        portalUserId={client?.portal_user_id || undefined}
        onUpdate={fetchClient}
      />
    </DashboardLayout>
  );
}
