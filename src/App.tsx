import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import { ClientPortalRoute } from "@/components/ClientPortalRoute";
import { SessionTimeoutWarning } from "@/components/SessionTimeoutWarning";
import Index from "./pages/Index";
import PortalLogin from "./pages/portal/PortalLogin";
import PortalForgotPassword from "./pages/portal/PortalForgotPassword";
import PortalResetPassword from "./pages/portal/PortalResetPassword";
import PortalDashboard from "./pages/portal/PortalDashboard";
import PortalAppointments from "./pages/portal/PortalAppointments";
import PortalDocuments from "./pages/portal/PortalDocuments";
import PortalBilling from "./pages/portal/PortalBilling";
import PortalProgress from "./pages/portal/PortalProgress";
import PortalMessages from "./pages/portal/PortalMessages";
import PortalProfile from "./pages/portal/PortalProfile";
import PortalResources from "./pages/portal/PortalResources";
import PortalNotifications from "./pages/portal/PortalNotifications";
import { PortalLayout } from "@/components/portal/PortalLayout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import UserManagement from "./pages/admin/UserManagement";
import CreateUser from "./pages/admin/CreateUser";
import UserProfile from "./pages/admin/UserProfile";
import PracticeSettings from "./pages/admin/PracticeSettings";
import Locations from "./pages/admin/Locations";
import ServiceCodes from "./pages/admin/ServiceCodes";
import Profile from "./pages/Profile";
import MFASetup from "./pages/MFASetup";
import TrustedDevices from "./pages/TrustedDevices";
import Tasks from "./pages/Tasks";
import StaffMessages from "./pages/StaffMessages";
import Clients from "./pages/Clients";
import ClientRegistration from "./pages/ClientRegistration";
import ClientChart from "./pages/ClientChart";
import ClientEdit from "./pages/ClientEdit";
import Schedule from "./pages/Schedule";
import Waitlist from "./pages/Waitlist";
import TelehealthSession from "./pages/TelehealthSession";
import ConfirmAppointment from "./pages/ConfirmAppointment";
import ReminderSettings from "./pages/admin/ReminderSettings";
import AppointmentNotificationSettings from "./pages/admin/AppointmentNotificationSettings";
import AINoteSettings from "./pages/admin/AINoteSettings";
import AIQualityMetrics from "./pages/admin/AIQualityMetrics";
import BAAManagement from "./pages/admin/BAAManagement";
import Notes from "./pages/Notes";
import NoteEditor from "./pages/NoteEditor";
import IntakeAssessment from "./pages/IntakeAssessment";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import ConfirmPasswordReset from "./pages/ConfirmPasswordReset";
import ClientStatements from "@/pages/admin/ClientStatements";
import FeeSchedules from "@/pages/admin/FeeSchedules";
import EligibilityVerification from "@/pages/admin/EligibilityVerification";
import NotFound from "./pages/NotFound";
import ProgressNote from "./pages/ProgressNote";
import TreatmentPlan from "./pages/TreatmentPlan";
import CancellationNote from "./pages/CancellationNote";
import ContactNote from "./pages/ContactNote";
import ConsultationNote from "./pages/ConsultationNote";
import MiscellaneousNote from "./pages/MiscellaneousNote";
import ComplianceRules from "./pages/admin/ComplianceRules";
import ComplianceDashboard from "./pages/admin/ComplianceDashboard";
import SupervisionManagement from "./pages/admin/SupervisionManagement";
import TelehealthConsentManagement from "./pages/admin/TelehealthConsentManagement";
import TelehealthSettings from "./pages/admin/TelehealthSettings";
import CreateTestPortalUser from "./pages/admin/CreateTestPortalUser";
import PortalManagement from "./pages/admin/PortalManagement";
import InsuranceClaims from "./pages/admin/InsuranceClaims";
import BillingManagement from "./pages/admin/BillingManagement";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <SessionTimeoutWarning />
          <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/portal/login" element={<PortalLogin />} />
          <Route path="/portal/forgot-password" element={<PortalForgotPassword />} />
          <Route path="/portal/reset-password" element={<PortalResetPassword />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/confirm-password-reset" element={<ConfirmPasswordReset />} />
          <Route path="/reset-password" element={<ResetPassword />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/users" 
              element={
                <AdminRoute>
                  <UserManagement />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/users/create" 
              element={
                <AdminRoute>
                  <CreateUser />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/users/:id" 
              element={
                <AdminRoute>
                  <UserProfile />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/practice-settings"
              element={
                <AdminRoute>
                  <PracticeSettings />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/portal-management" 
              element={
                <AdminRoute>
                  <PortalManagement />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/locations" 
              element={
                <AdminRoute>
                  <Locations />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/service-codes" 
              element={
                <AdminRoute>
                  <ServiceCodes />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/compliance-dashboard" 
              element={
                <AdminRoute>
                  <ComplianceDashboard />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/compliance-rules" 
              element={
                <AdminRoute>
                  <ComplianceRules />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/supervision-management" 
              element={
                <AdminRoute>
                  <SupervisionManagement />
                </AdminRoute>
              } 
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/mfa-setup" 
              element={
                <ProtectedRoute>
                  <MFASetup />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/trusted-devices" 
              element={
                <ProtectedRoute>
                  <TrustedDevices />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/tasks" 
              element={
                <ProtectedRoute>
                  <Tasks />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/messages" 
              element={
                <ProtectedRoute>
                  <StaffMessages />
                </ProtectedRoute>
              } 
            />
            <Route
              path="/clients" 
              element={
                <ProtectedRoute>
                  <Clients />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/clients/new" 
              element={
                <ProtectedRoute>
                  <ClientRegistration />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/clients/:id" 
              element={
                <ProtectedRoute>
                  <ClientChart />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/clients/:id/edit" 
              element={
                <ProtectedRoute>
                  <ClientEdit />
                </ProtectedRoute>
              } 
            />
            <Route
              path="/schedule" 
              element={
                <ProtectedRoute>
                  <Schedule />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/waitlist" 
              element={
                <ProtectedRoute>
                  <Waitlist />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/telehealth/session/:sessionId" 
              element={
                <ProtectedRoute>
                  <TelehealthSession />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/confirm-appointment/:token" 
              element={<ConfirmAppointment />} 
            />
            <Route 
              path="/admin/reminder-settings" 
              element={
                <AdminRoute>
                  <ReminderSettings />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/appointment-notifications" 
              element={
                <AdminRoute>
                  <AppointmentNotificationSettings />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/ai-notes" 
              element={
                <AdminRoute>
                  <AINoteSettings />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/ai-quality-metrics" 
              element={
                <AdminRoute>
                  <AIQualityMetrics />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/baa-management" 
              element={
                <AdminRoute>
                  <BAAManagement />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/telehealth-settings" 
              element={
                <AdminRoute>
                  <TelehealthSettings />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/telehealth-consents" 
              element={
                <AdminRoute>
                  <TelehealthConsentManagement />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/create-test-portal-user" 
              element={
                <AdminRoute>
                  <CreateTestPortalUser />
                </AdminRoute>
              } 
            />
            <Route 
              path="/billing" 
              element={
                <AdminRoute>
                  <BillingManagement />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/insurance-claims" 
              element={
                <AdminRoute>
                  <InsuranceClaims />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/client-statements" 
              element={
                <AdminRoute>
                  <ClientStatements />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/fee-schedules" 
              element={
                <AdminRoute>
                  <FeeSchedules />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/eligibility-verification" 
              element={
                <AdminRoute>
                  <EligibilityVerification />
                </AdminRoute>
              } 
            />
            <Route
              path="/notes"
              element={
                <ProtectedRoute>
                  <Notes />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/notes/new" 
              element={
                <ProtectedRoute>
                  <NoteEditor />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/notes/:id" 
              element={
                <ProtectedRoute>
                  <NoteEditor />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/intake-assessment" 
              element={
                <ProtectedRoute>
                  <IntakeAssessment />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/progress-note" 
              element={
                <ProtectedRoute>
                  <ProgressNote />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/treatment-plan" 
              element={
                <ProtectedRoute>
                  <TreatmentPlan />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/cancellation-note" 
              element={
                <ProtectedRoute>
                  <CancellationNote />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/contact-note" 
              element={
                <ProtectedRoute>
                  <ContactNote />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/consultation-note" 
              element={
                <ProtectedRoute>
                  <ConsultationNote />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/miscellaneous-note" 
              element={
                <ProtectedRoute>
                  <MiscellaneousNote />
                </ProtectedRoute>
              } 
            />
            
            {/* CLIENT PORTAL ROUTES */}
            <Route
              path="/portal"
              element={
                <ClientPortalRoute>
                  <PortalLayout>
                    <PortalDashboard />
                  </PortalLayout>
                </ClientPortalRoute>
              }
            />
            <Route
              path="/portal/appointments"
              element={
                <ClientPortalRoute>
                  <PortalLayout>
                    <PortalAppointments />
                  </PortalLayout>
                </ClientPortalRoute>
              }
            />
            <Route
              path="/portal/documents"
              element={
                <ClientPortalRoute>
                  <PortalLayout>
                    <PortalDocuments />
                  </PortalLayout>
                </ClientPortalRoute>
              }
            />
            <Route
              path="/portal/billing"
              element={
                <ClientPortalRoute>
                  <PortalLayout>
                    <PortalBilling />
                  </PortalLayout>
                </ClientPortalRoute>
              }
            />
            <Route
              path="/portal/progress"
              element={
                <ClientPortalRoute>
                  <PortalLayout>
                    <PortalProgress />
                  </PortalLayout>
                </ClientPortalRoute>
              }
            />
            <Route
              path="/portal/messages"
              element={
                <ClientPortalRoute>
                  <PortalLayout>
                    <PortalMessages />
                  </PortalLayout>
                </ClientPortalRoute>
              }
            />
            <Route
              path="/portal/profile"
              element={
                <ClientPortalRoute>
                  <PortalLayout>
                    <PortalProfile />
                  </PortalLayout>
                </ClientPortalRoute>
              }
            />
            <Route
              path="/portal/resources"
              element={
                <ClientPortalRoute>
                  <PortalLayout>
                    <PortalResources />
                  </PortalLayout>
                </ClientPortalRoute>
              }
            />
            <Route
              path="/portal/notifications"
              element={
                <ClientPortalRoute>
                  <PortalLayout>
                    <PortalNotifications />
                  </PortalLayout>
                </ClientPortalRoute>
              }
            />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
