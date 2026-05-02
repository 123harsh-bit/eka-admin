import { useState, useEffect } from 'react';
import { SocialLayout } from '@/components/social/SocialLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Calendar, Clock, CheckCircle2, AlertCircle, Instagram, Facebook, Youtube, Linkedin, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { PublishHelper } from '@/components/social/PublishHelper';

interface Post {
  id: string;
  title: string;
  status: string;
  scheduled_at: string | null;
  platforms: string[];
  client_id: string;
  analytics: Record<string, { likes?: number; comments?: number; views?: number }>;
}

const platformIcon: Record<string, typeof Instagram> = {
  instagram: Instagram,
  facebook: Facebook,
  youtube: Youtube,
  linkedin: Linkedin,
};

export default function SocialDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [helperPostId, setHelperPostId] = useState<string | null>(null);

  const refresh = async () => {
    const { data } = await supabase
      .from('scheduled_posts')
      .select('id, title, status, scheduled_at, platforms, client_id, analytics')
      .order('scheduled_at', { ascending: true, nullsFirst: false })
      .limit(100);
    setPosts((data as unknown as Post[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    refresh();
  }, [user]);

  const stats = {
    draft: posts.filter(p => p.status === 'draft').length,
    scheduled: posts.filter(p => p.status === 'scheduled').length,
    ready: posts.filter(p => p.status === 'ready').length,
    published: posts.filter(p => p.status === 'published').length,
  };

  const upcoming = posts.filter(p => p.status === 'scheduled' || p.status === 'ready').slice(0, 8);

  return (
    <SocialLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold gradient-text">Social Media</h1>
            <p className="text-muted-foreground mt-1">Schedule and publish across all platforms</p>
          </div>
          <Button onClick={() => navigate('/social/compose')} className="gap-2">
            <Calendar size={16} /> New Post
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Drafts', value: stats.draft, icon: AlertCircle, color: 'text-muted-foreground' },
            { label: 'Scheduled', value: stats.scheduled, icon: Clock, color: 'text-blue-400' },
            { label: 'Ready to Publish', value: stats.ready, icon: CheckCircle2, color: 'text-amber-400' },
            { label: 'Published', value: stats.published, icon: CheckCircle2, color: 'text-success' },
          ].map(s => (
            <div key={s.label} className="glass-card p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</p>
                <s.icon size={14} className={s.color} />
              </div>
              <p className={`text-3xl font-bold mt-2 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="glass-card p-5">
          <h2 className="font-semibold text-foreground mb-4">Upcoming Posts</h2>
          {loading ? (
            <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-muted/30 rounded animate-pulse" />)}</div>
          ) : upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No scheduled posts. <button onClick={() => navigate('/social/compose')} className="text-primary hover:underline">Create one</button></p>
          ) : (
            <div className="space-y-2">
              {upcoming.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-card/50 hover:bg-card transition-colors cursor-pointer" onClick={() => navigate(`/social/compose?id=${p.id}`)}>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">{p.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.scheduled_at ? new Date(p.scheduled_at).toLocaleString() : 'No date set'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {(p.platforms || []).map((plat: string) => {
                      const Icon = platformIcon[plat];
                      return Icon ? <Icon key={plat} size={14} className="text-muted-foreground" /> : null;
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </SocialLayout>
  );
}
