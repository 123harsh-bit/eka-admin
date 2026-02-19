import { useState, useEffect } from 'react';
import { EditorLayout } from '@/components/editor/EditorLayout';
import { supabase } from '@/integrations/supabase/client';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { type VideoStatus } from '@/lib/statusConfig';
import { Video, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface VideoRow { id: string; title: string; status: string; client_name?: string; }

export default function EditorAllVideos() {
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('videos').select('id, title, status, clients(name)').order('created_at', { ascending: false });
      if (data) {
        setVideos((data as unknown[]).map((v: unknown) => {
          const row = v as Record<string, unknown>;
          return { ...(row as unknown as VideoRow), client_name: (row.clients as { name: string } | null)?.name || 'Unknown' };
        }));
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const filtered = videos.filter(v => v.title.toLowerCase().includes(search.toLowerCase()) || v.client_name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <EditorLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold gradient-text">All Videos</h1>
          <p className="text-muted-foreground mt-1">Read-only reference view of all agency videos</p>
        </div>
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search videos…" className="pl-8" />
        </div>
        <div className="glass-card overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-card/80 border-b border-glass-border">
              <tr>
                {['Video', 'Client', 'Status'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? [...Array(6)].map((_, i) => (
                <tr key={i}><td colSpan={3} className="px-4 py-3"><div className="h-7 bg-muted/50 rounded animate-pulse" /></td></tr>
              )) : filtered.length === 0 ? (
                <tr><td colSpan={3} className="px-4 py-12 text-center text-muted-foreground"><Video size={32} className="mx-auto mb-2 opacity-40" />No videos found.</td></tr>
              ) : filtered.map(v => (
                <tr key={v.id} className="border-b border-glass-border/50">
                  <td className="px-4 py-3 font-medium text-foreground">{v.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">{v.client_name}</td>
                  <td className="px-4 py-3"><StatusBadge status={v.status as VideoStatus} type="video" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </EditorLayout>
  );
}
