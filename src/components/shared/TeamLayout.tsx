import { ReactNode, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { EkaLogo } from '@/components/shared/EkaLogo';
import { useAuth } from '@/hooks/useAuth';
import { useAttendance } from '@/hooks/useAttendance';
import { NotificationBell } from '@/components/shared/NotificationBell';
import { StartWorkday } from '@/components/auth/StartWorkday';
import { AttendanceBar } from '@/components/shared/AttendanceBar';
import { Button } from '@/components/ui/button';
import { LogOut, Menu, X, ChevronLeft, type LucideIcon } from 'lucide-react';

interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
  end?: boolean;
}

interface TeamLayoutProps {
  children: ReactNode;
  navItems: NavItem[];
  roleLabel: string;
  roleColor: string; // tailwind bg class like 'bg-blue-500/20'
  roleTextColor: string; // tailwind text class like 'text-blue-400'
}

export function TeamLayout({ children, navItems, roleLabel, roleColor, roleTextColor }: TeamLayoutProps) {
  const { signOut, profile } = useAuth();
  useAttendance();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <StartWorkday>
      <div className="flex min-h-screen bg-background">
        {sidebarOpen && <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

        <aside className={cn(
          'fixed lg:sticky top-0 left-0 z-50 h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-200',
          collapsed ? 'w-16' : 'w-60',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}>
          <div className={cn('flex items-center justify-between p-4', collapsed && 'justify-center')}>
            {!collapsed && <EkaLogo size="sm" />}
            <button
              className="hidden lg:flex text-muted-foreground hover:text-foreground h-7 w-7 items-center justify-center rounded-md hover:bg-muted transition-colors"
              onClick={() => setCollapsed(!collapsed)}
            >
              <ChevronLeft size={14} className={cn('transition-transform', collapsed && 'rotate-180')} />
            </button>
            <button className="lg:hidden text-muted-foreground hover:text-foreground" onClick={() => setSidebarOpen(false)}>
              <X size={18} />
            </button>
          </div>

          <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto pb-2">
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) => cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors',
                  collapsed && 'justify-center px-0',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )}
              >
                <item.icon size={16} className="flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            ))}
          </nav>

          <div className={cn('p-3 border-t border-sidebar-border', collapsed && 'px-2')}>
            {!collapsed && (
              <div className="flex items-center gap-2.5 mb-2 px-1">
                <div className={cn('h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0', roleColor, roleTextColor)}>
                  {profile?.full_name?.charAt(0) || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-sidebar-foreground truncate">{profile?.full_name || roleLabel}</p>
                  <p className="text-[10px] text-muted-foreground">{roleLabel}</p>
                </div>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className={cn('w-full gap-2 text-muted-foreground hover:text-destructive text-xs', collapsed ? 'justify-center px-0' : 'justify-start')}
            >
              <LogOut size={14} />
              {!collapsed && 'Sign Out'}
            </Button>
          </div>
        </aside>

        <main className="flex-1 min-w-0 flex flex-col">
          <AttendanceBar />
          <div className="lg:hidden flex items-center justify-between p-3 border-b border-border">
            <button onClick={() => setSidebarOpen(true)} className="text-foreground p-1">
              <Menu size={20} />
            </button>
            <EkaLogo size="sm" />
            <NotificationBell />
          </div>
          <div className="hidden lg:flex items-center justify-end px-6 pt-3">
            <NotificationBell />
          </div>
          <div className="p-4 md:p-6 fade-in flex-1">
            {children}
          </div>
        </main>
      </div>
    </StartWorkday>
  );
}