import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { TeamPerformanceGrid } from '@/components/admin/TeamPerformance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ConfirmDeleteModal } from '@/components/shared/ConfirmDeleteModal';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, X, UserCircle, Edit2, Trash2, Loader2, Mail, Phone, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: string;
  created_at: string;
  taskCount?: number;
}

const ROLES = [
  { value: 'editor', label: 'Video Editor', color: 'text-blue-400 bg-blue-500/20' },
  { value: 'designer', label: 'Graphic Designer', color: 'text-pink-400 bg-pink-500/20' },
  { value: 'writer', label: 'Content Writer', color: 'text-green-400 bg-green-500/20' },
  { value: 'camera_operator', label: 'Camera Operator', color: 'text-violet-400 bg-violet-500/20' },
  { value: 'admin', label: 'Managing Director', color: 'text-primary bg-primary/20' },
];

export default function AdminTeam() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', role: 'editor', password: '' });
  const [saving, setSaving] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; member: TeamMember | null }>({ open: false, member: null });
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  useEffect(() => { fetchTeam(); }, []);

  const fetchTeam = async () => {
    setLoading(true);
    const { data: roles } = await supabase.from('user_roles').select('user_id, role').not('role', 'eq', 'client');
    if (!roles) { setLoading(false); return; }

    const userIds = roles.map(r => r.user_id);
    if (userIds.length === 0) { setMembers([]); setLoading(false); return; }

    const { data: profiles } = await supabase.from('profiles').select('*').in('id', userIds);
    if (!profiles) { setLoading(false); return; }

    const roleMap: Record<string, string> = {};
    roles.forEach(r => { roleMap[r.user_id] = r.role; });

    const team: TeamMember[] = profiles.map(p => ({
      id: p.id,
      full_name: p.full_name,
      email: p.email,
      phone: p.phone,
      role: roleMap[p.id] || 'editor',
      created_at: p.created_at,
    }));

    // Get task counts
    const teamWithCounts = await Promise.all(
      team.map(async m => {
        let count = 0;
        if (m.role === 'editor') {
          const { count: c } = await supabase.from('videos').select('*', { count: 'exact', head: true }).eq('assigned_editor', m.id).not('status', 'eq', 'live');
          count = c || 0;
        } else if (m.role === 'designer') {
          const { count: c } = await supabase.from('design_tasks').select('*', { count: 'exact', head: true }).eq('assigned_designer', m.id).not('status', 'eq', 'delivered');
          count = c || 0;
        } else if (m.role === 'writer') {
          const { count: c } = await supabase.from('writing_tasks').select('*', { count: 'exact', head: true }).eq('assigned_writer', m.id).not('status', 'eq', 'delivered');
          count = c || 0;
        }
        return { ...m, taskCount: count };
      })
    );

    setMembers(teamWithCounts);
    setLoading(false);
  };

  const openAdd = () => {
    setEditingMember(null);
    setForm({ full_name: '', email: '', phone: '', role: 'editor', password: '' });
    setPanelOpen(true);
  };

  const openEdit = (member: TeamMember) => {
    setEditingMember(member);
    setForm({ full_name: member.full_name, email: member.email, phone: member.phone || '', role: member.role, password: '' });
    setPanelOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim() || !form.email.trim()) return;
    setSaving(true);

    try {
      if (editingMember) {
        const { error: profileError } = await supabase.from('profiles').update({
          full_name: form.full_name.trim(),
          phone: form.phone || null,
        }).eq('id', editingMember.id);
        if (profileError) throw profileError;

        if (editingMember.role !== form.role) {
          await supabase.from('user_roles').update({ role: form.role as 'admin' | 'editor' | 'designer' | 'writer' | 'client' }).eq('user_id', editingMember.id);
        }

        toast({ title: 'Team member updated' });
      } else {
        if (!form.password || form.password.length < 8) {
          toast({ title: 'Password must be at least 8 characters', variant: 'destructive' });
          setSaving(false);
          return;
        }
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-admin-user`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            email: form.email.trim(),
            password: form.password,
            full_name: form.full_name.trim(),
            role: form.role,
          }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Failed to create user');

        if (form.phone && result.user_id) {
          await supabase.from('profiles').update({ phone: form.phone }).eq('id', result.user_id);
        }

        toast({ title: 'Team member added', description: `${form.full_name} can now log in.` });
      }

      await fetchTeam();
      setPanelOpen(false);
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Something went wrong', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.member) return;
    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-admin-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ action: 'delete_user', user_id: deleteModal.member.id }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to delete');
      await fetchTeam();
      toast({ title: `${deleteModal.member.full_name} has been permanently removed.` });
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Something went wrong', variant: 'destructive' });
    } finally {
      setDeleting(false);
      setDeleteModal({ open: false, member: null });
    }
  };

  const getRoleConfig = (role: string) => ROLES.find(r => r.value === role) || ROLES[0];

  const filtered = members.filter(m => {
    const matchSearch = m.full_name.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = !roleFilter || m.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Team Performance Section */}
        <TeamPerformanceGrid />

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold gradient-text">Team</h1>
            <p className="text-muted-foreground mt-1">{members.length} members</p>
          </div>
          <Button onClick={openAdd} className="gap-2"><Plus size={16} /> Add Member</Button>
        </div>

        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-40">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search team…" className="pl-8" />
          </div>
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
            <option value="">All roles</option>
            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <div key={i} className="glass-card h-44 animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-card p-16 text-center">
            <UserCircle size={40} className="mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">{search || roleFilter ? 'No members match your filters.' : 'No team members yet.'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(member => {
              const roleConfig = getRoleConfig(member.role);
              return (
                <div key={member.id} className="glass-card-hover p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                        {member.full_name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{member.full_name}</h3>
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', roleConfig.color)}>
                          {roleConfig.label}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {member.taskCount !== undefined && member.taskCount > 0 && (
                        <span className="text-xs text-warning bg-warning/20 px-2 py-0.5 rounded-full">{member.taskCount} active</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2"><Mail size={12} />{member.email}</div>
                    {member.phone && <div className="flex items-center gap-2"><Phone size={12} />{member.phone}</div>}
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" onClick={() => openEdit(member)} className="flex-1 gap-1.5 text-xs">
                      <Edit2 size={12} /> Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeleteModal({ open: true, member })} className="px-3 text-xs text-destructive hover:text-destructive hover:bg-destructive/10">
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {panelOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setPanelOpen(false)} />
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-sidebar border-l border-sidebar-border z-50 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-sidebar-border">
              <h2 className="text-xl font-display font-bold text-foreground">{editingMember ? 'Edit Member' : 'Add Team Member'}</h2>
              <button onClick={() => setPanelOpen(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="space-y-1.5"><Label>Full Name *</Label><Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Jane Doe" required /></div>
              {!editingMember && (
                <div className="space-y-1.5"><Label>Email *</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@example.com" required /></div>
              )}
              <div className="space-y-1.5"><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91 98765 43210" /></div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground">
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              {!editingMember && (
                <div className="space-y-1.5">
                  <Label>Password *</Label>
                  <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min. 8 characters" minLength={8} />
                  <p className="text-xs text-muted-foreground">They can change this after logging in.</p>
                </div>
              )}
              {editingMember && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Shield size={12} /> Email cannot be changed. Use password reset if needed.</p>
                </div>
              )}
            </form>
            <div className="p-6 border-t border-sidebar-border flex gap-3">
              <Button variant="outline" onClick={() => setPanelOpen(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1 gap-2">
                {saving && <Loader2 size={16} className="animate-spin" />}
                {editingMember ? 'Save Changes' : 'Add Member'}
              </Button>
            </div>
          </div>
        </>
      )}

      <ConfirmDeleteModal
        open={deleteModal.open}
        onOpenChange={(open) => !open && setDeleteModal({ open: false, member: null })}
        onConfirm={handleDelete}
        title="Permanently Delete Team Member"
        description={`This action is permanent and cannot be undone. ${deleteModal.member?.full_name} (${getRoleConfig(deleteModal.member?.role || '').label}) will lose all access immediately.`}
      />
    </AdminLayout>
  );
}
