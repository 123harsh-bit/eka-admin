import { ReactNode } from 'react';
import { TeamLayout } from '@/components/shared/TeamLayout';
import { LayoutDashboard, CalendarRange, BarChart3, ListTodo, Calendar, Plus } from 'lucide-react';

const navItems = [
  { to: '/social', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/social/compose', icon: Plus, label: 'New Post' },
  { to: '/social/calendar', icon: CalendarRange, label: 'Calendar' },
  { to: '/social/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/social/daily-tasks', icon: ListTodo, label: 'Daily Tasks' },
  { to: '/social/attendance', icon: Calendar, label: 'Attendance' },
];

export function SocialLayout({ children }: { children: ReactNode }) {
  return (
    <TeamLayout
      navItems={navItems}
      roleLabel="Social Executive"
      roleColor="bg-amber-500/20"
      roleTextColor="text-amber-400"
    >
      {children}
    </TeamLayout>
  );
}
