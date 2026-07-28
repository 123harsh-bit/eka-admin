import { ReactNode } from 'react';
import { TeamLayout } from '@/components/shared/TeamLayout';
import { Video, Building2 } from 'lucide-react';

const navItems = [
  { to: '/editor', icon: Video, label: 'My Tasks', end: true },
  { to: '/editor/clients', icon: Building2, label: 'Client Assets' },
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
