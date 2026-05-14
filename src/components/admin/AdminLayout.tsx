import { ReactNode } from 'react';
import { TeamLayout } from '@/components/shared/TeamLayout';
import {
  LayoutDashboard, Users, Video, Palette, PenTool, Camera,
  UserCircle, Bell, Settings, ListTodo,
  Calendar, Scissors, Lightbulb, BarChart3, CalendarRange, Share2,
} from 'lucide-react';

const navGroups = [
  {
    label: 'Main',
    items: [
      { to: '/admin', icon: LayoutDashboard, label: 'Overview', end: true },
      { to: '/admin/content-planner', icon: CalendarRange, label: 'Content Planner' },
      { to: '/admin/daily-tasks', icon: ListTodo, label: 'Daily Tasks' },
    ],
  },
  {
    label: 'Production',
    items: [
      { to: '/admin/videos', icon: Video, label: 'Videos' },
      { to: '/admin/design-tasks', icon: Palette, label: 'Design Tasks' },
      { to: '/admin/writing-tasks', icon: PenTool, label: 'Writing Tasks' },
      { to: '/admin/editor-tasks', icon: Scissors, label: 'Editor Tasks' },
      { to: '/admin/camera-shoots', icon: Camera, label: 'Camera Shoots' },
      { to: '/admin/social-posts', icon: Share2, label: 'Social Posts' },
    ],
  },
  {
    label: 'Manage',
    items: [
      { to: '/admin/clients', icon: Users, label: 'Clients' },
      { to: '/admin/client-ideas', icon: Lightbulb, label: 'Client Ideas' },
      { to: '/admin/team', icon: UserCircle, label: 'Team' },
      { to: '/admin/attendance', icon: Calendar, label: 'Attendance' },
      { to: '/admin/weekly-report', icon: BarChart3, label: 'Weekly Report' },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/admin/notifications', icon: Bell, label: 'Notifications' },
      { to: '/admin/settings', icon: Settings, label: 'Settings' },
    ],
  },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <TeamLayout
      navGroups={navGroups}
      roleLabel="Admin"
      roleColor="bg-primary/20"
      roleTextColor="text-primary"
      showAttendance={false}
    >
      {children}
    </TeamLayout>
  );
}
