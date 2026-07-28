import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { RoleRedirect } from "@/components/auth/RoleRedirect";
import { CommandPalette } from "@/components/shared/CommandPalette";
import { Skeleton } from "@/components/ui/skeleton";

import LoginPage from "@/components/auth/LoginPage";

const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const NotFound = lazy(() => import("@/pages/NotFound"));

// Layouts (small wrappers, loaded with the pages that use them)
const AdminLayout = lazy(() => import("@/components/admin/AdminLayout").then((m) => ({ default: m.AdminLayout })));
const EditorLayout = lazy(() => import("@/components/editor/EditorLayout").then((m) => ({ default: m.EditorLayout })));
const DesignerLayout = lazy(() => import("@/components/designer/DesignerLayout").then((m) => ({ default: m.DesignerLayout })));
const WriterLayout = lazy(() => import("@/components/writer/WriterLayout").then((m) => ({ default: m.WriterLayout })));
const CameraLayout = lazy(() => import("@/components/camera/CameraLayout").then((m) => ({ default: m.CameraLayout })));
const SocialLayout = lazy(() => import("@/components/social/SocialLayout").then((m) => ({ default: m.SocialLayout })));

// Shared pages (rendered inside any role layout)
const ClientsHub = lazy(() => import("@/pages/shared/ClientsHub"));
const ScriptsLibrary = lazy(() => import("@/pages/shared/ScriptsLibrary"));
const ScriptEditor = lazy(() => import("@/pages/shared/ScriptEditor"));

// Admin pages
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const AdminClients = lazy(() => import("@/pages/admin/AdminClients"));
const AdminVideos = lazy(() => import("@/pages/admin/AdminVideos"));
const AdminDesignTasks = lazy(() => import("@/pages/admin/AdminDesignTasks"));
const AdminWritingTasks = lazy(() => import("@/pages/admin/AdminWritingTasks"));
const AdminTeam = lazy(() => import("@/pages/admin/AdminTeam"));
const AdminNotifications = lazy(() => import("@/pages/admin/AdminNotifications"));
const AdminSettings = lazy(() => import("@/pages/admin/AdminSettings"));
const AdminDailyTasks = lazy(() => import("@/pages/admin/AdminDailyTasks"));
const AdminEditorTasks = lazy(() => import("@/pages/admin/AdminEditorTasks"));
const AdminCameraShoots = lazy(() => import("@/pages/admin/AdminCameraShoots"));
const AdminClientIdeas = lazy(() => import("@/pages/admin/AdminClientIdeas"));
const AdminWeeklyReport = lazy(() => import("@/pages/admin/AdminWeeklyReport"));
const AdminContentPlanner = lazy(() => import("@/pages/admin/AdminContentPlanner"));
const AdminSocialPosts = lazy(() => import("@/pages/admin/AdminSocialPosts"));
const AdminSalaries = lazy(() => import("@/pages/admin/AdminSalaries"));

// Role-specific dashboards/sub-pages
const EditorDashboard = lazy(() => import("@/pages/editor/EditorDashboard"));
const DesignerDashboard = lazy(() => import("@/pages/designer/DesignerDashboard"));
const DesignerBrandKits = lazy(() => import("@/pages/designer/DesignerBrandKits"));
const WriterDashboard = lazy(() => import("@/pages/writer/WriterDashboard"));
const WriterClientBriefs = lazy(() => import("@/pages/writer/WriterClientBriefs"));
const CameraShoots = lazy(() => import("@/pages/camera/CameraShoots"));
const CameraFootage = lazy(() => import("@/pages/camera/CameraFootage"));
const SocialDashboard = lazy(() => import("@/pages/social/SocialDashboard"));
const SocialCompose = lazy(() => import("@/pages/social/SocialCompose"));
const SocialCalendar = lazy(() => import("@/pages/social/SocialCalendar"));

const PublicPostPreview = lazy(() => import("@/pages/PublicPostPreview"));

