import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow, format } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  Lightbulb, Mic, X, ChevronRight, Check, Film, MessageSquare, XCircle,
  Loader2, ImagePlus, ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Idea {
  id: string; client_id: string; submitted_by: string;
  title: string; description: string | null;
  voice_note_url: string | null; voice_duration_seconds: number | null;
  photo_urls: string[]; status: string; admin_response: string | null;
  converted_video_id: string | null; created_at: string; updated_at: string;
  client_name?: string; client_logo?: string | null; submitter_name?: string;
}

const STATUS_CONFIG: Record<string, { label: string; emoji: string; color: string; bgColor: string }> = {
  submitted: { label: 'New', emoji: '🆕', color: 'text-amber-400', bgColor: 'bg-amber-500/20' },
  under_review: { label: 'Under Review', emoji: '🔍', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  approved: { label: 'Approved', emoji: '✅', color: 'text-success', bgColor: 'bg-success/20' },
  converted_to_project: { label: 'Converted', emoji: '🎬', color: 'text-primary', bgColor: 'bg-primary/20' },
  declined: { label: 'Declined', emoji: '❌', color: 'text-destructive', bgColor: 'bg-destructive/20' },
};

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'submitted', label: 'New' },
  { id: 'under_review', label: 'Under Review' },
  { id: 'approved', label: 'Approved' },
  { id: 'converted_to_project', label: 'Converted' },
  { id: 'declined', label: 'Declined' },
];

