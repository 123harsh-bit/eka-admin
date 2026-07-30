import { ReactNode } from 'react';
import { TeamLayout } from '@/components/shared/TeamLayout';
import { Palette, Building2, User } from 'lucide-react';

const navItems = [
  { to: '/designer', icon: Palette, label: 'My Tasks', end: true },
  { to: '/designer/clients', icon: Building2, label: 'Client Assets' },
  { to: '/designer/profile', icon: User, label: 'My Profile' },
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