// Client portal
const ClientDashboard = lazy(() => import("@/pages/client/ClientDashboard"));

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="w-64 space-y-4">
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <CommandPalette />
          <Suspense fallback={<RouteFallback />}>
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
              <Route path="/admin/team" element={<ProtectedRoute allowedRoles={['admin']}><AdminTeam /></ProtectedRoute>} />
              <Route path="/admin/notifications" element={<ProtectedRoute allowedRoles={['admin']}><AdminNotifications /></ProtectedRoute>} />
              <Route path="/admin/weekly-report" element={<ProtectedRoute allowedRoles={['admin']}><AdminWeeklyReport /></ProtectedRoute>} />
              <Route path="/admin/content-planner" element={<ProtectedRoute allowedRoles={['admin']}><AdminContentPlanner /></ProtectedRoute>} />
              <Route path="/admin/social-posts" element={<ProtectedRoute allowedRoles={['admin']}><AdminSocialPosts /></ProtectedRoute>} />
              <Route path="/admin/salaries" element={<ProtectedRoute allowedRoles={['admin']}><AdminSalaries /></ProtectedRoute>} />
              <Route path="/admin/scripts" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout><ScriptsLibrary routeBase="/admin/scripts" /></AdminLayout></ProtectedRoute>} />
              <Route path="/admin/scripts/:id" element={<ProtectedRoute allowedRoles={['admin']}><ScriptEditor routeBase="/admin/scripts" /></ProtectedRoute>} />
              <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={['admin']}><AdminSettings /></ProtectedRoute>} />

              {/* Editor */}
              <Route path="/editor" element={<ProtectedRoute allowedRoles={['editor']}><EditorDashboard /></ProtectedRoute>} />

              <Route path="/editor/clients" element={<ProtectedRoute allowedRoles={['editor']}><EditorLayout><ClientsHub /></EditorLayout></ProtectedRoute>} />

              {/* Designer */}
              <Route path="/designer" element={<ProtectedRoute allowedRoles={['designer']}><DesignerDashboard /></ProtectedRoute>} />
              <Route path="/designer/brand-kits" element={<ProtectedRoute allowedRoles={['designer']}><DesignerBrandKits /></ProtectedRoute>} />

              <Route path="/designer/clients" element={<ProtectedRoute allowedRoles={['designer']}><DesignerLayout><ClientsHub /></DesignerLayout></ProtectedRoute>} />

              {/* Writer */}
              <Route path="/writer" element={<ProtectedRoute allowedRoles={['writer']}><WriterDashboard /></ProtectedRoute>} />
              <Route path="/writer/scripts" element={<ProtectedRoute allowedRoles={['writer']}><WriterLayout><ScriptsLibrary routeBase="/writer/scripts" /></WriterLayout></ProtectedRoute>} />
              <Route path="/writer/scripts/:id" element={<ProtectedRoute allowedRoles={['writer']}><ScriptEditor routeBase="/writer/scripts" /></ProtectedRoute>} />
              <Route path="/writer/briefs" element={<ProtectedRoute allowedRoles={['writer']}><WriterClientBriefs /></ProtectedRoute>} />

              <Route path="/writer/clients" element={<ProtectedRoute allowedRoles={['writer']}><WriterLayout><ClientsHub /></WriterLayout></ProtectedRoute>} />

              {/* Camera */}
              <Route path="/camera" element={<ProtectedRoute allowedRoles={['camera_operator']}><CameraShoots /></ProtectedRoute>} />
              <Route path="/camera/footage" element={<ProtectedRoute allowedRoles={['camera_operator']}><CameraFootage /></ProtectedRoute>} />

              <Route path="/camera/clients" element={<ProtectedRoute allowedRoles={['camera_operator']}><CameraLayout><ClientsHub /></CameraLayout></ProtectedRoute>} />

              {/* Social executive */}
              <Route path="/social" element={<ProtectedRoute allowedRoles={['social_executive']}><SocialDashboard /></ProtectedRoute>} />
              <Route path="/social/compose" element={<ProtectedRoute allowedRoles={['social_executive']}><SocialCompose /></ProtectedRoute>} />
              <Route path="/social/calendar" element={<ProtectedRoute allowedRoles={['social_executive']}><SocialCalendar /></ProtectedRoute>} />

              <Route path="/social/clients" element={<ProtectedRoute allowedRoles={['social_executive']}><SocialLayout><ClientsHub /></SocialLayout></ProtectedRoute>} />

              {/* Client portal */}
              <Route path="/client" element={<ProtectedRoute allowedRoles={['client']}><ClientDashboard /></ProtectedRoute>} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
