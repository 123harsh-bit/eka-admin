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
import { Video, Users, LogOut, Menu, X, ListTodo, Calendar } from 'lucide-react';


const navItems = [
  { to: '/editor', icon: Video, label: 'My Tasks', end: true },
  { to: '/editor/daily-tasks', icon: ListTodo, label: 'My Daily Tasks' },
  { to: '/editor/videos', icon: Video, label: 'All Videos' },
  { to: '/editor/clients', icon: Users, label: 'Clients' },
  { to: '/editor/attendance', icon: Calendar, label: 'My Attendance' },
];

export function EditorLayout({ children }: { children: ReactNode }) {
  const { signOut, profile } = useAuth();
  useAttendance();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <StartWorkday>
    <div className="flex min-h-screen bg-background">
      {sidebarOpen && <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside className={cn(
        'fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-300',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        <div className="p-6 flex items-center justify-between">
          <EkaLogo size="md" />
          <button className="lg:hidden text-muted-foreground" onClick={() => setSidebarOpen(false)}><X size={20} /></button>
        </div>
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                isActive ? 'bg-sidebar-accent text-sidebar-primary-foreground' : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
              )}>
              <item.icon size={18} />{item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-400">
              {profile?.full_name?.charAt(0) || 'E'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{profile?.full_name || 'Editor'}</p>
              <p className="text-xs text-muted-foreground">Video Editor</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut} className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive">
            <LogOut size={16} /> Sign Out
          </Button>
        </div>
      </aside>
      <main className="flex-1 min-w-0 flex flex-col">
        <AttendanceBar />
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-border">
          <button onClick={() => setSidebarOpen(true)}><Menu size={24} /></button>
          <EkaLogo size="sm" />
          <NotificationBell />
        </div>
        <div className="hidden lg:flex items-center justify-end px-8 pt-4">
          <NotificationBell />
        </div>
        <div className="p-4 md:p-6 lg:p-8 fade-in flex-1">{children}</div>
      </main>
      
    </div>
    </StartWorkday>
  );
}
