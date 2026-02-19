import { useState, useEffect } from 'react';
import { WriterLayout } from '@/components/writer/WriterLayout';
import { supabase } from '@/integrations/supabase/client';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react';

interface ClientBrief {
  id: string; name: string; industry: string | null; logo_url: string | null;
  notes: string | null; brand_fonts: Record<string, string> | null;
  brand_colors: Record<string, string> | null;
}

export default function WriterClientBriefs() {
  const [clients, setClients] = useState<ClientBrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('clients').select('id, name, industry, logo_url, notes, brand_fonts, brand_colors').eq('is_active', true).order('name');
      if (data) {
        setClients(data.map(c => ({
          ...c,
          brand_fonts: c.brand_fonts as Record<string, string> | null,
          brand_colors: c.brand_colors as Record<string, string> | null,
        })));
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const toggle = (id: string) => setExpanded(expanded === id ? null : id);

  return (
    <WriterLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold gradient-text">Client Briefs</h1>
          <p className="text-muted-foreground mt-1">Brand voice, audience, and tone reference for your writing</p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="glass-card h-16 animate-pulse" />)}
          </div>
        ) : clients.length === 0 ? (
          <div className="glass-card p-16 text-center">
            <BookOpen size={40} className="mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">No client briefs available.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {clients.map(client => (
              <div key={client.id} className="glass-card overflow-hidden">
                <button
                  onClick={() => toggle(client.id)}
                  className="w-full flex items-center gap-4 p-4 hover:bg-muted/20 transition-colors text-left"
                >
                  {client.logo_url ? (
                    <img src={client.logo_url} alt={client.name} className="h-10 w-10 rounded-lg object-contain bg-muted flex-shrink-0" />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                      {client.name.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{client.name}</h3>
                    {client.industry && <p className="text-xs text-muted-foreground">{client.industry}</p>}
                  </div>
                  {expanded === client.id ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                </button>

                {expanded === client.id && (
                  <div className="px-4 pb-4 space-y-4 border-t border-glass-border pt-4">
                    {client.notes ? (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Brand Notes & Brief</p>
                        <div className="bg-muted/30 rounded-lg p-4">
                          <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{client.notes}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No brand brief added yet. Ask your admin to add brand notes for this client.</p>
                    )}

                    {client.brand_fonts && Object.keys(client.brand_fonts).length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Typography</p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(client.brand_fonts).map(([type, font]) => (
                            <div key={type} className="bg-muted/30 rounded-lg px-3 py-2">
                              <p className="text-xs text-muted-foreground">{type}</p>
                              <p className="text-sm font-medium text-foreground">{font}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {client.brand_colors && Object.keys(client.brand_colors).length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Brand Colors</p>
                        <div className="flex gap-2 flex-wrap">
                          {Object.entries(client.brand_colors).map(([name, color]) => (
                            <div key={name} className="flex items-center gap-1.5">
                              <div className="h-5 w-5 rounded-full border border-glass-border" style={{ backgroundColor: color }} />
                              <span className="text-xs text-muted-foreground">{name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </WriterLayout>
  );
}
