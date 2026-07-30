import { ReactNode } from 'react';
import { TeamLayout } from '@/components/shared/TeamLayout';
import { PenTool, BookOpen, Building2, FileText, User } from 'lucide-react';

const navItems = [
  { to: '/writer', icon: PenTool, label: 'My Tasks', end: true },
  { to: '/writer/scripts', icon: FileText, label: 'Scripts' },
  { to: '/writer/briefs', icon: BookOpen, label: 'Client Briefs' },
  { to: '/writer/clients', icon: Building2, label: 'Client Assets' },
  { to: '/writer/profile', icon: User, label: 'My Profile' },
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
