import { ReactNode, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { EkaLogo } from '@/components/shared/EkaLogo';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { NotificationBell } from '@/components/shared/NotificationBell';
import {
  LayoutDashboard, Users, Video, Palette, PenTool, Camera,
  UserCircle, Bell, Settings, LogOut, Menu, X, ListTodo,
  Calendar, Scissors, Lightbulb, BarChart3, CalendarRange,
  ChevronLeft
} from 'lucide-react';

const navGroups = [
  {
    label: 'Main',
    items: [
      { to: '/admin', icon: LayoutDashboard, label: 'Overview', end: true },
      { to: '/admin/content-planner', icon: CalendarRange, label: 'Content Planner' },
      { to: '/admin/daily-tasks', icon: ListTodo, label: 'Daily Tasks' },
    ],
  },
  {
    label: 'Production',
    items: [
      { to: '/admin/videos', icon: Video, label: 'Videos' },
      { to: '/admin/design-tasks', icon: Palette, label: 'Design Tasks' },
      { to: '/admin/writing-tasks', icon: PenTool, label: 'Writing Tasks' },
      { to: '/admin/editor-tasks', icon: Scissors, label: 'Editor Tasks' },
      { to: '/admin/camera-shoots', icon: Camera, label: 'Camera Shoots' },
    ],
  },
  {
    label: 'Manage',
    items: [
      { to: '/admin/clients', icon: Users, label: 'Clients' },
      { to: '/admin/client-ideas', icon: Lightbulb, label: 'Client Ideas' },
      { to: '/admin/team', icon: UserCircle, label: 'Team' },
      { to: '/admin/attendance', icon: Calendar, label: 'Attendance' },
      { to: '/admin/weekly-report', icon: BarChart3, label: 'Weekly Report' },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/admin/notifications', icon: Bell, label: 'Notifications' },
      { to: '/admin/settings', icon: Settings, label: 'Settings' },
    ],
  },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const { signOut, profile } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

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

        <nav className="flex-1 px-2 space-y-4 overflow-y-auto pb-2">
          {navGroups.map(group => (
            <div key={group.label}>
              {!collapsed && (
                <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">{group.label}</p>
              )}
              <div className="space-y-0.5">
                {group.items.map(item => (
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
              </div>
            </div>
          ))}
        </nav>

        <div className={cn('p-3 border-t border-sidebar-border', collapsed && 'px-2')}>
          {!collapsed && (
            <div className="flex items-center gap-2.5 mb-2 px-1">
              <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                {profile?.full_name?.charAt(0) || 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-sidebar-foreground truncate">{profile?.full_name || 'Admin'}</p>
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

      <main className="flex-1 min-w-0">
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
        <div className="p-4 md:p-6 fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}