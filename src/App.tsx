import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import { SessionTimeoutWarning } from "@/components/SessionTimeoutWarning";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import UserManagement from "./pages/admin/UserManagement";
import CreateUser from "./pages/admin/CreateUser";
import PracticeSettings from "./pages/admin/PracticeSettings";
import Locations from "./pages/admin/Locations";
import Profile from "./pages/Profile";
import MFASetup from "./pages/MFASetup";
import TrustedDevices from "./pages/TrustedDevices";
import Tasks from "./pages/Tasks";
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
import Notes from "./pages/Notes";
import NoteEditor from "./pages/NoteEditor";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

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
            <Route path="/forgot-password" element={<ForgotPassword />} />
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
              path="/admin/practice-settings" 
              element={
                <AdminRoute>
                  <PracticeSettings />
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
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