export default function AdminClientIdeas() {
  const { toast } = useToast();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [responseText, setResponseText] = useState('');
  const [converting, setConverting] = useState(false);
  const [convertForm, setConvertForm] = useState<{ title: string; datePlanned: string } | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchIdeas = async () => {
    const { data } = await supabase.from('client_ideas' as any).select('*').order('created_at', { ascending: false });
    if (!data) { setLoading(false); return; }

    // Resolve client names and submitter names
    const clientIds = [...new Set((data as any[]).map((d: any) => d.client_id))];
    const submitterIds = [...new Set((data as any[]).map((d: any) => d.submitted_by))];

    const [clientsRes, profilesRes] = await Promise.all([
      supabase.from('clients').select('id, name, logo_url').in('id', clientIds),
      supabase.from('profiles').select('id, full_name').in('id', submitterIds),
    ]);

    const clientMap: Record<string, { name: string; logo_url: string | null }> = {};
    clientsRes.data?.forEach((c: any) => { clientMap[c.id] = { name: c.name, logo_url: c.logo_url }; });
    const profileMap: Record<string, string> = {};
    profilesRes.data?.forEach((p: any) => { profileMap[p.id] = p.full_name; });

    setIdeas((data as any[]).map((d: any) => ({
      ...d,
      photo_urls: Array.isArray(d.photo_urls) ? d.photo_urls : [],
      client_name: clientMap[d.client_id]?.name || 'Unknown',
      client_logo: clientMap[d.client_id]?.logo_url || null,
      submitter_name: profileMap[d.submitted_by] || 'Unknown',
    })));
    setLoading(false);
  };

  useEffect(() => {
    fetchIdeas();
    const channel = supabase
      .channel('admin-ideas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'client_ideas' }, fetchIdeas)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const filtered = tab === 'all' ? ideas : ideas.filter(i => i.status === tab);
  const newCount = ideas.filter(i => i.status === 'submitted').length;
  const convertedCount = ideas.filter(i => i.status === 'converted_to_project').length;

  const updateIdea = async (id: string, updates: Record<string, any>, notifMsg?: string, notifClientId?: string) => {
    setActionLoading(id);
    await supabase.from('client_ideas' as any).update(updates as any).eq('id', id);
    if (notifMsg && notifClientId) {
      // Find client user_id
      const { data: client } = await supabase.from('clients').select('user_id').eq('id', notifClientId).single();
      if (client?.user_id) {
        await supabase.from('notifications').insert({
          recipient_id: client.user_id, type: 'idea', message: notifMsg, related_client_id: notifClientId,
        });
      }
    }
    await fetchIdeas();
    setActionLoading(null);
    if (selectedIdea?.id === id) {
      setSelectedIdea(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const handleApprove = async (idea: Idea) => {
    await updateIdea(idea.id, { status: 'approved' },
      `💡 Great news! We love your idea "${idea.title}" and we're planning to move forward with it.`,
      idea.client_id);
    toast({ title: 'Idea approved!' });
  };

  const handleConvert = async (idea: Idea) => {
    if (!convertForm) {
      setConvertForm({ title: idea.title, datePlanned: '' });
      return;
    }
    setConverting(true);
    // Create video
    const { data: video, error } = await supabase.from('videos').insert({
      title: convertForm.title,
      client_id: idea.client_id,
      status: 'idea',
      date_planned: convertForm.datePlanned || null,
      description: idea.description,
    }).select('id').single();
    if (error || !video) {
      toast({ title: 'Failed to create video', variant: 'destructive' });
      setConverting(false);
      return;
    }
    await updateIdea(idea.id, { status: 'converted_to_project', converted_video_id: video.id },
      `🎬 Your idea "${idea.title}" has been added to our production pipeline! You can track its progress in your Videos section.`,
      idea.client_id);
    setConvertForm(null);
    setConverting(false);
    toast({ title: 'Video project created!' });
  };

  const handleRequestDetails = async (idea: Idea) => {
    if (!responseText.trim()) return;
    await updateIdea(idea.id, { status: 'under_review', admin_response: responseText.trim() },
      `We need a bit more detail about your idea "${idea.title}". Check your Ideas section for our message.`,
      idea.client_id);
    setResponseText('');
    toast({ title: 'Message sent to client' });
  };

  const handleDecline = async (idea: Idea) => {
    if (!responseText.trim()) return;
    await updateIdea(idea.id, { status: 'declined', admin_response: responseText.trim() },
      `Thank you for sharing your idea "${idea.title}". We've reviewed it and have a note for you — check your Ideas section.`,
      idea.client_id);
    setResponseText('');
    toast({ title: 'Idea declined' });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold gradient-text">💡 Client Ideas</h1>
          <p className="text-muted-foreground mt-1">
            {newCount} new idea{newCount !== 1 ? 's' : ''} · {ideas.length} total · {convertedCount} converted to projects
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 flex-wrap">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                tab === t.id ? 'bg-primary text-primary-foreground' : 'bg-muted/30 text-muted-foreground hover:bg-muted/50')}>
              {t.label}
              {t.id === 'submitted' && newCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs">{newCount}</span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="glass-card p-16 text-center">
            <Lightbulb size={40} className="mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">No ideas in this category</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(idea => {
              const cfg = STATUS_CONFIG[idea.status] || STATUS_CONFIG.submitted;
              return (
                <div key={idea.id}
                  onClick={() => { setSelectedIdea(idea); setResponseText(''); setConvertForm(null); }}
                  className="glass-card-hover p-5 cursor-pointer flex items-center gap-4"
                >
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                    {idea.client_logo ? <img src={idea.client_logo} alt="" className="h-10 w-10 rounded-full object-cover" /> : (idea.client_name?.[0] || '?')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-foreground">{idea.title}</h3>
                      <span className={cn('text-xs px-2 py-0.5 rounded-full', cfg.bgColor, cfg.color)}>{cfg.emoji} {cfg.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {idea.client_name} · {formatDistanceToNow(new Date(idea.created_at), { addSuffix: true })}
                    </p>
                    {idea.description && <p className="text-sm text-muted-foreground/70 line-clamp-1 mt-1">{idea.description}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {idea.voice_note_url && <span className="text-xs">🎙️</span>}
                    {idea.photo_urls.length > 0 && <span className="text-xs">🖼️</span>}
                    <ChevronRight size={16} className="text-muted-foreground" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Panel */}
      {selectedIdea && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedIdea(null)} />
          <div className="relative w-full max-w-xl bg-sidebar border-l border-glass-border overflow-y-auto animate-in slide-in-from-right">
            <div className="sticky top-0 bg-sidebar/95 backdrop-blur-sm z-10 p-6 border-b border-glass-border flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                  {selectedIdea.client_logo ? <img src={selectedIdea.client_logo} alt="" className="h-10 w-10 rounded-full object-cover" /> : <span className="text-sm font-bold text-primary">{selectedIdea.client_name?.[0]}</span>}
                </div>
                <div>
                  <p className="font-semibold text-foreground">{selectedIdea.client_name}</p>
                  <p className="text-xs text-muted-foreground">by {selectedIdea.submitter_name} · {format(new Date(selectedIdea.created_at), 'MMM d, yyyy h:mm a')}</p>
                </div>
              </div>
              <button onClick={() => setSelectedIdea(null)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h2 className="text-xl font-display font-bold text-foreground">{selectedIdea.title}</h2>
                {(() => { const cfg = STATUS_CONFIG[selectedIdea.status]; return cfg ? <span className={cn('inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full mt-2', cfg.bgColor, cfg.color)}>{cfg.emoji} {cfg.label}</span> : null; })()}
              </div>

              {selectedIdea.description && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</label>
                  <p className="text-sm text-foreground/80 mt-1.5 whitespace-pre-wrap leading-relaxed">{selectedIdea.description}</p>
                </div>
              )}

              {selectedIdea.voice_note_url && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Voice Note</label>
                  <div className="mt-1.5 p-3 bg-muted/20 rounded-xl flex items-center gap-3">
                    <Mic size={16} className="text-primary flex-shrink-0" />
                    <audio src={selectedIdea.voice_note_url} controls className="w-full h-10" />
                  </div>
                </div>
              )}

              {selectedIdea.photo_urls.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Reference Photos</label>
                  <div className="flex gap-3 flex-wrap mt-1.5">
                    {selectedIdea.photo_urls.map((url, idx) => (
                      <img key={idx} src={url} alt={`Ref ${idx + 1}`}
                        className="h-28 w-28 rounded-lg object-cover border border-border cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setLightboxUrl(url)} />
                    ))}
                  </div>
                </div>
              )}

              {selectedIdea.admin_response && (
                <div className="border-l-4 border-primary pl-4 py-2 bg-primary/5 rounded-r-lg">
                  <p className="text-xs font-medium text-primary mb-1">Your Response:</p>
                  <p className="text-sm text-foreground/80">{selectedIdea.admin_response}</p>
                </div>
              )}

              {/* Response textarea */}
              {!['converted_to_project'].includes(selectedIdea.status) && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Reply to Client (optional)</label>
                  <textarea value={responseText} onChange={e => setResponseText(e.target.value)}
                    placeholder="Type a message for the client..."
                    rows={3}
                    className="mt-1.5 flex w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:border-primary outline-none" />
                </div>
              )}

              {/* Convert Form */}
              {convertForm && (
                <div className="glass-card p-4 space-y-3">
                  <h3 className="font-semibold text-foreground text-sm">Create Video Project</h3>
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Video Title</label>
                    <input type="text" value={convertForm.title} onChange={e => setConvertForm(f => f ? { ...f, title: e.target.value } : null)}
                      className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Planned Date (optional)</label>
                    <input type="date" value={convertForm.datePlanned} onChange={e => setConvertForm(f => f ? { ...f, datePlanned: e.target.value } : null)}
                      className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground" />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => handleConvert(selectedIdea)} disabled={converting || !convertForm.title.trim()} className="gap-2 flex-1">
                      {converting ? <Loader2 size={14} className="animate-spin" /> : <Film size={14} />} Create Project
                    </Button>
                    <Button variant="outline" onClick={() => setConvertForm(null)}>Cancel</Button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {!['converted_to_project', 'declined'].includes(selectedIdea.status) && (
                <div className="space-y-2 pt-2">
                  {selectedIdea.status !== 'approved' && (
                    <Button onClick={() => handleApprove(selectedIdea)} disabled={actionLoading === selectedIdea.id}
                      className="w-full gap-2 bg-success hover:bg-success/90 text-success-foreground">
                      <Check size={16} /> Approve Idea
                    </Button>
                  )}
                  <Button onClick={() => handleConvert(selectedIdea)} disabled={actionLoading === selectedIdea.id || !!convertForm}
                    className="w-full gap-2 bg-gradient-to-r from-primary to-primary/80">
                    <Film size={16} /> Convert to Video Project
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => handleRequestDetails(selectedIdea)}
                      disabled={!responseText.trim() || actionLoading === selectedIdea.id} className="flex-1 gap-2">
                      <MessageSquare size={14} /> Request More Details
                    </Button>
                    <Button variant="outline" onClick={() => handleDecline(selectedIdea)}
                      disabled={!responseText.trim() || actionLoading === selectedIdea.id}
                      className="flex-1 gap-2 text-destructive hover:text-destructive">
                      <XCircle size={14} /> Decline
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setLightboxUrl(null)}>
          <button className="absolute top-4 right-4 text-white/80 hover:text-white"><X size={24} /></button>
          <img src={lightboxUrl} alt="Full size" className="max-w-full max-h-[90vh] rounded-lg object-contain" />
        </div>
      )}
    </AdminLayout>
  );
}
