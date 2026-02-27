import { useEffect, useState } from 'react';
import { CameraLayout } from '@/components/camera/CameraLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserCircle } from 'lucide-react';

export default function CameraProfile() {
  const { user, profile } = useAuth();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name || '');
    setPhone(profile?.phone || '');
  }, [profile]);

  const save = async () => {
    if (!user?.id) return;
    setSaving(true);
    await supabase.from('profiles').update({ full_name: fullName, phone: phone || null }).eq('id', user.id);
    setSaving(false);
  };

  return (
    <CameraLayout>
      <div className="space-y-6 max-w-xl">
        <div>
          <h1 className="text-3xl font-display font-bold gradient-text">Profile</h1>
          <p className="text-muted-foreground mt-1">Manage your camera operator profile</p>
        </div>

        <div className="glass-card p-6 space-y-4">
          <div className="h-12 w-12 rounded-full bg-primary/20 text-primary flex items-center justify-center">
            <UserCircle size={24} />
          </div>
          <div className="space-y-1.5">
            <Label>Full name</Label>
            <Input value={fullName} onChange={e => setFullName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={profile?.email || ''} disabled />
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
          <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Profile'}</Button>
        </div>
      </div>
    </CameraLayout>
  );
}
