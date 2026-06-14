import { ReactNode } from 'react';
import { TeamLayout } from '@/components/shared/TeamLayout';
import { PenTool, BookOpen, Calendar } from 'lucide-react';

const navItems = [
  { to: '/writer', icon: PenTool, label: 'My Tasks', end: true },
  { to: '/writer/briefs', icon: BookOpen, label: 'Client Briefs' },
  { to: '/writer/attendance', icon: Calendar, label: 'Attendance' },
];

export function WriterLayout({ children }: { children: ReactNode }) {
  return (
    <TeamLayout
      navItems={navItems}
      roleLabel="Content Writer"
      roleColor="bg-emerald-500/20"
      roleTextColor="text-emerald-400"
    >
      {children}
    </TeamLayout>
  );
}
