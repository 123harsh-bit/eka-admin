import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Search, Phone, Mail, User, Building2, Palette } from 'lucide-react';

interface HubClient {
  id: string;
  name: string;
  logo_url: string | null;
  project_title: string | null;
  industry: string | null;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  brand_colors: unknown;
  brand_fonts: unknown;
  service_type: string | null;
}

export default function ClientsHub() {
  const [clients, setClients] = useState<HubClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      const { data } = await (supabase.rpc as any)('team_list_clients');
      setClients((data as HubClient[]) || []);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(c =>
      [c.name, c.project_title, c.industry, c.contact_person].some(v => v?.toLowerCase().includes(q))
    );
  }, [clients, search]);

  const colorsOf = (c: HubClient): string[] => {
    const raw = c.brand_colors as any;
    if (Array.isArray(raw)) return raw.filter(x => typeof x === 'string');
    if (raw && typeof raw === 'object') return Object.values(raw).filter(x => typeof x === 'string') as string[];
    return [];
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold gradient-text">Clients Hub</h1>
        <p className="text-muted-foreground mt-1">Logos, brand details and contact info for every active client.</p>
      </div>

      <div className="relative max-w-md">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients…" className="pl-8" />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="glass-card h-48 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center text-muted-foreground">
          <Building2 size={32} className="mx-auto mb-2 opacity-40" />
          <p>No clients found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => {
            const colors = colorsOf(c);
            return (
              <div key={c.id} className="glass-card p-5 space-y-3">
                <div className="flex items-center gap-3">
                  {c.logo_url ? (
                    <img src={c.logo_url} alt={`${c.name} logo`} loading="lazy" className="h-12 w-12 rounded-lg object-cover bg-muted" />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-primary/20 text-primary flex items-center justify-center font-bold">
                      {c.name.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.project_title || c.industry || '—'}</p>
                  </div>
                </div>

                <div className="space-y-1.5 text-sm">
                  {c.contact_person && (
                    <p className="flex items-center gap-2 text-muted-foreground"><User size={13} /> {c.contact_person}</p>
                  )}
                  {c.phone && (
                    <a href={`tel:${c.phone}`} className="flex items-center gap-2 text-foreground hover:text-primary transition-colors">
                      <Phone size={13} /> {c.phone}
                    </a>
                  )}
                  {c.email && (
                    <a href={`mailto:${c.email}`} className="flex items-center gap-2 text-foreground hover:text-primary transition-colors truncate">
                      <Mail size={13} /> <span className="truncate">{c.email}</span>
                    </a>
                  )}
                </div>

                {colors.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Palette size={13} className="text-muted-foreground" />
                    <div className="flex gap-1">
                      {colors.slice(0, 6).map((col, i) => (
                        <span key={i} className="h-4 w-4 rounded border border-glass-border" style={{ backgroundColor: col }} title={col} />
                      ))}
                    </div>
                  </div>
                )}

                {c.notes && <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4">{c.notes}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
