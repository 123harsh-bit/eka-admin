import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useToast } from '@/hooks/use-toast';
import { VIDEO_STATUSES, type VideoStatus } from '@/lib/statusConfig';
import { Search, Camera, MapPin, Clock, ExternalLink, FolderOpen, Calendar, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ShootVideo {
  id: string; title: string; status: string; client_id: string;
  assigned_camera_operator: string | null; shoot_date: string | null;
  shoot_start_time: string | null; shoot_location: string | null;
  shoot_notes: string | null; raw_footage_link: string | null;
  footage_uploaded_at: string | null; client_name?: string; camera_op_name?: string;
}

interface TeamMember { id: string; full_name: string; }

const CAMERA_STATUSES: VideoStatus[] = ['shoot_assigned', 'shooting', 'footage_delivered'];

export default function AdminCameraShoots() {
  const [videos, setVideos] = useState<ShootVideo[]>([]);
  const [cameraOps, setCameraOps] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [opFilter, setOpFilter] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchAll();
    const channel = supabase
      .channel('admin-camera-shoots')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'videos' }, fetchVideos)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchVideos(), fetchCameraOps()]);
    setLoading(false);
  };

  const fetchVideos = async () => {
    const { data } = await supabase
      .from('videos')
      .select('id, title, status, client_id, assigned_camera_operator, shoot_date, shoot_start_time, shoot_location, shoot_notes, raw_footage_link, footage_uploaded_at, clients(name)')
      .not('assigned_camera_operator', 'is', null)
      .order('shoot_date', { ascending: true, nullsFirst: false });
    if (data) {
      const opIds = [...new Set((data as any[]).map(v => v.assigned_camera_operator).filter(Boolean))];
      let profileMap: Record<string, string> = {};
      if (opIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', opIds);
        profiles?.forEach(p => { profileMap[p.id] = p.full_name; });
      }
      setVideos((data as any[]).map(v => ({
        ...v,
        client_name: v.clients?.name || 'Unknown',
        camera_op_name: v.assigned_camera_operator ? profileMap[v.assigned_camera_operator] || 'Unknown' : null,
      })));
    }
  };

  const fetchCameraOps = async () => {
    const { data: roles } = await supabase.from('user_roles').select('user_id').eq('role', 'camera_operator');
    if (roles?.length) {
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', roles.map(r => r.user_id));
      if (profiles) setCameraOps(profiles.map(p => ({ id: p.id, full_name: p.full_name })));
    }
  };

  const filtered = videos.filter(v => {
    const matchSearch = v.title.toLowerCase().includes(search.toLowerCase()) || v.client_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || v.status === statusFilter;
    const matchOp = !opFilter || v.assigned_camera_operator === opFilter;
    return matchSearch && matchStatus && matchOp;
  });

  const today = new Date().toISOString().split('T')[0];
  const activeCount = videos.filter(v => ['shoot_assigned', 'shooting'].includes(v.status)).length;
  const overdueCount = videos.filter(v => ['shoot_assigned', 'shooting'].includes(v.status) && v.shoot_date && v.shoot_date < today).length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold gradient-text">Camera Shoots</h1>
          <p className="text-muted-foreground mt-1">
            {videos.length} total shoots · {activeCount} active
            {overdueCount > 0 && <span className="text-destructive ml-2">· {overdueCount} overdue</span>}
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-40">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="pl-8 h-9 text-sm" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground">
            <option value="">All statuses</option>
            {CAMERA_STATUSES.map(s => <option key={s} value={s}>{VIDEO_STATUSES[s].emoji} {VIDEO_STATUSES[s].label}</option>)}
          </select>
          <select value={opFilter} onChange={e => setOpFilter(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground">
            <option value="">All operators</option>
            {cameraOps.map(o => <option key={o.id} value={o.id}>{o.full_name}</option>)}
          </select>
        </div>

        {/* Summary cards per camera op */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cameraOps.map(op => {
            const opVids = videos.filter(v => v.assigned_camera_operator === op.id);
            const active = opVids.filter(v => ['shoot_assigned', 'shooting'].includes(v.status)).length;
            const overdue = opVids.filter(v => ['shoot_assigned', 'shooting'].includes(v.status) && v.shoot_date && v.shoot_date < today).length;
            const upcoming = opVids.filter(v => v.status === 'shoot_assigned' && v.shoot_date && v.shoot_date >= today).length;
            return (
              <div key={op.id} className="glass-card p-4 space-y-1 cursor-pointer hover:ring-1 hover:ring-primary/50 transition-all"
                onClick={() => setOpFilter(f => f === op.id ? '' : op.id)}>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-violet-500/20 flex items-center justify-center text-xs font-bold text-violet-400">
                    {op.full_name.charAt(0)}
                  </div>
                  <p className="font-medium text-foreground text-sm">{op.full_name}</p>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{active} active</span>
                  <span>{upcoming} upcoming</span>
                  <span>{opVids.length} total</span>
                  {overdue > 0 && <span className="text-destructive font-medium">{overdue} overdue</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Table */}
        <div className="glass-card overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-card/80 border-b border-glass-border">
              <tr>
                {['Video', 'Client', 'Status', 'Camera Op', 'Shoot Date', 'Time', 'Location', 'Footage'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? [...Array(5)].map((_, i) => (
                <tr key={i}><td colSpan={8} className="px-4 py-3"><div className="h-7 bg-muted/50 rounded animate-pulse" /></td></tr>
              )) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                  <Camera size={32} className="mx-auto mb-2 opacity-40" />
                  No camera shoots found.
                </td></tr>
              ) : filtered.map(video => {
                const isOverdue = video.shoot_date && video.shoot_date < today && ['shoot_assigned', 'shooting'].includes(video.status);
                const isActive = video.status === 'shooting';
                return (
                  <tr key={video.id} className={cn(
                    'border-b border-glass-border/50 hover:bg-muted/20 transition-colors',
                    isActive && 'bg-destructive/5',
                    isOverdue && 'bg-warning/5',
                  )}>
                    <td className="px-4 py-3 font-medium text-foreground max-w-48 truncate">
                      {isActive && <span className="inline-block h-2 w-2 rounded-full bg-destructive animate-pulse mr-2" />}
                      {video.title}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{video.client_name}</td>
                    <td className="px-4 py-3"><StatusBadge status={video.status as VideoStatus} type="video" /></td>
                    <td className="px-4 py-3 text-muted-foreground">{video.camera_op_name || '—'}</td>
                    <td className="px-4 py-3">
                      {video.shoot_date ? (
                        <span className={cn('text-xs flex items-center gap-1', isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground')}>
                          <Calendar size={10} />
                          {new Date(video.shoot_date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                          {isOverdue && <AlertTriangle size={10} className="ml-1" />}
                        </span>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {video.shoot_start_time ? (
                        <span className="flex items-center gap-1"><Clock size={10} /> {video.shoot_start_time}</span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs max-w-32 truncate">
                      {video.shoot_location ? (
                        <span className="flex items-center gap-1"><MapPin size={10} /> {video.shoot_location}</span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {video.raw_footage_link ? (
                        <a href={video.raw_footage_link} target="_blank" rel="noopener noreferrer" className="text-xs text-amber-400 hover:underline flex items-center gap-1">
                          <FolderOpen size={10} /> View
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
