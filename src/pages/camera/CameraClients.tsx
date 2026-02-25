import { useState, useEffect } from 'react';
import { CameraLayout } from '@/components/camera/CameraLayout';
import { supabase } from '@/integrations/supabase/client';
import { Users } from 'lucide-react';

interface ClientCard {
  id: string; name: string; industry: string | null; logo_url: string | null;
}

export default function CameraClients() {
  const [clients, setClients] = useState<ClientCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('clients').select('id, name, industry, logo_url').eq('is_active', true).order('name');
      if (data) setClients(data);
      setLoading(false);
    })();
  }, []);

  return (
    <CameraLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold gradient-text">Clients</h1>
          <p className="text-muted-foreground mt-1">Active clients reference</p>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <div key={i} className="glass-card h-24 animate-pulse" />)}
          </div>
        ) : clients.length === 0 ? (
          <div className="glass-card p-16 text-center">
            <Users size={40} className="mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">No clients available.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {clients.map(c => (
              <div key={c.id} className="glass-card p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                  {c.logo_url ? <img src={c.logo_url} alt={c.name} className="h-10 w-10 rounded-lg object-cover" /> : c.name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-foreground">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.industry || 'No industry'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </CameraLayout>
  );
}
