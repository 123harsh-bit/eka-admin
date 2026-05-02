import { useEffect, useState } from 'react';
import { SocialLayout } from '@/components/social/SocialLayout';
import { supabase } from '@/integrations/supabase/client';
import { Instagram, Facebook, Youtube, Linkedin, Heart, MessageCircle, Eye, TrendingUp, Info } from 'lucide-react';

interface Post {
  id: string;
  title: string;
  platforms: string[];
  platform_urls: Record<string, string>;
  analytics: Record<string, { likes?: number; comments?: number; views?: number; reach?: number }>;
  published_at: string | null;
}

const platformIcon: Record<string, typeof Instagram> = {
  instagram: Instagram, facebook: Facebook, youtube: Youtube, linkedin: Linkedin,
};

export default function SocialAnalytics() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('scheduled_posts')
      .select('id, title, platforms, platform_urls, analytics, published_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .then(({ data }) => {
        setPosts((data as unknown as Post[]) || []);
        setLoading(false);
      });
  }, []);

  const totals = posts.reduce((acc, p) => {
    Object.values(p.analytics || {}).forEach(a => {
      acc.likes += a.likes || 0;
      acc.comments += a.comments || 0;
      acc.views += a.views || 0;
    });
    return acc;
  }, { likes: 0, comments: 0, views: 0 });

  return (
    <SocialLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold gradient-text">Analytics</h1>
          <p className="text-muted-foreground mt-1">Performance across all platforms</p>
        </div>

        <div className="glass-card p-4 flex items-start gap-3 border-amber-500/30 bg-amber-500/5">
          <Info size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-amber-400 font-medium">Manual analytics mode</p>
            <p className="text-muted-foreground text-xs mt-1">Enter likes, comments, views and reach via the Publish Helper on each post. Native API auto-sync (Meta, YouTube, LinkedIn) ships in Phase B.2 once OAuth approval is complete.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total Likes', value: totals.likes, icon: Heart, color: 'text-pink-400' },
            { label: 'Total Comments', value: totals.comments, icon: MessageCircle, color: 'text-blue-400' },
            { label: 'Total Views', value: totals.views, icon: Eye, color: 'text-amber-400' },
          ].map(s => (
            <div key={s.label} className="glass-card p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</p>
                <s.icon size={16} className={s.color} />
              </div>
              <p className={`text-3xl font-bold ${s.color}`}>{s.value.toLocaleString()}</p>
            </div>
          ))}
        </div>

        <div className="glass-card overflow-hidden">
          <div className="p-5 border-b border-glass-border">
            <h2 className="font-semibold text-foreground">Published Posts</h2>
          </div>
          {loading ? (
            <div className="p-5 space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-muted/30 rounded animate-pulse" />)}</div>
          ) : posts.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <TrendingUp size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">No published posts yet.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-card/80">
                <tr>
                  {['Post', 'Platforms', 'Likes', 'Comments', 'Views', 'Published'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {posts.map(p => {
                  const totals = Object.values(p.analytics || {}).reduce((acc, a) => ({
                    likes: acc.likes + (a.likes || 0),
                    comments: acc.comments + (a.comments || 0),
                    views: acc.views + (a.views || 0),
                  }), { likes: 0, comments: 0, views: 0 });
                  return (
                    <tr key={p.id} className="border-b border-glass-border/50">
                      <td className="px-4 py-3 font-medium text-foreground">{p.title}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          {p.platforms.map(plat => {
                            const Icon = platformIcon[plat];
                            return Icon ? <Icon key={plat} size={14} className="text-muted-foreground" /> : null;
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{totals.likes.toLocaleString()}</td>
                      <td className="px-4 py-3 text-muted-foreground">{totals.comments.toLocaleString()}</td>
                      <td className="px-4 py-3 text-muted-foreground">{totals.views.toLocaleString()}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{p.published_at ? new Date(p.published_at).toLocaleDateString() : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </SocialLayout>
  );
}
