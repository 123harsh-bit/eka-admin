import { ReactNode } from 'react';
import { TeamLayout } from '@/components/shared/TeamLayout';
import { Palette, ListTodo, BookOpen, Calendar } from 'lucide-react';

const navItems = [
  { to: '/designer', icon: Palette, label: 'My Tasks', end: true },
  { to: '/designer/daily-tasks', icon: ListTodo, label: 'Daily Tasks' },
  { to: '/designer/brand-kits', icon: BookOpen, label: 'Brand Kits' },
  { to: '/designer/attendance', icon: Calendar, label: 'Attendance' },
];

export function DesignerLayout({ children }: { children: ReactNode }) {
  return (
    <TeamLayout
      navItems={navItems}
      roleLabel="Graphic Designer"
      roleColor="bg-pink-500/20"
      roleTextColor="text-pink-400"
    >
      {children}
    </TeamLayout>
  );
}