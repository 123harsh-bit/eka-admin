import { useState, useEffect } from 'react';
import { DesignerLayout } from '@/components/designer/DesignerLayout';
import { supabase } from '@/integrations/supabase/client';
import { BookOpen, Download, ExternalLink } from 'lucide-react';

interface BrandClient {
  id: string;
  name: string;
  industry: string | null;
  logo_url: string | null;
  brand_colors: Record<string, string> | null;
  brand_fonts: Record<string, string> | null;
  notes: string | null;
}

export default function DesignerBrandKits() {
  const [clients, setClients] = useState<BrandClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<BrandClient | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('clients').select('id, name, industry, logo_url, brand_colors, brand_fonts, notes').eq('is_active', true).order('name');
      if (data) {
        setClients(data.map(c => ({
          ...c,
          brand_colors: c.brand_colors as Record<string, string> | null,
          brand_fonts: c.brand_fonts as Record<string, string> | null,
        })));
      }
      setLoading(false);
    };
    fetch();
  }, []);

  return (
    <DesignerLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold gradient-text">Brand Kits</h1>
          <p className="text-muted-foreground mt-1">Per-client brand libraries, colors, fonts, and assets</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <div key={i} className="glass-card h-48 animate-pulse" />)}
          </div>
        ) : clients.length === 0 ? (
          <div className="glass-card p-16 text-center">
            <BookOpen size={40} className="mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">No active clients yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {clients.map(client => {
              const colors = client.brand_colors ? Object.values(client.brand_colors) : [];
              const fonts = client.brand_fonts ? Object.values(client.brand_fonts) : [];
              return (
                <div
                  key={client.id}
                  onClick={() => setSelected(selected?.id === client.id ? null : client)}
                  className="glass-card-hover p-5 space-y-4 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    {client.logo_url ? (
                      <img src={client.logo_url} alt={client.name} className="h-12 w-12 rounded-xl object-contain bg-muted" />
                    ) : (
                      <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center text-lg font-bold text-primary">
                        {client.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-foreground">{client.name}</h3>
                      {client.industry && <p className="text-xs text-muted-foreground">{client.industry}</p>}
                    </div>
                  </div>

                  {/* Color swatches */}
                  {colors.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5">Brand Colors</p>
                      <div className="flex gap-1.5 flex-wrap">
                        {colors.map((color, i) => (
                          <div key={i} className="group relative">
                            <div
                              className="h-7 w-7 rounded-full border-2 border-glass-border shadow-sm"
                              style={{ backgroundColor: color }}
                              title={color}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Fonts */}
                  {fonts.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Fonts</p>
                      <div className="flex flex-wrap gap-1">
                        {fonts.map((font, i) => (
                          <span key={i} className="text-xs bg-muted px-2 py-0.5 rounded text-foreground">{font}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {colors.length === 0 && fonts.length === 0 && (
                    <p className="text-xs text-muted-foreground italic">No brand details added yet.</p>
                  )}

                  {client.logo_url && (
                    <a
                      href={client.logo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                    >
                      <Download size={10} /> Download Logo
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Brand detail panel */}
        {selected && (
          <>
            <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setSelected(null)} />
            <div className="fixed right-0 top-0 h-full w-96 bg-sidebar border-l border-sidebar-border z-50 flex flex-col shadow-2xl overflow-y-auto">
              <div className="p-6 border-b border-sidebar-border flex items-center justify-between">
                <h2 className="text-xl font-display font-bold text-foreground">{selected.name} — Brand Kit</h2>
                <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground text-xl leading-none">×</button>
              </div>
              <div className="p-6 space-y-6">
                {selected.logo_url && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Logo</p>
                    <div className="p-4 bg-muted/30 rounded-xl flex items-center justify-center">
                      <img src={selected.logo_url} alt={selected.name} className="max-h-24 object-contain" />
                    </div>
                    <a href={selected.logo_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-primary hover:underline mt-2">
                      <Download size={10} /> Download Logo
                    </a>
                  </div>
                )}

                {selected.brand_colors && Object.keys(selected.brand_colors).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Brand Colors</p>
                    <div className="space-y-2">
                      {Object.entries(selected.brand_colors).map(([name, color]) => (
                        <div key={name} className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg border-2 border-glass-border flex-shrink-0" style={{ backgroundColor: color }} />
                          <div>
                            <p className="text-sm font-medium text-foreground">{name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{color}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selected.brand_fonts && Object.keys(selected.brand_fonts).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Typography</p>
                    <div className="space-y-2">
                      {Object.entries(selected.brand_fonts).map(([type, font]) => (
                        <div key={type} className="p-3 bg-muted/30 rounded-lg">
                          <p className="text-xs text-muted-foreground">{type}</p>
                          <p className="font-medium text-foreground">{font}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selected.notes && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Brand Notes</p>
                    <p className="text-sm text-foreground/80 bg-muted/30 rounded-lg p-3">{selected.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </DesignerLayout>
  );
}
