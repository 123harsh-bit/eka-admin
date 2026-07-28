import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Phone, Mail, User, Building2, Palette, Download, FileText, FolderOpen, Image, FileArchive, Type } from 'lucide-react';

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

interface ClientAsset {
  id: string;
  client_id: string;
  name: string;
  asset_type: string;
  file_path: string;
  file_name: string;
  mime_type: string | null;
  file_size: number | null;
  notes: string | null;
  created_at: string;
  signed_url?: string;
}

const assetIcon = (type: string) => {
  if (type === 'logo' || type === 'photo') return Image;
  if (type === 'guideline' || type === 'brief') return FileText;
  if (type === 'archive') return FileArchive;
  return FolderOpen;
};

const formatSize = (bytes?: number | null) => {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function ClientsHub() {
  const [clients, setClients] = useState<HubClient[]>([]);
  const [assets, setAssets] = useState<ClientAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string>('all');

  useEffect(() => {
    (async () => {
      const [{ data: clientData }, { data: assetData }] = await Promise.all([
        (supabase.rpc as any)('team_list_clients'),
        supabase.from('client_assets').select('*').order('created_at', { ascending: false }),
      ]);

      const assetRows = ((assetData as ClientAsset[]) || []);
      const withUrls = await Promise.all(assetRows.map(async asset => {
        const { data } = await supabase.storage.from('brand-assets').createSignedUrl(asset.file_path, 60 * 10);
        return { ...asset, signed_url: data?.signedUrl };
      }));

      setClients((clientData as HubClient[]) || []);
      setAssets(withUrls);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const byClient = selectedClientId === 'all' ? clients : clients.filter(c => c.id === selectedClientId);
    if (!q) return byClient;
    return byClient.filter(c =>
      [c.name, c.project_title, c.industry, c.contact_person].some(v => v?.toLowerCase().includes(q))
    );
  }, [clients, search, selectedClientId]);

  const assetsByClient = useMemo(() => {
    return assets.reduce<Record<string, ClientAsset[]>>((acc, asset) => {
      (acc[asset.client_id] ||= []).push(asset);
      return acc;
    }, {});
  }, [assets]);

  const colorsOf = (c: HubClient): string[] => {
    const raw = c.brand_colors as any;
    if (Array.isArray(raw)) return raw.filter(x => typeof x === 'string');
    if (raw && typeof raw === 'object') return Object.values(raw).filter(x => typeof x === 'string') as string[];
    return [];
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold gradient-text">Client Assets</h1>
        <p className="text-muted-foreground mt-1">Client logos, brand files, business details and downloadable belongings.</p>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative max-w-md flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients…" className="pl-8" />
        </div>
        <select
          value={selectedClientId}
          onChange={e => setSelectedClientId(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
        >
          <option value="all">All clients</option>
          {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
        </select>
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
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {filtered.map(c => {
            const colors = colorsOf(c);
            const clientAssets = assetsByClient[c.id] || [];
            return (
              <div key={c.id} className="glass-card p-5 space-y-4">
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

                {c.brand_fonts && typeof c.brand_fonts === 'object' && Object.keys(c.brand_fonts as Record<string, string>).length > 0 && (
                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Type size={13} className="mt-0.5" />
                    <div className="flex flex-wrap gap-1">
                      {Object.values(c.brand_fonts as Record<string, string>).slice(0, 4).map(font => (
                        <span key={font} className="rounded-md bg-muted/40 px-2 py-0.5 text-foreground">{font}</span>
                      ))}
                    </div>
                  </div>
                )}

                {c.notes && <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4">{c.notes}</p>}

                <div className="border-t border-border/50 pt-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Downloads</p>
                    <span className="text-[11px] text-muted-foreground">{clientAssets.length} file{clientAssets.length === 1 ? '' : 's'}</span>
                  </div>

                  {clientAssets.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No files uploaded yet.</p>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {clientAssets.map(asset => {
                        const Icon = assetIcon(asset.asset_type);
                        return (
                          <a
                            key={asset.id}
                            href={asset.signed_url || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-muted/20 p-2 text-xs transition-colors hover:border-primary/40 hover:bg-primary/10"
                          >
                            <Icon size={14} className="flex-shrink-0 text-primary" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-medium text-foreground">{asset.name}</span>
                              <span className="block truncate text-muted-foreground">{asset.asset_type} {formatSize(asset.file_size)}</span>
                            </span>
                            <Download size={13} className="flex-shrink-0 text-muted-foreground" />
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
