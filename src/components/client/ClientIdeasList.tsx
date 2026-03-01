import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { Lightbulb, Mic, ExternalLink, ChevronDown, ChevronUp, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Idea {
  id: string; title: string; description: string | null;
  voice_note_url: string | null; voice_duration_seconds: number | null;
  photo_urls: string[]; status: string; admin_response: string | null;
  converted_video_id: string | null; created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; emoji: string; color: string; bgColor: string; subtitle: string }> = {
  submitted: { label: 'Submitted', emoji: '🟡', color: 'text-amber-400', bgColor: 'bg-amber-500/20', subtitle: "We'll review your idea soon" },
  under_review: { label: 'Under Review', emoji: '🟡', color: 'text-amber-400', bgColor: 'bg-amber-500/20', subtitle: "We're reviewing your idea" },
  approved: { label: 'Approved', emoji: '🟢', color: 'text-success', bgColor: 'bg-success/20', subtitle: "Great idea! We're planning this" },
  converted_to_project: { label: 'Added to Projects', emoji: '🔵', color: 'text-primary', bgColor: 'bg-primary/20', subtitle: 'This is now a video project' },
  declined: { label: 'Not Moving Forward', emoji: '🔴', color: 'text-destructive', bgColor: 'bg-destructive/20', subtitle: "We've reviewed this idea" },
};

interface ClientIdeasListProps {
  clientId: string;
  onNewIdea: () => void;
}

export function ClientIdeasList({ clientId, onNewIdea }: ClientIdeasListProps) {
  const { user } = useAuth();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const fetchIdeas = async () => {
    const { data } = await supabase.from('client_ideas' as any).select('*').eq('client_id', clientId).order('created_at', { ascending: false });
    if (data) setIdeas((data as any[]).map(d => ({ ...d, photo_urls: Array.isArray(d.photo_urls) ? d.photo_urls : [] })));
    setLoading(false);
  };

  useEffect(() => {
    fetchIdeas();
    const channel = supabase
      .channel('client-ideas-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'client_ideas', filter: `client_id=eq.${clientId}` }, fetchIdeas)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [clientId]);

  if (loading) return <div className="flex items-center justify-center py-12"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold gradient-text">💡 My Ideas</h1>
          <p className="text-muted-foreground mt-1">{ideas.length} idea{ideas.length !== 1 ? 's' : ''} submitted</p>
        </div>
        <button onClick={onNewIdea}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-xl text-sm font-medium shadow-lg hover:shadow-xl transition-all">
          <Lightbulb size={16} /> New Idea
        </button>
      </div>

      {ideas.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <Lightbulb size={40} className="mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground font-medium">No ideas submitted yet</p>
          <p className="text-sm text-muted-foreground/70 mt-1">Share your next big idea with us!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {ideas.map(idea => {
            const cfg = STATUS_CONFIG[idea.status] || STATUS_CONFIG.submitted;
            const expanded = expandedId === idea.id;
            return (
              <div key={idea.id} className="glass-card overflow-hidden">
                <button
                  onClick={() => setExpandedId(expanded ? null : idea.id)}
                  className="w-full p-5 flex items-start gap-4 text-left"
                >
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-semibold text-foreground">{idea.title}</h3>
                      <span className={cn('inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full', cfg.bgColor, cfg.color)}>
                        {cfg.emoji} {cfg.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Submitted {formatDistanceToNow(new Date(idea.created_at), { addSuffix: true })}
                    </p>
                    {idea.description && !expanded && (
                      <p className="text-sm text-muted-foreground/80 line-clamp-2">{idea.description}</p>
                    )}
                    <div className="flex items-center gap-2">
                      {idea.voice_note_url && <span className="text-xs text-muted-foreground">🎙️ Voice note</span>}
                      {idea.photo_urls.length > 0 && <span className="text-xs text-muted-foreground">🖼️ {idea.photo_urls.length} photo{idea.photo_urls.length > 1 ? 's' : ''}</span>}
                    </div>
                  </div>
                  {expanded ? <ChevronUp size={18} className="text-muted-foreground mt-1" /> : <ChevronDown size={18} className="text-muted-foreground mt-1" />}
                </button>

                {expanded && (
                  <div className="px-5 pb-5 space-y-4 border-t border-border pt-4">
                    {idea.description && (
                      <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{idea.description}</p>
                    )}
                    {idea.voice_note_url && (
                      <div className="p-3 bg-muted/20 rounded-xl flex items-center gap-3">
                        <Mic size={16} className="text-primary flex-shrink-0" />
                        <audio src={idea.voice_note_url} controls className="w-full h-10" />
                      </div>
                    )}
                    {idea.photo_urls.length > 0 && (
                      <div className="flex gap-3 flex-wrap">
                        {idea.photo_urls.map((url, idx) => (
                          <img key={idx} src={url} alt={`Reference ${idx + 1}`}
                            className="h-24 w-24 rounded-lg object-cover border border-border cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => setLightboxUrl(url)} />
                        ))}
                      </div>
                    )}
                    {idea.admin_response && (
                      <div className="border-l-4 border-primary pl-4 py-2 bg-primary/5 rounded-r-lg">
                        <p className="text-xs font-medium text-primary mb-1">Response from Eka:</p>
                        <p className="text-sm text-foreground/80">{idea.admin_response}</p>
                      </div>
                    )}
                    {idea.status === 'converted_to_project' && idea.converted_video_id && (
                      <button onClick={() => {/* navigate to videos section */}}
                        className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium">
                        <ExternalLink size={14} /> View Project →
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setLightboxUrl(null)}>
          <button className="absolute top-4 right-4 text-white/80 hover:text-white" onClick={() => setLightboxUrl(null)}>
            <X size={24} />
          </button>
          <img src={lightboxUrl} alt="Full size" className="max-w-full max-h-[90vh] rounded-lg object-contain" />
        </div>
      )}
    </div>
  );
}
