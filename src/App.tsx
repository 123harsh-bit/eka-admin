import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { RoleRedirect } from "@/components/auth/RoleRedirect";
import { CommandPalette } from "@/components/shared/CommandPalette";

import LoginPage from "@/components/auth/LoginPage";
import ResetPassword from "@/pages/ResetPassword";
import NotFound from "@/pages/NotFound";

// Layouts
import { AdminLayout } from "@/components/admin/AdminLayout";
import { EditorLayout } from "@/components/editor/EditorLayout";
import { DesignerLayout } from "@/components/designer/DesignerLayout";
import { WriterLayout } from "@/components/writer/WriterLayout";
import { CameraLayout } from "@/components/camera/CameraLayout";
import { SocialLayout } from "@/components/social/SocialLayout";

// Shared pages (rendered inside any role layout)
import MyAttendancePage from "@/pages/shared/MyAttendancePage";
import { DailyTasksContent } from "@/pages/shared/DailyTasksPage";

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
import AdminContentPlanner from "@/pages/admin/AdminContentPlanner";
import AdminSocialPosts from "@/pages/admin/AdminSocialPosts";
import AdminInvoices from "@/pages/admin/AdminInvoices";
import AdminCapacity from "@/pages/admin/AdminCapacity";
import AdminWhatsAppTemplates from "@/pages/admin/AdminWhatsAppTemplates";

// Role-specific dashboards/sub-pages
import EditorDashboard from "@/pages/editor/EditorDashboard";
import EditorAllVideos from "@/pages/editor/EditorAllVideos";
import EditorClients from "@/pages/editor/EditorClients";
import DesignerDashboard from "@/pages/designer/DesignerDashboard";
import DesignerBrandKits from "@/pages/designer/DesignerBrandKits";
import WriterDashboard from "@/pages/writer/WriterDashboard";
import WriterClientBriefs from "@/pages/writer/WriterClientBriefs";
import CameraShoots from "@/pages/camera/CameraShoots";
import CameraFootage from "@/pages/camera/CameraFootage";
import CameraClients from "@/pages/camera/CameraClients";
import SocialDashboard from "@/pages/social/SocialDashboard";
import SocialCompose from "@/pages/social/SocialCompose";
import SocialCalendar from "@/pages/social/SocialCalendar";
import SocialAnalytics from "@/pages/social/SocialAnalytics";
import SocialLibrary from "@/pages/social/SocialLibrary";
import SocialAnalyticsImport from "@/pages/social/SocialAnalyticsImport";

import PublicPostPreview from "@/pages/PublicPostPreview";

