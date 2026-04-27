import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';
import { supabase } from '@/integrations/supabase/client';
import { Search, Users, Video, FileText, Palette, Camera, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type Result = {
  id: string;
  type: 'client' | 'video' | 'writing' | 'design' | 'shoot';
  title: string;
  subtitle?: string;
  href: string;
};

const ICONS = {
  client: Users,
  video: Video,
  writing: FileText,
  design: Palette,
  shoot: Camera,
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
    }
  }, [open]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    let cancel = false;
    setLoading(true);
    const search = async () => {
      const q = `%${query}%`;
      const [clients, videos, writing, design] = await Promise.all([
        supabase.from('clients').select('id, name, industry').ilike('name', q).limit(5),
        supabase.from('videos').select('id, title, status').ilike('title', q).limit(5),
        supabase.from('writing_tasks').select('id, title, status').ilike('title', q).limit(5),
        supabase.from('design_tasks').select('id, title, status').ilike('title', q).limit(5),
      ]);

      if (cancel) return;
      const combined: Result[] = [
        ...(clients.data || []).map(c => ({
          id: c.id, type: 'client' as const, title: c.name,
          subtitle: c.industry || 'Client', href: '/admin/clients',
        })),
        ...(videos.data || []).map(v => ({
          id: v.id, type: 'video' as const, title: v.title,
          subtitle: v.status, href: '/admin/videos',
        })),
        ...(writing.data || []).map(w => ({
          id: w.id, type: 'writing' as const, title: w.title,
          subtitle: w.status, href: '/admin/writing-tasks',
        })),
        ...(design.data || []).map(d => ({
          id: d.id, type: 'design' as const, title: d.title,
          subtitle: d.status, href: '/admin/design-tasks',
        })),
      ];
      setResults(combined);
      setLoading(false);
    };
    const t = setTimeout(search, 200);
    return () => { cancel = true; clearTimeout(t); };
  }, [query]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 bg-black/70 backdrop-blur-sm fade-in"
      onClick={() => setOpen(false)}>
      <div onClick={e => e.stopPropagation()}
        className="w-full max-w-xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        <Command shouldFilter={false} className="bg-transparent">
          <div className="flex items-center gap-3 px-4 border-b border-border">
            <Search size={16} className="text-muted-foreground" />
            <Command.Input
              autoFocus
              value={query}
              onValueChange={setQuery}
              placeholder="Search clients, videos, tasks…"
              className="flex-1 h-12 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
            <kbd className="hidden sm:inline-flex h-5 px-1.5 items-center text-[10px] font-medium rounded bg-muted text-muted-foreground border border-border">ESC</kbd>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X size={14} />
            </button>
          </div>
          <Command.List className="max-h-[60vh] overflow-y-auto p-2">
            {loading && <div className="p-6 text-center text-xs text-muted-foreground">Searching…</div>}
            {!loading && query && results.length === 0 && (
              <Command.Empty className="p-6 text-center text-xs text-muted-foreground">
                No results for "{query}"
              </Command.Empty>
            )}
            {!query && (
              <div className="p-6 text-center text-xs text-muted-foreground">
                Type to search across clients, videos, writing & design tasks.
                <div className="mt-3 flex items-center justify-center gap-2">
                  <kbd className="px-1.5 py-0.5 text-[10px] rounded bg-muted border border-border">⌘K</kbd>
                  <span>to toggle</span>
                </div>
              </div>
            )}
            {results.map(r => {
              const Icon = ICONS[r.type];
              return (
                <Command.Item
                  key={`${r.type}-${r.id}`}
                  value={`${r.type}-${r.id}-${r.title}`}
                  onSelect={() => { navigate(r.href); setOpen(false); }}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm',
                    'aria-selected:bg-primary/10 aria-selected:text-primary'
                  )}
                >
                  <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <Icon size={14} className="text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{r.title}</p>
                    {r.subtitle && <p className="text-[11px] text-muted-foreground truncate capitalize">{r.subtitle.replace(/_/g, ' ')}</p>}
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{r.type}</span>
                </Command.Item>
              );
            })}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
