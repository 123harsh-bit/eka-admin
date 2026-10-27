import { ReactNode } from 'react';
import { TeamLayout } from '@/components/shared/TeamLayout';
import { LayoutDashboard, CalendarRange, Plus, Building2, Link2 } from 'lucide-react';

const navItems = [
  { to: '/social', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/social/compose', icon: Plus, label: 'New Post' },
  { to: '/social/calendar', icon: CalendarRange, label: 'Calendar' },
  { to: '/social/accounts', icon: Link2, label: 'Accounts' },
  { to: '/social/clients', icon: Building2, label: 'Client Assets' },
];

export function SocialLayout({ children }: { children: ReactNode }) {
  return (
    <TeamLayout
      navItems={navItems}
      roleLabel="Social Executive"
      roleColor="bg-amber-500/20"
      roleTextColor="text-amber-400"
      profilePath="/social/profile"
    >
      {children}
    </TeamLayout>
  );
}