// Client portal
import ClientDashboard from "@/pages/client/ClientDashboard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <CommandPalette />
          <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/preview/:token" element={<PublicPostPreview />} />

            {/* Root redirects based on role */}
            <Route path="/" element={<RoleRedirect />} />

            {/* Admin */}
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
            <Route path="/admin/content-planner" element={<ProtectedRoute allowedRoles={['admin']}><AdminContentPlanner /></ProtectedRoute>} />
            <Route path="/admin/social-posts" element={<ProtectedRoute allowedRoles={['admin']}><AdminSocialPosts /></ProtectedRoute>} />
            <Route path="/admin/invoices" element={<ProtectedRoute allowedRoles={['admin']}><AdminInvoices /></ProtectedRoute>} />
            <Route path="/admin/capacity" element={<ProtectedRoute allowedRoles={['admin']}><AdminCapacity /></ProtectedRoute>} />
            <Route path="/admin/whatsapp-templates" element={<ProtectedRoute allowedRoles={['admin']}><AdminWhatsAppTemplates /></ProtectedRoute>} />
            <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={['admin']}><AdminSettings /></ProtectedRoute>} />

            {/* Editor */}
            <Route path="/editor" element={<ProtectedRoute allowedRoles={['editor']}><EditorDashboard /></ProtectedRoute>} />
            <Route path="/editor/daily-tasks" element={<ProtectedRoute allowedRoles={['editor']}><EditorLayout><DailyTasksContent /></EditorLayout></ProtectedRoute>} />
            <Route path="/editor/videos" element={<ProtectedRoute allowedRoles={['editor']}><EditorAllVideos /></ProtectedRoute>} />
            <Route path="/editor/clients" element={<ProtectedRoute allowedRoles={['editor']}><EditorClients /></ProtectedRoute>} />
            <Route path="/editor/attendance" element={<ProtectedRoute allowedRoles={['editor']}><EditorLayout><MyAttendancePage /></EditorLayout></ProtectedRoute>} />

            {/* Designer */}
            <Route path="/designer" element={<ProtectedRoute allowedRoles={['designer']}><DesignerDashboard /></ProtectedRoute>} />
            <Route path="/designer/daily-tasks" element={<ProtectedRoute allowedRoles={['designer']}><DesignerLayout><DailyTasksContent /></DesignerLayout></ProtectedRoute>} />
            <Route path="/designer/brand-kits" element={<ProtectedRoute allowedRoles={['designer']}><DesignerBrandKits /></ProtectedRoute>} />
            <Route path="/designer/attendance" element={<ProtectedRoute allowedRoles={['designer']}><DesignerLayout><MyAttendancePage /></DesignerLayout></ProtectedRoute>} />

            {/* Writer */}
            <Route path="/writer" element={<ProtectedRoute allowedRoles={['writer']}><WriterDashboard /></ProtectedRoute>} />
            <Route path="/writer/daily-tasks" element={<ProtectedRoute allowedRoles={['writer']}><WriterLayout><DailyTasksContent /></WriterLayout></ProtectedRoute>} />
            <Route path="/writer/briefs" element={<ProtectedRoute allowedRoles={['writer']}><WriterClientBriefs /></ProtectedRoute>} />
            <Route path="/writer/attendance" element={<ProtectedRoute allowedRoles={['writer']}><WriterLayout><MyAttendancePage /></WriterLayout></ProtectedRoute>} />

            {/* Camera */}
            <Route path="/camera" element={<ProtectedRoute allowedRoles={['camera_operator']}><CameraShoots /></ProtectedRoute>} />
            <Route path="/camera/footage" element={<ProtectedRoute allowedRoles={['camera_operator']}><CameraFootage /></ProtectedRoute>} />
            <Route path="/camera/clients" element={<ProtectedRoute allowedRoles={['camera_operator']}><CameraClients /></ProtectedRoute>} />
            <Route path="/camera/daily-tasks" element={<ProtectedRoute allowedRoles={['camera_operator']}><CameraLayout><DailyTasksContent /></CameraLayout></ProtectedRoute>} />
            <Route path="/camera/attendance" element={<ProtectedRoute allowedRoles={['camera_operator']}><CameraLayout><MyAttendancePage /></CameraLayout></ProtectedRoute>} />

            {/* Social executive */}
            <Route path="/social" element={<ProtectedRoute allowedRoles={['social_executive']}><SocialDashboard /></ProtectedRoute>} />
            <Route path="/social/compose" element={<ProtectedRoute allowedRoles={['social_executive']}><SocialCompose /></ProtectedRoute>} />
            <Route path="/social/calendar" element={<ProtectedRoute allowedRoles={['social_executive']}><SocialCalendar /></ProtectedRoute>} />
            <Route path="/social/analytics" element={<ProtectedRoute allowedRoles={['social_executive']}><SocialAnalytics /></ProtectedRoute>} />
            <Route path="/social/library" element={<ProtectedRoute allowedRoles={['social_executive']}><SocialLibrary /></ProtectedRoute>} />
            <Route path="/social/import" element={<ProtectedRoute allowedRoles={['social_executive', 'admin']}><SocialAnalyticsImport /></ProtectedRoute>} />
            <Route path="/social/daily-tasks" element={<ProtectedRoute allowedRoles={['social_executive']}><SocialLayout><DailyTasksContent /></SocialLayout></ProtectedRoute>} />
            <Route path="/social/attendance" element={<ProtectedRoute allowedRoles={['social_executive']}><SocialLayout><MyAttendancePage /></SocialLayout></ProtectedRoute>} />

            {/* Client portal */}
            <Route path="/client" element={<ProtectedRoute allowedRoles={['client']}><ClientDashboard /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
