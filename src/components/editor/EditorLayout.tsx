import { ReactNode } from 'react';
import { TeamLayout } from '@/components/shared/TeamLayout';
import { Video, Calendar } from 'lucide-react';

const navItems = [
  { to: '/editor', icon: Video, label: 'My Tasks', end: true },
  { to: '/editor/attendance', icon: Calendar, label: 'Attendance' },
];

export function EditorLayout({ children }: { children: ReactNode }) {
  return (
    <TeamLayout
      navItems={navItems}
      roleLabel="Video Editor"
      roleColor="bg-blue-500/20"
      roleTextColor="text-blue-400"
    >
      {children}
    </TeamLayout>
  );
}
