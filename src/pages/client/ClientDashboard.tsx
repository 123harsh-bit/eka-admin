import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { NeedHelpButton } from '@/components/shared/NeedHelpButton';
import { NotificationBell } from '@/components/shared/NotificationBell';
import { VideoFeedbackModal } from '@/components/client/VideoFeedbackModal';
import { IdeaSubmissionForm } from '@/components/client/IdeaSubmissionForm';
import { ClientIdeasList } from '@/components/client/ClientIdeasList';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { VIDEO_STATUSES, VIDEO_STATUS_ORDER, EDITING_ONLY_STATUS_ORDER, DESIGN_TASK_STATUSES, WRITING_TASK_STATUSES, type VideoStatus, type ClientServiceType, getClientLabel, getStatusOrderForClient } from '@/lib/statusConfig';
import { EkaLogo } from '@/components/shared/EkaLogo';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  Video, Download, Check, MessageSquare, ExternalLink,
  LogOut, LayoutDashboard, Palette, PenTool, BarChart3,
  Settings, Bell, TrendingUp, Clock, CheckCircle, Star,
  Menu, X, Loader2, Lightbulb
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth as useAuthHook } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';

interface ClientData {
  id: string; name: string; logo_url: string | null;
  monthly_deliverables: number | null; is_active: boolean;
  service_type?: string;
}

interface VideoData {
  id: string; title: string; status: string; thumbnail_url: string | null;
  drive_link: string | null; live_url: string | null;
  date_delivered: string | null; date_planned: string | null;
  description: string | null;
  shoot_date: string | null; shoot_start_time: string | null;
  camera_op_first_name: string | null;
}

interface ActivityItem {
  id: string; entity_type: string; action: string; details: Record<string, unknown>; created_at: string;
}

const CLIENT_NAV = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'videos', icon: Video, label: 'Videos' },
  { id: 'ideas', icon: Lightbulb, label: '💡 My Ideas' },
  { id: 'design', icon: Palette, label: 'Design Deliverables' },
  { id: 'content', icon: PenTool, label: 'Content & Copy' },
  { id: 'report', icon: BarChart3, label: 'Monthly Report' },
  { id: 'account', icon: Settings, label: 'Account' },
];

