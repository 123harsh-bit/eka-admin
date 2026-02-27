import { useState, useEffect } from 'react';
import { CameraLayout } from '@/components/camera/CameraLayout';
import { DailyTasksContent } from '@/pages/shared/DailyTasksPage';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Camera, MapPin, Clock, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface AssignedShoot {
  id: string;
  title: string;
  status: string;
  shoot_date: string | null;
  shoot_start_time: string | null;
  shoot_location: string | null;
  shoot_notes: string | null;
  client_name: string;
}

export default function CameraDailyTasks() {
  const { user } = useAuth();
  const [shoots, setShoots] = useState<AssignedShoot[]>([]);

  useEffect(() => {
    if (!user?.id) return;

    const fetchShoots = async () => {
      const { data } = await supabase
        .from('videos')
        .select('id, title, status, shoot_date, shoot_start_time, shoot_location, shoot_notes, clients!videos_client_id_fkey(name)')
        .eq('assigned_camera_operator', user.id)
        .in('status', ['shoot_assigned', 'shooting', 'scripting', 'script_approved'])
        .order('shoot_date', { ascending: true });
      if (data) {
        setShoots(data.map((v: any) => ({
          id: v.id,
          title: v.title,
          status: v.status,
          shoot_date: v.shoot_date,
          shoot_start_time: v.shoot_start_time,
          shoot_location: v.shoot_location,
          shoot_notes: v.shoot_notes,
          client_name: v.clients?.name || 'Unknown',
        })));
      }
    };

    fetchShoots();
    const channel = supabase
      .channel(`camera-daily-shoots-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'videos', filter: `assigned_camera_operator=eq.${user.id}` }, fetchShoots)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    shoot_assigned: { label: 'Assigned', color: 'bg-warning/20 text-warning' },
    shooting: { label: 'Shooting', color: 'bg-primary/20 text-primary' },
    scripting: { label: 'Pre-production', color: 'bg-muted text-muted-foreground' },
    script_approved: { label: 'Ready to Shoot', color: 'bg-success/20 text-success' },
  };

  return (
    <CameraLayout>
      <div className="space-y-8">
        {/* Assigned Shoots Section */}
        {shoots.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Camera size={20} className="text-primary" />
              <h2 className="text-xl font-display font-bold text-foreground">My Assigned Shoots</h2>
              <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-medium">{shoots.length}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {shoots.map(shoot => {
                const statusConfig = STATUS_LABELS[shoot.status] || { label: shoot.status, color: 'bg-muted text-muted-foreground' };
                const isToday = shoot.shoot_date === new Date().toISOString().split('T')[0];
                return (
                  <div key={shoot.id} className={cn(
                    'glass-card p-4 space-y-2 border-l-4',
                    isToday ? 'border-l-primary' : 'border-l-muted-foreground/30'
                  )}>
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-sm text-foreground">{shoot.title}</h3>
                        <p className="text-xs text-muted-foreground">{shoot.client_name}</p>
                      </div>
                      <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', statusConfig.color)}>
                        {statusConfig.label}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {shoot.shoot_date && (
                        <span className={cn('flex items-center gap-1', isToday && 'text-primary font-medium')}>
                          <CalendarIcon size={11} />
                          {isToday ? 'Today' : format(new Date(shoot.shoot_date + 'T00:00:00'), 'MMM d')}
                        </span>
                      )}
                      {shoot.shoot_start_time && (
                        <span className="flex items-center gap-1"><Clock size={11} />{shoot.shoot_start_time}</span>
                      )}
                      {shoot.shoot_location && (
                        <span className="flex items-center gap-1"><MapPin size={11} />{shoot.shoot_location}</span>
                      )}
                    </div>
                    {shoot.shoot_notes && (
                      <p className="text-xs text-muted-foreground/80 italic">"{shoot.shoot_notes}"</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Personal Daily Tasks */}
        <DailyTasksContent />
      </div>
    </CameraLayout>
  );
}
