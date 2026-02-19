import { useState, useEffect } from 'react';
import { EditorLayout } from '@/components/editor/EditorLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Users, Mail, Phone, Building2, Calendar } from 'lucide-react';

interface Client {
  id: string; name: string; industry: string | null; logo_url: string | null;
  contact_person: string | null; phone: string | null; email: string | null;
}

export default function EditorClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('clients').select('id, name, industry, logo_url, contact_person, phone, email').eq('is_active', true).order('name');
      if (data) setClients(data);
      setLoading(false);
    };
    fetch();
  }, []);

  return (
    <EditorLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold gradient-text">Clients</h1>
          <p className="text-muted-foreground mt-1">Brand reference for active clients</p>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <div key={i} className="glass-card h-32 animate-pulse" />)}
          </div>
        ) : clients.length === 0 ? (
          <div className="glass-card p-16 text-center"><Users size={40} className="mx-auto text-muted-foreground/40 mb-3" /><p className="text-muted-foreground">No active clients.</p></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {clients.map(c => (
              <div key={c.id} className="glass-card p-5 space-y-3">
                <div className="flex items-center gap-3">
                  {c.logo_url ? (
                    <img src={c.logo_url} alt={c.name} className="h-10 w-10 rounded-lg object-contain bg-muted" />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">{c.name.charAt(0)}</div>
                  )}
                  <div>
                    <h3 className="font-semibold text-foreground">{c.name}</h3>
                    {c.industry && <p className="text-xs text-muted-foreground">{c.industry}</p>}
                  </div>
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  {c.contact_person && <div className="flex items-center gap-2"><Users size={10} />{c.contact_person}</div>}
                  {c.email && <div className="flex items-center gap-2"><Mail size={10} />{c.email}</div>}
                  {c.phone && <div className="flex items-center gap-2"><Phone size={10} />{c.phone}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </EditorLayout>
  );
}