export default function ClientDashboard() {
  const { user, signOut, profile } = useAuth();
  const { toast } = useToast();
  const [client, setClient] = useState<ClientData | null>(null);
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [designTasks, setDesignTasks] = useState<unknown[]>([]);
  const [writingTasks, setWritingTasks] = useState<unknown[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState('dashboard');
  const [feedbackVideo, setFeedbackVideo] = useState<VideoData | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showIdeaForm, setShowIdeaForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', newPass: '', confirm: '' });
  const [savingPwd, setSavingPwd] = useState(false);

  useEffect(() => {
    fetchAll();
    const channel = supabase
      .channel('client-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'videos' }, () => fetchVideos())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const fetchAll = async () => {
    if (!user) return;
    setLoading(true);
    await Promise.all([fetchClient(), fetchVideos(), fetchDesignTasks(), fetchWritingTasks(), fetchActivity()]);
    setLoading(false);
  };

  const fetchClient = async () => {
    if (!user) return;
    const { data } = await supabase.from('clients').select('id, name, logo_url, monthly_deliverables, is_active, service_type').eq('user_id', user.id).single();
    if (data) setClient(data as ClientData);
  };

  const fetchVideos = async () => {
    if (!user) return;
    const clientData = await supabase.from('clients').select('id').eq('user_id', user.id).single();
    if (!clientData.data) return;
    // Explicitly exclude raw_footage_link — never send to client
    const { data } = await supabase.from('videos')
      .select('id, title, status, thumbnail_url, drive_link, live_url, date_delivered, date_planned, description, shoot_date, shoot_start_time, assigned_camera_operator')
      .eq('client_id', clientData.data.id)
      .order('created_at', { ascending: false });
    if (data) {
      // Resolve camera op first name
      const camOpIds = [...new Set(data.map((v: any) => v.assigned_camera_operator).filter(Boolean))];
      let camOpNames: Record<string, string> = {};
      if (camOpIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', camOpIds);
        profiles?.forEach(p => { camOpNames[p.id] = p.full_name.split(' ')[0]; });
      }
      setVideos(data.map((v: any) => ({
        ...v,
        camera_op_first_name: v.assigned_camera_operator ? camOpNames[v.assigned_camera_operator] || null : null,
      })));
    }
  };

  const fetchDesignTasks = async () => {
    if (!user) return;
    const clientData = await supabase.from('clients').select('id').eq('user_id', user.id).single();
    if (!clientData.data) return;
    const { data } = await supabase.from('design_tasks').select('id, title, task_type, status, drive_link, due_date').eq('client_id', clientData.data.id).order('created_at', { ascending: false });
    if (data) setDesignTasks(data);
  };

  const fetchWritingTasks = async () => {
    if (!user) return;
    const clientData = await supabase.from('clients').select('id').eq('user_id', user.id).single();
    if (!clientData.data) return;
    const { data } = await supabase.from('writing_tasks').select('id, title, task_type, status, doc_link, word_count_target, due_date').eq('client_id', clientData.data.id).order('created_at', { ascending: false });
    if (data) setWritingTasks(data);
  };

  const fetchActivity = async () => {
    if (!user) return;
    const clientData = await supabase.from('clients').select('id').eq('user_id', user.id).single();
    if (!clientData.data) return;
    const { data } = await supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(10);
    if (data) setActivity(data.map(a => ({ ...a, details: (a.details as Record<string, unknown>) || {} })));
  };

  const handleApprove = async (video: VideoData) => {
    setApprovingId(video.id);
    await supabase.from('videos').update({ status: 'approved' }).eq('id', video.id);
    await fetchVideos();
    setApprovingId(null);
    toast({ title: '✅ Video approved!', description: 'The Eka team has been notified.' });
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPass !== passwordForm.confirm) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    setSavingPwd(true);
    const { error } = await supabase.auth.updateUser({ password: passwordForm.newPass });
    if (error) {
      toast({ title: 'Error updating password', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Password updated!' });
      setPasswordForm({ current: '', newPass: '', confirm: '' });
    }
    setSavingPwd(false);
  };

  // Dashboard stats
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const liveVideos = videos.filter(v => v.status === 'live');
  const inProduction = videos.filter(v => !['idea', 'live', 'approved', 'client_review'].includes(v.status));
  const readyForReview = videos.filter(v => v.status === 'client_review');
  const approvedVideos = videos.filter(v => v.status === 'approved');
  const deliveredThisMonth = videos.filter(v => v.date_delivered && v.date_delivered >= startOfMonth).length;
  const monthlyTarget = client?.monthly_deliverables || 0;
  const progress = monthlyTarget > 0 ? Math.min(100, (deliveredThisMonth / monthlyTarget) * 100) : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
          <p className="text-muted-foreground text-sm">Loading your portal…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={cn(
        'fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-300',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        <div className="p-6 flex items-center justify-between">
          {client?.logo_url ? (
            <img src={client.logo_url} alt={client.name} className="h-8 object-contain max-w-[120px]" />
          ) : (
            <EkaLogo size="md" />
          )}
          <button className="lg:hidden text-muted-foreground" onClick={() => setSidebarOpen(false)}><X size={20} /></button>
        </div>
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {CLIENT_NAV.map(item => (
            <button
              key={item.id}
              onClick={() => { setSection(item.id); setSidebarOpen(false); }}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                section === item.id ? 'bg-sidebar-accent text-sidebar-primary-foreground' : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
              )}
            >
              <item.icon size={18} />{item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
              {client?.name.charAt(0) || profile?.full_name?.charAt(0) || 'C'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{client?.name || profile?.full_name || 'Client'}</p>
              <p className="text-xs text-muted-foreground">Client Portal</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut} className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive">
            <LogOut size={16} /> Sign Out
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0">
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-border">
          <button onClick={() => setSidebarOpen(true)}><Menu size={24} /></button>
          <EkaLogo size="sm" />
          <NotificationBell />
        </div>
        <div className="hidden lg:flex items-center justify-end px-8 pt-4">
          <NotificationBell />
        </div>

        <div className="p-4 md:p-6 lg:p-8 fade-in">
          {/* DASHBOARD SECTION */}
          {section === 'dashboard' && (
            <div className="space-y-6">
              {/* Hero */}
              <div className="rounded-2xl bg-gradient-to-br from-primary/30 via-primary/15 to-transparent border border-primary/20 p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-2xl font-display font-bold text-foreground">
                      Welcome back{client ? `, ${client.name}` : ''}! 👋
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">Here's your content progress this month.</p>
                  </div>
                </div>
                {monthlyTarget > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{deliveredThisMonth} of {monthlyTarget} videos delivered this month</span>
                      <span className="font-semibold text-foreground">{Math.round(progress)}%</span>
                    </div>
                    <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-700"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Live', value: liveVideos.length, icon: TrendingUp, color: 'text-success' },
                  { label: 'In Production', value: inProduction.length, icon: Clock, color: 'text-primary' },
                  { label: 'Ready to Review', value: readyForReview.length, icon: Star, color: 'text-pink-400' },
                  { label: 'Approved', value: approvedVideos.length, icon: CheckCircle, color: 'text-cyan-400' },
                ].map(stat => (
                  <div key={stat.label} className="glass-card p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                      <stat.icon size={14} className={stat.color} />
                    </div>
                    <p className="text-2xl font-display font-bold text-foreground">{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Activity + Upcoming */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass-card p-5 space-y-3">
                  <h2 className="font-display font-semibold text-foreground">Live Activity</h2>
                  {activity.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Activity will show up here as Eka works on your content.</p>
                  ) : (
                    <div className="space-y-2">
                      {activity.slice(0, 5).map(a => (
                        <div key={a.id} className="flex items-start gap-2 text-sm">
                          <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                          <div>
                            <p className="text-foreground/80">
                              {a.entity_type === 'video' ? `"${a.details.title || 'Video'}" status updated` : `${a.entity_type} ${a.action}`}
                            </p>
                            <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="glass-card p-5 space-y-3">
                  <h2 className="font-display font-semibold text-foreground">Upcoming Deliverables</h2>
                  {videos.filter(v => v.date_planned && !['live', 'approved'].includes(v.status)).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No upcoming deliverables scheduled.</p>
                  ) : (
                    <div className="space-y-2">
                      {videos.filter(v => v.date_planned && !['live', 'approved'].includes(v.status)).slice(0, 5).map(v => (
                        <div key={v.id} className="flex items-center justify-between">
                          <p className="text-sm text-foreground truncate max-w-[60%]">{v.title}</p>
                          <span className="text-xs text-muted-foreground">
                            {v.date_planned && new Date(v.date_planned).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* VIDEOS SECTION */}
          {section === 'videos' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-display font-bold gradient-text">Your Videos</h1>
                <p className="text-muted-foreground mt-1">{videos.length} videos total</p>
              </div>
              {videos.length === 0 ? (
                <div className="glass-card p-16 text-center">
                  <Video size={40} className="mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-muted-foreground">Your videos will appear here as Eka starts production.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {videos.map(video => {
                    const svcType = (client?.service_type || 'full_production') as ClientServiceType;
                    const isEditOnly = svcType === 'editing_only';
                    const statusCfg = VIDEO_STATUSES[video.status as VideoStatus];
                    const clientLabel = getClientLabel(video.status as VideoStatus, svcType);
                    const isReview = video.status === 'client_review';
                    const isLive = video.status === 'live';
                    return (
                      <div key={video.id} className={cn(
                        'glass-card-hover overflow-hidden',
                        isReview && 'ring-2 ring-pink-500/60'
                      )}>
                        {/* Thumbnail */}
                        <div className="aspect-video bg-muted/50 flex items-center justify-center relative">
                          {video.thumbnail_url ? (
                            <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
                          ) : (
                            <Video size={32} className="text-muted-foreground/30" />
                          )}
                          {isReview && (
                            <div className="absolute top-2 right-2 bg-pink-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                              👀 Action needed
                            </div>
                          )}
                        </div>

                        <div className="p-4 space-y-3">
                          <div>
                            <h3 className="font-semibold text-foreground">{video.title}</h3>
                            {statusCfg && (
                              <span className={cn('inline-flex items-center gap-1 text-xs font-medium mt-1', statusCfg.color)}>
                                {statusCfg.emoji} {clientLabel}
                              </span>
                            )}
                          </div>

                          {/* Shoot info for client — hide for editing-only */}
                          {!isEditOnly && (video.status === 'shoot_assigned' || video.status === 'shooting') && video.shoot_date && (
                            <div className="space-y-1 text-xs">
                              {video.status === 'shooting' ? (
                                <p className="text-primary font-medium">🎥 Your video is being filmed today!</p>
                              ) : (
                                <p className="text-foreground">🎬 Your shoot is scheduled for {new Date(video.shoot_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}{video.shoot_start_time ? ` at ${video.shoot_start_time}` : ''}</p>
                              )}
                              {video.camera_op_first_name && (
                                <p className="text-muted-foreground">📸 {video.camera_op_first_name} is your camera operator for this shoot</p>
                              )}
                            </div>
                          )}

                          {/* Script review for client */}
                          {video.status === 'script_client_review' && (
                            <div className="space-y-2 bg-pink-500/10 rounded-lg p-3">
                              <p className="text-xs font-semibold text-pink-400">📄 Script Ready for Your Review</p>
                              <p className="text-xs text-muted-foreground">Review and approve so filming can begin.</p>
                              <div className="flex gap-2">
                                <button onClick={async (e) => {
                                  e.stopPropagation();
                                  // Find linked writing task drive_link
                                  const { data: wt } = await supabase.from('writing_tasks').select('doc_link').eq('video_id', video.id).limit(1).single();
                                  if (wt?.doc_link) window.open(wt.doc_link, '_blank');
                                  else toast({ title: 'Script not uploaded yet', variant: 'destructive' });
                                }} className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground transition-colors">
                                  <Download size={12} /> Download Script
                                </button>
                                <button onClick={async (e) => {
                                  e.stopPropagation();
                                  setApprovingId(video.id);
                                  await supabase.from('videos').update({ status: 'script_approved' }).eq('id', video.id);
                                  await fetchVideos();
                                  setApprovingId(null);
                                  toast({ title: '✅ Script approved!' });
                                }} disabled={approvingId === video.id}
                                  className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-success/20 text-success hover:bg-success/30 transition-colors font-medium">
                                  {approvingId === video.id ? '…' : <><Check size={12} /> Approve Script</>}
                                </button>
                                <button onClick={() => setFeedbackVideo(video)}
                                  className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-pink-500/20 text-pink-400 hover:bg-pink-500/30 transition-colors">
                                  <MessageSquare size={12} /> Request Changes
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Show script download after approval */}
                          {['script_approved','shoot_assigned','shooting','footage_delivered','editing','internal_review','client_review','revisions','approved','ready_to_upload','live'].includes(video.status) && (
                            <button onClick={async (e) => {
                              e.stopPropagation();
                              const { data: wt } = await supabase.from('writing_tasks').select('doc_link').eq('video_id', video.id).limit(1).single();
                              if (wt?.doc_link) window.open(wt.doc_link, '_blank');
                            }} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
                              <Download size={10} /> ✅ Script Approved — View
                            </button>
                          )}

                          {/* Progress bar */}
                          {(() => {
                            const statusOrder = getStatusOrderForClient(svcType);
                            const idx = statusOrder.indexOf(video.status as VideoStatus);
                            const pct = idx >= 0 ? ((idx + 1) / statusOrder.length) * 100 : 5;
                            return (
                              <div className="h-1 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                            );
                          })()}

                          <div className="flex flex-wrap gap-2">
                            {isReview && (
                              <>
                                {video.drive_link && (
                                  <a href={video.drive_link} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground transition-colors">
                                    <Download size={12} /> Download
                                  </a>
                                )}
                                <button
                                  onClick={() => handleApprove(video)}
                                  disabled={approvingId === video.id}
                                  className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-success/20 text-success hover:bg-success/30 transition-colors font-medium"
                                >
                                  {approvingId === video.id ? '…' : <><Check size={12} /> Approve</>}
                                </button>
                                <button
                                  onClick={() => setFeedbackVideo(video)}
                                  className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-pink-500/20 text-pink-400 hover:bg-pink-500/30 transition-colors"
                                >
                                  <MessageSquare size={12} /> Feedback
                                </button>
                              </>
                            )}
                            {isLive && video.live_url && (
                              <a href={video.live_url} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-success/20 text-success hover:bg-success/30 transition-colors">
                                <ExternalLink size={12} /> Watch Now
                              </a>
                            )}
                            {!isReview && (
                              <button
                                onClick={() => setFeedbackVideo(video)}
                                className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground transition-colors"
                              >
                                <MessageSquare size={12} /> Feedback
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* IDEAS SECTION */}
          {section === 'ideas' && client && (
            showIdeaForm ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h1 className="text-3xl font-display font-bold gradient-text">💡 New Idea</h1>
                  <Button variant="outline" onClick={() => setShowIdeaForm(false)}>← Back to Ideas</Button>
                </div>
                <IdeaSubmissionForm clientId={client.id} onSuccess={() => setShowIdeaForm(false)} onCancel={() => setShowIdeaForm(false)} />
              </div>
            ) : (
              <ClientIdeasList clientId={client.id} onNewIdea={() => setShowIdeaForm(true)} />
            )
          )}

          {/* DESIGN DELIVERABLES */}
          {section === 'design' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-display font-bold gradient-text">Design Deliverables</h1>
                <p className="text-muted-foreground mt-1">Thumbnails, graphics, and brand assets created for you</p>
              </div>
              {(designTasks as Array<Record<string, unknown>>).length === 0 ? (
                <div className="glass-card p-16 text-center"><Palette size={40} className="mx-auto text-muted-foreground/40 mb-3" /><p className="text-muted-foreground">No design deliverables yet.</p></div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(designTasks as Array<Record<string, unknown>>).map(task => {
                    const cfg = DESIGN_TASK_STATUSES[task.status as keyof typeof DESIGN_TASK_STATUSES];
                    return (
                      <div key={task.id as string} className="glass-card p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-foreground">{task.title as string}</p>
                          {cfg && <span className={cn('text-xs px-2 py-0.5 rounded-full flex-shrink-0', cfg.bgColor, cfg.color)}>{cfg.emoji} {cfg.clientLabel}</span>}
                        </div>
                        <p className="text-xs text-muted-foreground capitalize">{((task.task_type as string) || '').replace('_', ' ')}</p>
                        {task.drive_link && (
                          <a href={task.drive_link as string} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                            <Download size={10} /> Download File
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* CONTENT & COPY */}
          {section === 'content' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-display font-bold gradient-text">Content & Copy</h1>
                <p className="text-muted-foreground mt-1">Scripts, captions, and written content for your brand</p>
              </div>
              {(writingTasks as Array<Record<string, unknown>>).length === 0 ? (
                <div className="glass-card p-16 text-center"><PenTool size={40} className="mx-auto text-muted-foreground/40 mb-3" /><p className="text-muted-foreground">No content pieces yet.</p></div>
              ) : (
                <div className="space-y-3">
                  {(writingTasks as Array<Record<string, unknown>>).map(task => {
                    const cfg = WRITING_TASK_STATUSES[task.status as keyof typeof WRITING_TASK_STATUSES];
                    return (
                      <div key={task.id as string} className="glass-card p-4 flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-foreground">{task.title as string}</p>
                            <span className="text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded-full capitalize">{((task.task_type as string) || '').replace('_', ' ')}</span>
                          </div>
                          {task.word_count_target && <p className="text-xs text-muted-foreground mt-0.5">{(task.word_count_target as number).toLocaleString()} words</p>}
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          {cfg && <span className={cn('text-xs px-2 py-0.5 rounded-full', cfg.bgColor, cfg.color)}>{cfg.emoji} {cfg.clientLabel}</span>}
                          {task.doc_link && (
                            <a href={task.doc_link as string} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-primary hover:underline">
                              <ExternalLink size={10} /> View Doc
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* MONTHLY REPORT */}
          {section === 'report' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-display font-bold gradient-text">Monthly Report</h1>
                <p className="text-muted-foreground mt-1">{new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })} — Auto-generated summary</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: 'Videos Delivered', value: deliveredThisMonth, desc: `of ${monthlyTarget} target` },
                  { label: 'Currently Live', value: liveVideos.length, desc: 'videos published' },
                  { label: 'In Production', value: inProduction.length, desc: 'being worked on' },
                ].map(stat => (
                  <div key={stat.label} className="glass-card p-5 space-y-1">
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className="text-3xl font-display font-bold text-foreground">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.desc}</p>
                  </div>
                ))}
              </div>
              {monthlyTarget > 0 && (
                <div className="glass-card p-5 space-y-3">
                  <h2 className="font-semibold text-foreground">Monthly Progress</h2>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Delivered this month</span>
                      <span className="font-bold text-foreground">{deliveredThisMonth}/{monthlyTarget}</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                </div>
              )}
              {liveVideos.length > 0 && (
                <div className="glass-card p-5 space-y-3">
                  <h2 className="font-semibold text-foreground">Live Videos</h2>
                  <div className="space-y-2">
                    {liveVideos.map(v => (
                      <div key={v.id} className="flex items-center justify-between">
                        <p className="text-sm text-foreground">{v.title}</p>
                        {v.live_url && (
                          <a href={v.live_url} target="_blank" rel="noopener noreferrer" className="text-xs text-success hover:underline flex items-center gap-1">
                            <ExternalLink size={10} /> Watch
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ACCOUNT */}
          {section === 'account' && (
            <div className="space-y-6 max-w-md">
              <div>
                <h1 className="text-3xl font-display font-bold gradient-text">Account</h1>
                <p className="text-muted-foreground mt-1">Manage your login settings</p>
              </div>
              <div className="glass-card p-6 space-y-4">
                <h2 className="font-semibold text-foreground">Change Password</h2>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm text-muted-foreground">New Password</label>
                    <input type="password" value={passwordForm.newPass} onChange={e => setPasswordForm(f => ({ ...f, newPass: e.target.value }))}
                      placeholder="Minimum 8 characters" minLength={8}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm text-muted-foreground">Confirm Password</label>
                    <input type="password" value={passwordForm.confirm} onChange={e => setPasswordForm(f => ({ ...f, confirm: e.target.value }))}
                      placeholder="Re-enter new password"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground" />
                  </div>
                  <Button type="submit" disabled={savingPwd || !passwordForm.newPass || !passwordForm.confirm} className="w-full gap-2">
                    {savingPwd && <Loader2 size={16} className="animate-spin" />}
                    Update Password
                  </Button>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Feedback Modal */}
      {feedbackVideo && client && (
        <VideoFeedbackModal
          video={{ id: feedbackVideo.id, title: feedbackVideo.title, client_id: client.id }}
          onClose={() => setFeedbackVideo(null)}
        />
      )}

      {/* Floating Share an Idea button */}
      {client && section !== 'ideas' && (
        <button
          onClick={() => { setSection('ideas'); setShowIdeaForm(true); }}
          className="fixed bottom-24 right-6 z-30 flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-full shadow-xl hover:shadow-2xl transition-all text-sm font-semibold"
        >
          <Lightbulb size={18} /> Share an Idea
        </button>
      )}

      {/* Need Help button */}
      <NeedHelpButton />
    </div>
  );
}
