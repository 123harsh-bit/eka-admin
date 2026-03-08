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
import AdminAttendance from "@/pages/admin/AdminAttendance";
import AdminEditorTasks from "@/pages/admin/AdminEditorTasks";
import AdminCameraShoots from "@/pages/admin/AdminCameraShoots";
import AdminClientIdeas from "@/pages/admin/AdminClientIdeas";
import AdminWeeklyReport from "@/pages/admin/AdminWeeklyReport";

// Role dashboards
import EditorDashboard from "@/pages/editor/EditorDashboard";
import EditorAllVideos from "@/pages/editor/EditorAllVideos";
import EditorClients from "@/pages/editor/EditorClients";
import EditorDailyTasks from "@/pages/editor/EditorDailyTasks";
import EditorAttendance from "@/pages/editor/EditorAttendance";
import DesignerDashboard from "@/pages/designer/DesignerDashboard";
import DesignerBrandKits from "@/pages/designer/DesignerBrandKits";
import DesignerDailyTasks from "@/pages/designer/DesignerDailyTasks";
import DesignerAttendance from "@/pages/designer/DesignerAttendance";
import WriterDashboard from "@/pages/writer/WriterDashboard";
import WriterClientBriefs from "@/pages/writer/WriterClientBriefs";
import WriterDailyTasks from "@/pages/writer/WriterDailyTasks";
import WriterAttendance from "@/pages/writer/WriterAttendance";
import ClientDashboard from "@/pages/client/ClientDashboard";

// Camera operator pages
import CameraShoots from "@/pages/camera/CameraShoots";
import CameraFootage from "@/pages/camera/CameraFootage";
import CameraClients from "@/pages/camera/CameraClients";
import CameraDailyTasks from "@/pages/camera/CameraDailyTasks";
import CameraAttendance from "@/pages/camera/CameraAttendance";

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
            <Route path="/admin/client-ideas" element={<ProtectedRoute allowedRoles={['admin']}><AdminClientIdeas /></ProtectedRoute>} />
            <Route path="/admin/videos" element={<ProtectedRoute allowedRoles={['admin']}><AdminVideos /></ProtectedRoute>} />
            <Route path="/admin/design-tasks" element={<ProtectedRoute allowedRoles={['admin']}><AdminDesignTasks /></ProtectedRoute>} />
            <Route path="/admin/writing-tasks" element={<ProtectedRoute allowedRoles={['admin']}><AdminWritingTasks /></ProtectedRoute>} />
            <Route path="/admin/editor-tasks" element={<ProtectedRoute allowedRoles={['admin']}><AdminEditorTasks /></ProtectedRoute>} />
            <Route path="/admin/camera-shoots" element={<ProtectedRoute allowedRoles={['admin']}><AdminCameraShoots /></ProtectedRoute>} />
            <Route path="/admin/attendance" element={<ProtectedRoute allowedRoles={['admin']}><AdminAttendance /></ProtectedRoute>} />
            <Route path="/admin/team" element={<ProtectedRoute allowedRoles={['admin']}><AdminTeam /></ProtectedRoute>} />
            <Route path="/admin/notifications" element={<ProtectedRoute allowedRoles={['admin']}><AdminNotifications /></ProtectedRoute>} />
            <Route path="/admin/weekly-report" element={<ProtectedRoute allowedRoles={['admin']}><AdminWeeklyReport /></ProtectedRoute>} />
            <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={['admin']}><AdminSettings /></ProtectedRoute>} />

            {/* Editor routes */}
            <Route path="/editor" element={<ProtectedRoute allowedRoles={['editor']}><EditorDashboard /></ProtectedRoute>} />
            <Route path="/editor/daily-tasks" element={<ProtectedRoute allowedRoles={['editor']}><EditorDailyTasks /></ProtectedRoute>} />
            <Route path="/editor/videos" element={<ProtectedRoute allowedRoles={['editor']}><EditorAllVideos /></ProtectedRoute>} />
            <Route path="/editor/clients" element={<ProtectedRoute allowedRoles={['editor']}><EditorClients /></ProtectedRoute>} />
            <Route path="/editor/attendance" element={<ProtectedRoute allowedRoles={['editor']}><EditorAttendance /></ProtectedRoute>} />

            {/* Designer routes */}
            <Route path="/designer" element={<ProtectedRoute allowedRoles={['designer']}><DesignerDashboard /></ProtectedRoute>} />
            <Route path="/designer/daily-tasks" element={<ProtectedRoute allowedRoles={['designer']}><DesignerDailyTasks /></ProtectedRoute>} />
            <Route path="/designer/brand-kits" element={<ProtectedRoute allowedRoles={['designer']}><DesignerBrandKits /></ProtectedRoute>} />
            <Route path="/designer/attendance" element={<ProtectedRoute allowedRoles={['designer']}><DesignerAttendance /></ProtectedRoute>} />

            {/* Writer routes */}
            <Route path="/writer" element={<ProtectedRoute allowedRoles={['writer']}><WriterDashboard /></ProtectedRoute>} />
            <Route path="/writer/daily-tasks" element={<ProtectedRoute allowedRoles={['writer']}><WriterDailyTasks /></ProtectedRoute>} />
            <Route path="/writer/briefs" element={<ProtectedRoute allowedRoles={['writer']}><WriterClientBriefs /></ProtectedRoute>} />
            <Route path="/writer/attendance" element={<ProtectedRoute allowedRoles={['writer']}><WriterAttendance /></ProtectedRoute>} />

            {/* Camera operator routes */}
            <Route path="/camera" element={<ProtectedRoute allowedRoles={['camera_operator']}><CameraShoots /></ProtectedRoute>} />
            <Route path="/camera/footage" element={<ProtectedRoute allowedRoles={['camera_operator']}><CameraFootage /></ProtectedRoute>} />
            <Route path="/camera/clients" element={<ProtectedRoute allowedRoles={['camera_operator']}><CameraClients /></ProtectedRoute>} />
            <Route path="/camera/daily-tasks" element={<ProtectedRoute allowedRoles={['camera_operator']}><CameraDailyTasks /></ProtectedRoute>} />
            <Route path="/camera/attendance" element={<ProtectedRoute allowedRoles={['camera_operator']}><CameraAttendance /></ProtectedRoute>} />

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
