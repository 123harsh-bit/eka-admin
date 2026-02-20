import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ConfirmDeleteModal } from '@/components/shared/ConfirmDeleteModal';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Copy, Check, KeyRound, ShieldAlert, ShieldCheck, RefreshCw, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClientPortalAccessProps {
  clientId: string;
  clientEmail: string | null;
  clientName: string;
  userId: string | null;
  onUpdate: () => void;
}

function generatePassword(): string {
  const adjectives = ['Blue', 'Red', 'Swift', 'Bold', 'Calm', 'Dark', 'Gold', 'Jade', 'Mint', 'Rose', 'Sage', 'Teal', 'Warm', 'Zen'];
  const nouns = ['Tiger', 'Eagle', 'Storm', 'River', 'Cloud', 'Spark', 'Stone', 'Flame', 'Frost', 'Wave', 'Star', 'Moon', 'Peak', 'Dawn'];
  const specials = ['@', '#', '&', '!', '$'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const special = specials[Math.floor(Math.random() * specials.length)];
  const num = Math.floor(Math.random() * 9000) + 1000;
  return `${adj}${special}${num}${noun}`;
}

export function ClientPortalAccess({ clientId, clientEmail, clientName, userId, onUpdate }: ClientPortalAccessProps) {
  const { toast } = useToast();
  const [hasAccess, setHasAccess] = useState(!!userId);
  const [loginEmail, setLoginEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState(clientEmail || '');
  const [password, setPassword] = useState(generatePassword());
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [revokeModal, setRevokeModal] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (userId) {
      setHasAccess(true);
      // fetch login email
      supabase.from('profiles').select('email').eq('id', userId).single().then(({ data }) => {
        if (data) setLoginEmail(data.email);
      });
    } else {
      setHasAccess(false);
      setLoginEmail('');
    }
  }, [userId]);

  const handleCreate = async () => {
    if (!email.trim()) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-admin-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
          full_name: clientName,
          role: 'client',
          client_id: clientId,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to create login');
      
      setCredentials({ email: email.trim(), password });
      setHasAccess(true);
      setLoginEmail(email.trim());
      setShowModal(false);
      onUpdate();
      toast({ title: '✅ Portal access created!' });
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Something went wrong', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!userId) return;
    setResetting(true);
    const newPwd = generatePassword();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-admin-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ action: 'reset_password', user_id: userId, new_password: newPwd }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to reset');
      setCredentials({ email: loginEmail, password: newPwd });
      toast({ title: 'Password reset successfully' });
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Something went wrong', variant: 'destructive' });
    } finally {
      setResetting(false);
    }
  };

  const handleRevoke = async () => {
    if (!userId) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-admin-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ action: 'revoke_client_access', user_id: userId, client_id: clientId }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to revoke');
      setHasAccess(false);
      setCredentials(null);
      setLoginEmail('');
      onUpdate();
      toast({ title: 'Portal access revoked' });
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Something went wrong', variant: 'destructive' });
    }
    setRevokeModal(false);
  };

  const copyCredentials = () => {
    if (!credentials) return;
    navigator.clipboard.writeText(`Email: ${credentials.email} | Password: ${credentials.password}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <KeyRound size={14} className="text-primary" />
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Client Portal Access</p>
      </div>

      {!hasAccess ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-destructive" />
            <p className="text-sm text-muted-foreground">No portal access created yet</p>
          </div>
          <Button size="sm" onClick={() => { setEmail(clientEmail || ''); setPassword(generatePassword()); setShowModal(true); }} className="gap-2">
            <KeyRound size={14} /> Generate Client Login
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-success" />
            <p className="text-sm text-foreground">Portal access active</p>
          </div>
          <p className="text-xs text-muted-foreground">Login: {loginEmail}</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleResetPassword} disabled={resetting} className="gap-1.5 text-xs">
              {resetting ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Reset Password
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setRevokeModal(true)} className="gap-1.5 text-xs text-destructive hover:text-destructive">
              <Trash2 size={12} /> Revoke Access
            </Button>
          </div>
        </div>
      )}

      {/* Credentials display */}
      {credentials && (
        <div className="p-3 bg-success/10 border border-success/30 rounded-lg space-y-2">
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-success" />
            <p className="text-xs font-semibold text-success">Credentials ready — copy now!</p>
          </div>
          <div className="bg-background/50 rounded p-2 font-mono text-xs text-foreground">
            Email: {credentials.email}<br />
            Password: {credentials.password}
          </div>
          <Button size="sm" variant="outline" onClick={copyCredentials} className="gap-1.5 text-xs w-full">
            {copied ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy Credentials</>}
          </Button>
          <div className="flex items-start gap-1.5">
            <ShieldAlert size={12} className="text-warning flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-warning">This password will not be shown again. Copy it now.</p>
          </div>
        </div>
      )}

      {/* Create Login Modal */}
      {showModal && (
        <>
          <div className="fixed inset-0 bg-black/60 z-[60]" onClick={() => setShowModal(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-card border border-glass-border rounded-xl p-6 z-[61] space-y-4 shadow-2xl">
            <h3 className="font-display font-semibold text-foreground">Generate Client Login</h3>
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="client@example.com" className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Password (auto-generated)</Label>
              <div className="flex gap-2">
                <Input value={password} onChange={e => setPassword(e.target.value)} className="text-sm font-mono" />
                <Button size="sm" variant="ghost" onClick={() => setPassword(generatePassword())} className="px-2">
                  <RefreshCw size={14} />
                </Button>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleCreate} disabled={loading || !email.trim()} className="flex-1 gap-2">
                {loading && <Loader2 size={14} className="animate-spin" />}
                Create Login
              </Button>
            </div>
          </div>
        </>
      )}

      <ConfirmDeleteModal
        open={revokeModal}
        onOpenChange={setRevokeModal}
        onConfirm={handleRevoke}
        title="Revoke Portal Access"
        description={`Remove "${clientName}"'s portal access? They will no longer be able to log in.`}
      />
    </div>
  );
}
