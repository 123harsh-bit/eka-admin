import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Instagram, Facebook, Youtube, Linkedin, Heart, MessageCircle, Eye, ExternalLink, Search, Send } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PublishHelper } from '@/components/social/PublishHelper';
import { cn } from '@/lib/utils';

interface Post {
  id: string;
  title: string;
  caption: string | null;
  status: string;
  scheduled_at: string | null;
  published_at: string | null;
  platforms: string[];
  media_urls: string[];
  media_type: string;
  platform_urls: Record<string, string>;
  analytics: Record<string, { likes?: number; comments?: number; views?: number; reach?: number }>;
  client_id: string;
  approval_status: string;
  client_approval_status: string | null;
  clients?: { name: string };
  created_by_profile?: { full_name: string };
}

const APPROVAL_COLORS: Record<string, string> = {
  not_submitted: 'bg-muted/40 text-muted-foreground',
  pending_admin: 'bg-amber-500/20 text-amber-400 ring-2 ring-amber-500/40',
  approved: 'bg-success/20 text-success',
  rejected: 'bg-destructive/20 text-destructive',
};

const platformIcon: Record<string, typeof Instagram> = {
  instagram: Instagram, facebook: Facebook, youtube: Youtube, linkedin: Linkedin,
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  scheduled: 'bg-blue-500/20 text-blue-400',
  ready: 'bg-amber-500/20 text-amber-400',
  published: 'bg-success/20 text-success',
  failed: 'bg-destructive/20 text-destructive',
};

export default function AdminSocialPosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [approvalFilter, setApprovalFilter] = useState('');
  const [helperPostId, setHelperPostId] = useState<string | null>(null);

  const refresh = () => {
    setLoading(true);
    supabase.from('scheduled_posts')
      .select('*, clients(name)')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setPosts((data as unknown as Post[]) || []);
        setLoading(false);
      });
  };

  useEffect(() => { refresh(); }, []);

  const filtered = posts.filter(p => {
    const matchSearch = p.title.toLowerCase().includes(search.toLowerCase()) || p.clients?.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || p.status === statusFilter;
    const matchApproval = !approvalFilter || p.approval_status === approvalFilter;
    return matchSearch && matchStatus && matchApproval;
  });

  const pendingCount = posts.filter(p => p.approval_status === 'pending_admin').length;

  const totals = posts.reduce((acc, p) => {
    Object.values(p.analytics || {}).forEach(a => {
      acc.likes += a.likes || 0;
      acc.comments += a.comments || 0;
      acc.views += a.views || 0;
    });
    return acc;
  }, { likes: 0, comments: 0, views: 0 });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-display font-bold gradient-text">Social Media</h1>
            <p className="text-muted-foreground mt-1">Posts created by social executive — review approvals here</p>
          </div>
          {pendingCount > 0 && (
            <button onClick={() => setApprovalFilter('pending_admin')} className="glass-card px-4 py-2 hover:bg-amber-500/10 transition flex items-center gap-2 ring-2 ring-amber-500/40">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-sm font-medium text-amber-400">{pendingCount} awaiting your approval</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-card p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Posts</p>
            <p className="text-3xl font-bold mt-2">{posts.length}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Likes</p>
            <p className="text-3xl font-bold mt-2 text-pink-400">{totals.likes.toLocaleString()}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Comments</p>
            <p className="text-3xl font-bold mt-2 text-blue-400">{totals.comments.toLocaleString()}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Views</p>
            <p className="text-3xl font-bold mt-2 text-amber-400">{totals.views.toLocaleString()}</p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-40">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search posts…" className="pl-8" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="ready">Ready</option>
            <option value="published">Published</option>
            <option value="failed">Failed</option>
          </select>
          <select value={approvalFilter} onChange={e => setApprovalFilter(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">All approvals</option>
            <option value="not_submitted">Not submitted</option>
            <option value="pending_admin">⏳ Pending admin</option>
            <option value="approved">✓ Approved</option>
            <option value="rejected">✗ Rejected</option>
          </select>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <div key={i} className="glass-card h-72 animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-card p-12 text-center text-muted-foreground">
            <Instagram size={32} className="mx-auto mb-2 opacity-40" />
            <p>No posts found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(p => {
              const totals = Object.values(p.analytics || {}).reduce((acc, a) => ({
                likes: acc.likes + (a.likes || 0),
                comments: acc.comments + (a.comments || 0),
                views: acc.views + (a.views || 0),
              }), { likes: 0, comments: 0, views: 0 });
              const firstMedia = p.media_urls?.[0];
              const isVideo = firstMedia?.match(/\.(mp4|mov|webm)/i);
              return (
                <div key={p.id} className="glass-card overflow-hidden group">
                  {firstMedia ? (
                    <div className="aspect-video bg-card relative">
                      {isVideo ? (
                        <video src={firstMedia} controls className="w-full h-full object-cover" />
                      ) : (
                        <img src={firstMedia} alt={p.title} className="w-full h-full object-cover" />
                      )}
                      <span className={cn('absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-medium', STATUS_COLORS[p.status])}>
                        {p.status}
                      </span>
                      <span className={cn('absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-medium', APPROVAL_COLORS[p.approval_status] || APPROVAL_COLORS.not_submitted)}>
                        {p.approval_status === 'pending_admin' ? '⏳ pending' : p.approval_status === 'approved' ? '✓ approved' : p.approval_status === 'rejected' ? '✗ rejected' : 'no approval'}
                      </span>
                    </div>
                  ) : (
                    <div className="aspect-video bg-card flex items-center justify-center text-muted-foreground/40">
                      <Instagram size={28} />
                    </div>
                  )}
                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-sm text-foreground truncate flex-1">{p.title}</h3>
                      <div className="flex gap-1">
                        {p.platforms.map(plat => {
                          const Icon = platformIcon[plat];
                          return Icon ? <Icon key={plat} size={12} className="text-muted-foreground" /> : null;
                        })}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{p.clients?.name || 'Unknown client'}</p>
                    {p.caption && <p className="text-xs text-muted-foreground line-clamp-2">{p.caption}</p>}

                    <div className="flex items-center gap-4 pt-2 border-t border-glass-border text-xs">
                      <span className="flex items-center gap-1 text-pink-400"><Heart size={11} /> {totals.likes}</span>
                      <span className="flex items-center gap-1 text-blue-400"><MessageCircle size={11} /> {totals.comments}</span>
                      <span className="flex items-center gap-1 text-amber-400"><Eye size={11} /> {totals.views}</span>
                    </div>

                    {Object.keys(p.platform_urls || {}).length > 0 && (
                      <div className="flex gap-2 pt-1 flex-wrap">
                        {Object.entries(p.platform_urls).map(([plat, url]) => (
                          <a key={plat} href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-[11px] flex items-center gap-1">
                            <ExternalLink size={10} /> {plat}
                          </a>
                        ))}
                      </div>
                    )}

                    <Button size="sm" variant="secondary" className="w-full gap-1.5 h-8 text-xs mt-2" onClick={() => setHelperPostId(p.id)}>
                      <Send size={11} /> {p.status === 'published' ? 'Update analytics' : 'Publish helper'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <PublishHelper postId={helperPostId} open={!!helperPostId} onOpenChange={o => !o && setHelperPostId(null)} onPublished={refresh} />
      </div>
    </AdminLayout>
  );
}
