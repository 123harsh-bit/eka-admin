import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { SocialLayout } from '@/components/social/SocialLayout';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Instagram, Facebook, Loader2, Link2, CheckCircle2, ChevronDown } from 'lucide-react';

interface Account { id: string; platform: string; name: string; username: string | null; avatar_url: string | null; client_id: string | null; is_active: boolean; }
interface Client { id: string; name: string; }

const STEPS = [
  { t: 'Make each Instagram a Business or Creator account', d: 'In the Instagram app: Settings → Account type and tools → Switch to professional account. Free, takes 1 minute.' },
  { t: 'Link each Instagram to a Facebook Page', d: 'In the Instagram app: Edit profile → Page → connect a Facebook Page (create a Page if the brand has none). The person connecting must be an admin of every Page.' },
  { t: 'Create a free Meta developer app', d: 'Go to developers.facebook.com → My Apps → Create App → choose "Other" → type "Business". Give it a name like "EKA Publisher".' },
  { t: 'Add the products', d: 'Inside the app, add "Facebook Login for Business" and "Instagram Graph API".' },
  { t: 'Paste the redirect link', d: 'Facebook Login → Settings → Valid OAuth Redirect URIs: paste the link shown below and save.' },
  { t: 'Copy your App ID and App Secret', d: 'App settings → Basic. Send both to me in chat and I will store them securely.' },
  { t: 'Click "Connect Instagram & Facebook" below', d: 'Log in with the Facebook account that is admin of the Pages, tick all Pages, and allow everything.' },
];

export default function SocialAccounts() {
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const redirect = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/meta-connect`;

  const load = async () => {
    const [{ data: a }, { data: c }] = await Promise.all([
      supabase.from('social_accounts').select('id,platform,name,username,avatar_url,client_id,is_active').order('platform').order('name'),
      supabase.from('clients').select('id,name').eq('is_active', true).order('name'),
    ]);
    setAccounts((a as Account[]) || []);
    setClients(c || []);
    setLoading(false);
    if (!a?.length) setShowGuide(true);
  };

  useEffect(() => {
    load();
    const ok = params.get('meta_connected');
    const err = params.get('meta_error');
    if (ok) toast({ title: `Connected ${ok} account(s)` });
    if (err) toast({ title: 'Connection failed', description: err, variant: 'destructive' });
    if (ok || err) setParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connect = async () => {
    setConnecting(true);
    const { data, error } = await supabase.functions.invoke('meta-connect', { body: { return_url: window.location.origin + '/social/accounts' } });
    if (error) {
      const details = error instanceof FunctionsHttpError ? (await error.context.json().catch(() => ({})))?.error : error.message;
      toast({ title: 'Cannot connect yet', description: details || 'Try again', variant: 'destructive' });
      setConnecting(false);
      return;
    }
    window.location.href = data.url;
  };

  const update = async (id: string, patch: Partial<Account>) => {
    setAccounts(a => a.map(x => (x.id === id ? { ...x, ...patch } : x)));
    await supabase.from('social_accounts').update(patch).eq('id', id);
  };

  return (
    <SocialLayout>
      <div className="max-w-4xl space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-display font-bold gradient-text">Connected Accounts</h1>
            <p className="text-muted-foreground mt-1">Posts marked “Auto-post” go out to these accounts at the scheduled time.</p>
          </div>
          <Button onClick={connect} disabled={connecting} className="gap-2">
            {connecting ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
            Connect Instagram & Facebook
          </Button>
        </div>

        <div className="glass-card p-5">
          <button onClick={() => setShowGuide(s => !s)} className="flex w-full items-center justify-between text-left font-semibold">
            Setup guide (one time, about 20 minutes)
            <ChevronDown size={16} className={showGuide ? 'rotate-180 transition-transform' : 'transition-transform'} />
          </button>
          {showGuide && (
            <ol className="mt-4 space-y-3">
              {STEPS.map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">{i + 1}</span>
                  <div>
                    <p className="font-medium">{s.t}</p>
                    <p className="text-sm text-muted-foreground">{s.d}</p>
                    {i === 4 && <code className="mt-2 block break-all rounded bg-muted px-2 py-1 text-xs">{redirect}</code>}
                  </div>
                </li>
              ))}
              <li className="rounded-lg border border-border p-3 text-sm text-muted-foreground">
                Tip: while your Meta app is in “Development” mode, only people added under App roles can connect. Add yourself and your social executive as Admins/Testers. For client-owned accounts, the client must add your Facebook account as a Page admin, or you need Meta App Review later.
              </li>
            </ol>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>
        ) : accounts.length === 0 ? (
          <div className="glass-card p-10 text-center text-muted-foreground">No accounts connected yet.</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {accounts.map(a => {
              const Icon = a.platform === 'instagram' ? Instagram : Facebook;
              return (
                <div key={a.id} className="glass-card flex items-center gap-3 p-4">
                  {a.avatar_url ? <img src={a.avatar_url} alt="" className="h-11 w-11 rounded-full object-cover" /> : <div className="h-11 w-11 rounded-full bg-muted" />}
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate font-medium"><Icon size={14} /> {a.name}</p>
                    {a.username && <p className="truncate text-xs text-muted-foreground">@{a.username}</p>}
                    <select
                      value={a.client_id || ''}
                      onChange={e => update(a.id, { client_id: e.target.value || null })}
                      className="mt-2 h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
                    >
                      <option value="">Link to client…</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <button onClick={() => update(a.id, { is_active: !a.is_active })} className="text-xs" title="Turn on/off">
                    {a.is_active ? <span className="flex items-center gap-1 text-primary"><CheckCircle2 size={14} /> On</span> : <span className="text-muted-foreground">Off</span>}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </SocialLayout>
  );
}
