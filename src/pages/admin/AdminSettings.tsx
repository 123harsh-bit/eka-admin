import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield, User, Key } from 'lucide-react';

export default function AdminSettings() {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const [profileForm, setProfileForm] = useState({ full_name: '', email: '', phone: '' });
  const [passwordForm, setPasswordForm] = useState({ current: '', new_password: '', confirm: '' });
  const [newAdminForm, setNewAdminForm] = useState({ full_name: '', email: '', password: '', security_key: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingAdmin, setSavingAdmin] = useState(false);

  useEffect(() => {
    if (profile) {
      setProfileForm({ full_name: profile.full_name || '', email: profile.email || '', phone: profile.phone || '' });
    }
  }, [profile]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    const { error } = await supabase.from('profiles').update({
      full_name: profileForm.full_name.trim(),
      phone: profileForm.phone || null,
    }).eq('id', user?.id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Profile saved' });
    }
    setSavingProfile(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    if (passwordForm.new_password.length < 8) {
      toast({ title: 'Password must be at least 8 characters', variant: 'destructive' });
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: passwordForm.new_password });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Password updated' });
      setPasswordForm({ current: '', new_password: '', confirm: '' });
    }
    setSavingPassword(false);
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newAdminForm.security_key !== '123@xcodeH') {
      toast({ title: 'Invalid security key', description: 'The security key you entered is incorrect.', variant: 'destructive' });
      return;
    }
    if (newAdminForm.password.length < 8) {
      toast({ title: 'Password must be at least 8 characters', variant: 'destructive' });
      return;
    }
    setSavingAdmin(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-admin-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          email: newAdminForm.email.trim(),
          password: newAdminForm.password,
          full_name: newAdminForm.full_name.trim(),
          role: 'admin',
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to create admin');
      toast({ title: 'Admin account created', description: `${newAdminForm.full_name} can now log in as admin.` });
      setNewAdminForm({ full_name: '', email: '', password: '', security_key: '' });
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Something went wrong', variant: 'destructive' });
    } finally {
      setSavingAdmin(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-2xl space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold gradient-text">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your account and agency settings.</p>
        </div>

        {/* Profile Settings */}
        <section className="glass-card p-6 space-y-5">
          <div className="flex items-center gap-2">
            <User size={18} className="text-primary" />
            <h2 className="text-lg font-display font-semibold text-foreground">Your Profile</h2>
          </div>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input value={profileForm.full_name} onChange={e => setProfileForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Your name" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={profileForm.email} disabled className="opacity-60" />
              <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={profileForm.phone} onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91 98765 43210" />
            </div>
            <Button type="submit" disabled={savingProfile} className="gap-2">
              {savingProfile && <Loader2 size={16} className="animate-spin" />} Save Profile
            </Button>
          </form>
        </section>

        {/* Password Change */}
        <section className="glass-card p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Key size={18} className="text-primary" />
            <h2 className="text-lg font-display font-semibold text-foreground">Change Password</h2>
          </div>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-1.5">
              <Label>New Password</Label>
              <Input type="password" value={passwordForm.new_password} onChange={e => setPasswordForm(f => ({ ...f, new_password: e.target.value }))} placeholder="Min. 8 characters" minLength={8} required />
            </div>
            <div className="space-y-1.5">
              <Label>Confirm New Password</Label>
              <Input type="password" value={passwordForm.confirm} onChange={e => setPasswordForm(f => ({ ...f, confirm: e.target.value }))} placeholder="Repeat password" required />
            </div>
            <Button type="submit" disabled={savingPassword} variant="outline" className="gap-2">
              {savingPassword && <Loader2 size={16} className="animate-spin" />} Update Password
            </Button>
          </form>
        </section>

        {/* Create Admin */}
        <section className="glass-card p-6 space-y-5 border-primary/30">
          <div className="flex items-center gap-2">
            <Shield size={18} className="text-primary" />
            <h2 className="text-lg font-display font-semibold text-foreground">Create Admin Account</h2>
          </div>
          <p className="text-sm text-muted-foreground">Add another Managing Director to the system. Requires your security key.</p>
          <form onSubmit={handleCreateAdmin} className="space-y-4">
            <div className="space-y-1.5"><Label>Full Name *</Label><Input value={newAdminForm.full_name} onChange={e => setNewAdminForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Jane Smith" required /></div>
            <div className="space-y-1.5"><Label>Email *</Label><Input type="email" value={newAdminForm.email} onChange={e => setNewAdminForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@eka.agency" required /></div>
            <div className="space-y-1.5"><Label>Password *</Label><Input type="password" value={newAdminForm.password} onChange={e => setNewAdminForm(f => ({ ...f, password: e.target.value }))} placeholder="Min. 8 characters" minLength={8} required /></div>
            <div className="space-y-1.5">
              <Label>Security Key *</Label>
              <Input type="password" value={newAdminForm.security_key} onChange={e => setNewAdminForm(f => ({ ...f, security_key: e.target.value }))} placeholder="Enter security key" required />
            </div>
            <Button type="submit" disabled={savingAdmin} className="gap-2">
              {savingAdmin && <Loader2 size={16} className="animate-spin" />} Create Admin Account
            </Button>
          </form>
        </section>
      </div>
    </AdminLayout>
  );
}
