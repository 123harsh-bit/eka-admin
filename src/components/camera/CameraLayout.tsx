import { ReactNode } from 'react';
import { TeamLayout } from '@/components/shared/TeamLayout';
import { Camera, FolderOpen, Users, ListTodo, Calendar } from 'lucide-react';

const navItems = [
  { to: '/camera', icon: Camera, label: 'My Shoots', end: true },
  { to: '/camera/footage', icon: FolderOpen, label: 'Footage' },
  { to: '/camera/clients', icon: Users, label: 'Clients' },
  { to: '/camera/daily-tasks', icon: ListTodo, label: 'Daily Tasks' },
  { to: '/camera/attendance', icon: Calendar, label: 'Attendance' },
];

export function CameraLayout({ children }: { children: ReactNode }) {
  return (
    <TeamLayout
      navItems={navItems}
      roleLabel="Camera Operator"
      roleColor="bg-violet-500/20"
      roleTextColor="text-violet-400"
    >
      {children}
    </TeamLayout>
  );
}