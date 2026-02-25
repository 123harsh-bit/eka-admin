import { useState, useEffect } from 'react';
import { CameraLayout } from '@/components/camera/CameraLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ExternalLink, FolderOpen } from 'lucide-react';

interface FootageRow {
  id: string; title: string; client_name: string;
  shoot_date: string | null; footage_uploaded_at: string | null;
  raw_footage_link: string | null;
}

export default function CameraFootage() {
  const { user } = useAuth();
  const [items, setItems] = useState<FootageRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('videos')
        .select('id, title, shoot_date, footage_uploaded_at, raw_footage_link, clients(name)')
        .eq('assigned_camera_operator', user.id)
        .not('raw_footage_link', 'is', null)
        .order('footage_uploaded_at', { ascending: false });
      if (data) {
        setItems((data as any[]).map(v => ({
          ...v, client_name: v.clients?.name || 'Unknown',
        })));
      }
      setLoading(false);
    })();
  }, [user]);

  return (
    <CameraLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold gradient-text">Footage Uploads</h1>
          <p className="text-muted-foreground mt-1">All uploaded raw footage</p>
        </div>
        <div className="glass-card overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-card/90 border-b border-glass-border">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Video</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Client</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Shoot Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Uploaded</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Link</th>
              </tr>
            </thead>
            <tbody>
              {loading ? [...Array(4)].map((_, i) => (
                <tr key={i}><td colSpan={5} className="px-4 py-3"><div className="h-8 bg-muted/50 rounded animate-pulse" /></td></tr>
              )) : items.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                  <FolderOpen size={32} className="mx-auto mb-2 opacity-40" />No footage uploaded yet.
                </td></tr>
              ) : items.map(item => (
                <tr key={item.id} className="border-b border-glass-border/50 hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium text-foreground">{item.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">{item.client_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{item.shoot_date ? new Date(item.shoot_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{item.footage_uploaded_at ? new Date(item.footage_uploaded_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}</td>
                  <td className="px-4 py-3">
                    {item.raw_footage_link ? (
                      <a href={item.raw_footage_link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1 text-xs">
                        <ExternalLink size={12} /> Open Footage →
                      </a>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </CameraLayout>
  );
}
