import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { RoleRedirect } from "@/components/auth/RoleRedirect";

import LoginPage from "@/components/auth/LoginPage";
import ResetPassword from "@/pages/ResetPassword";
import NotFound from "@/pages/NotFound";

// Admin pages
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminClients from "@/pages/admin/AdminClients";
import AdminVideos from "@/pages/admin/AdminVideos";
import AdminDesignTasks from "@/pages/admin/AdminDesignTasks";
import AdminWritingTasks from "@/pages/admin/AdminWritingTasks";
import AdminTeam from "@/pages/admin/AdminTeam";
import AdminNotifications from "@/pages/admin/AdminNotifications";
import AdminSettings from "@/pages/admin/AdminSettings";
import AdminDailyTasks from "@/pages/admin/AdminDailyTasks";

// Role dashboards
import EditorDashboard from "@/pages/editor/EditorDashboard";
import EditorAllVideos from "@/pages/editor/EditorAllVideos";
import EditorClients from "@/pages/editor/EditorClients";
import DesignerDashboard from "@/pages/designer/DesignerDashboard";
import DesignerBrandKits from "@/pages/designer/DesignerBrandKits";
import WriterDashboard from "@/pages/writer/WriterDashboard";
import WriterClientBriefs from "@/pages/writer/WriterClientBriefs";
import ClientDashboard from "@/pages/client/ClientDashboard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Root redirects based on role */}
            <Route path="/" element={<RoleRedirect />} />

            {/* Admin routes */}
            <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/daily-tasks" element={<ProtectedRoute allowedRoles={['admin']}><AdminDailyTasks /></ProtectedRoute>} />
            <Route path="/admin/clients" element={<ProtectedRoute allowedRoles={['admin']}><AdminClients /></ProtectedRoute>} />
            <Route path="/admin/videos" element={<ProtectedRoute allowedRoles={['admin']}><AdminVideos /></ProtectedRoute>} />
            <Route path="/admin/design-tasks" element={<ProtectedRoute allowedRoles={['admin']}><AdminDesignTasks /></ProtectedRoute>} />
            <Route path="/admin/writing-tasks" element={<ProtectedRoute allowedRoles={['admin']}><AdminWritingTasks /></ProtectedRoute>} />
            <Route path="/admin/team" element={<ProtectedRoute allowedRoles={['admin']}><AdminTeam /></ProtectedRoute>} />
            <Route path="/admin/notifications" element={<ProtectedRoute allowedRoles={['admin']}><AdminNotifications /></ProtectedRoute>} />
            <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={['admin']}><AdminSettings /></ProtectedRoute>} />

            {/* Editor routes */}
            <Route path="/editor" element={<ProtectedRoute allowedRoles={['editor']}><EditorDashboard /></ProtectedRoute>} />
            <Route path="/editor/videos" element={<ProtectedRoute allowedRoles={['editor']}><EditorAllVideos /></ProtectedRoute>} />
            <Route path="/editor/clients" element={<ProtectedRoute allowedRoles={['editor']}><EditorClients /></ProtectedRoute>} />

            {/* Designer routes */}
            <Route path="/designer" element={<ProtectedRoute allowedRoles={['designer']}><DesignerDashboard /></ProtectedRoute>} />
            <Route path="/designer/brand-kits" element={<ProtectedRoute allowedRoles={['designer']}><DesignerBrandKits /></ProtectedRoute>} />

            {/* Writer routes */}
            <Route path="/writer" element={<ProtectedRoute allowedRoles={['writer']}><WriterDashboard /></ProtectedRoute>} />
            <Route path="/writer/briefs" element={<ProtectedRoute allowedRoles={['writer']}><WriterClientBriefs /></ProtectedRoute>} />

            {/* Client routes */}
            <Route path="/client" element={<ProtectedRoute allowedRoles={['client']}><ClientDashboard /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
