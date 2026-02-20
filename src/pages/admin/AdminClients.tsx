import { useState, useEffect, useRef } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { ClientPortalAccess } from '@/components/admin/ClientPortalAccess';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ConfirmDeleteModal } from '@/components/shared/ConfirmDeleteModal';
import { useToast } from '@/hooks/use-toast';
import {
  Plus, Search, X, Users, Building2, Phone, Mail,
  Calendar, Edit2, Trash2, ToggleLeft, ToggleRight, Upload, Loader2, KeyRound
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  industry: string | null;
  contact_person: string | null;
  project_title: string | null;
  logo_url: string | null;
  is_active: boolean;
  monthly_deliverables: number | null;
  contract_start: string | null;
  contract_end: string | null;
  notes: string | null;
  created_at: string;
  user_id: string | null;
}

const INDUSTRIES = ['Technology', 'E-commerce', 'Health & Fitness', 'Real Estate', 'Education', 'Food & Beverage', 'Fashion', 'Finance', 'Travel', 'Entertainment', 'Other'];

const emptyForm = {
  name: '', email: '', phone: '', industry: '', contact_person: '',
  project_title: '', notes: '', monthly_deliverables: '', contract_start: '', contract_end: '',
};

export default function AdminClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; client: Client | null }>({ open: false, client: null });
  const logoInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => { fetchClients(); }, []);

  const fetchClients = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
    if (!error && data) setClients(data);
    setLoading(false);
  };

  const openAdd = () => {
    setEditingClient(null);
    setForm(emptyForm);
    setLogoFile(null);
    setLogoPreview(null);
    setPanelOpen(true);
  };

  const openEdit = (client: Client) => {
    setEditingClient(client);
    setForm({
      name: client.name, email: client.email || '', phone: client.phone || '',
      industry: client.industry || '', contact_person: client.contact_person || '',
      project_title: client.project_title || '', notes: client.notes || '',
      monthly_deliverables: client.monthly_deliverables?.toString() || '',
      contract_start: client.contract_start || '', contract_end: client.contract_end || '',
    });
    setLogoPreview(client.logo_url);
    setLogoFile(null);
    setPanelOpen(true);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const uploadLogo = async (clientId: string): Promise<string | null> => {
    if (!logoFile) return editingClient?.logo_url || null;
    const ext = logoFile.name.split('.').pop();
    const path = `${clientId}/logo.${ext}`;
    const { error } = await supabase.storage.from('client-logos').upload(path, logoFile, { upsert: true });
    if (error) return null;
    const { data } = supabase.storage.from('client-logos').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);

    try {
      const clientId = editingClient?.id || crypto.randomUUID();
      const logoUrl = await uploadLogo(clientId);

      const payload = {
        name: form.name.trim(),
        email: form.email || null,
        phone: form.phone || null,
        industry: form.industry || null,
        contact_person: form.contact_person || null,
        project_title: form.project_title || null,
        notes: form.notes || null,
        monthly_deliverables: form.monthly_deliverables ? parseInt(form.monthly_deliverables) : null,
        contract_start: form.contract_start || null,
        contract_end: form.contract_end || null,
        logo_url: logoUrl,
      };

      if (editingClient) {
        const { error } = await supabase.from('clients').update(payload).eq('id', editingClient.id);
        if (error) throw error;
        await supabase.from('activity_log').insert({ entity_type: 'client', entity_id: editingClient.id, action: 'updated', details: { name: form.name } });
        toast({ title: 'Client updated', description: `${form.name} has been updated.` });
      } else {
        const { data, error } = await supabase.from('clients').insert({ id: clientId, ...payload }).select().single();
        if (error) throw error;
        await supabase.from('activity_log').insert({ entity_type: 'client', entity_id: data.id, action: 'created', details: { name: form.name } });
        toast({ title: 'Client added', description: `${form.name} has been added.` });
      }

      await fetchClients();
      setPanelOpen(false);
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Something went wrong', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (client: Client) => {
    const { error } = await supabase.from('clients').update({ is_active: !client.is_active }).eq('id', client.id);
    if (!error) {
      setClients(prev => prev.map(c => c.id === client.id ? { ...c, is_active: !c.is_active } : c));
      toast({ title: client.is_active ? 'Client deactivated' : 'Client activated' });
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.client) return;
    const { error } = await supabase.from('clients').delete().eq('id', deleteModal.client.id);
    if (!error) {
      setClients(prev => prev.filter(c => c.id !== deleteModal.client!.id));
      toast({ title: 'Client deleted' });
    }
    setDeleteModal({ open: false, client: null });
  };

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.industry?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold gradient-text">Clients</h1>
            <p className="text-muted-foreground mt-1">{clients.length} total · {clients.filter(c => c.is_active).length} active</p>
          </div>
          <Button onClick={openAdd} className="gap-2">
            <Plus size={16} /> Add Client
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients…" className="pl-9" />
        </div>

        {/* Client Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <div key={i} className="glass-card h-48 animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-card p-16 text-center">
            <Users size={40} className="mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">{search ? 'No clients match your search.' : 'No clients yet. Add your first client.'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(client => (
              <div key={client.id} className={cn('glass-card-hover p-5 space-y-4', !client.is_active && 'opacity-60')}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {client.logo_url ? (
                      <img src={client.logo_url} alt={client.name} className="h-10 w-10 rounded-lg object-contain bg-muted" />
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                        {client.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-foreground">{client.name}</h3>
                      {client.industry && <p className="text-xs text-muted-foreground">{client.industry}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
                      client.is_active ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'
                    )}>
                      {client.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <span className={cn('h-2.5 w-2.5 rounded-full', client.user_id ? 'bg-success' : 'bg-destructive')}
                      title={client.user_id ? 'Portal active' : 'No portal access'} />
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-muted-foreground">
                  {client.email && <div className="flex items-center gap-2"><Mail size={12} />{client.email}</div>}
                  {client.phone && <div className="flex items-center gap-2"><Phone size={12} />{client.phone}</div>}
                  {client.contact_person && <div className="flex items-center gap-2"><Users size={12} />{client.contact_person}</div>}
                  {client.project_title && <div className="flex items-center gap-2"><Building2 size={12} />{client.project_title}</div>}
                  {(client.contract_start || client.contract_end) && (
                    <div className="flex items-center gap-2">
                      <Calendar size={12} />
                      {client.contract_start && new Date(client.contract_start).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                      {client.contract_start && client.contract_end && ' – '}
                      {client.contract_end && new Date(client.contract_end).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                    </div>
                  )}
                  {client.monthly_deliverables != null && (
                    <p><span className="font-medium text-foreground">{client.monthly_deliverables}</span> deliverables/month</p>
                  )}
                </div>

                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => openEdit(client)} className="flex-1 gap-1.5 text-xs">
                    <Edit2 size={12} /> Edit
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleToggleActive(client)} className="px-2">
                    {client.is_active ? <ToggleRight size={16} className="text-success" /> : <ToggleLeft size={16} className="text-muted-foreground" />}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setDeleteModal({ open: true, client })} className="px-2 hover:text-destructive">
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Slide-in Panel */}
      {panelOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setPanelOpen(false)} />
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-sidebar border-l border-sidebar-border z-50 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-sidebar-border">
              <h2 className="text-xl font-display font-bold text-foreground">
                {editingClient ? 'Edit Client' : 'Add Client'}
              </h2>
              <button onClick={() => setPanelOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Logo upload */}
              <div className="flex items-center gap-4">
                <div
                  className="h-16 w-16 rounded-xl border-2 border-dashed border-glass-border bg-muted/30 flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors overflow-hidden"
                  onClick={() => logoInputRef.current?.click()}
                >
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" className="h-full w-full object-contain" />
                  ) : (
                    <Upload size={20} className="text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Client Logo</p>
                  <p className="text-xs text-muted-foreground">PNG, JPG up to 5MB</p>
                  <button type="button" onClick={() => logoInputRef.current?.click()} className="text-xs text-primary hover:underline mt-0.5">
                    {logoPreview ? 'Change logo' : 'Upload logo'}
                  </button>
                </div>
                <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Client Name *</Label>
                  <Input id="name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Acme Corp" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="project_title">Project / Brand Title</Label>
                  <Input id="project_title" value={form.project_title} onChange={e => setForm(f => ({ ...f, project_title: e.target.value }))} placeholder="YouTube Channel Growth" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contact_person">Contact Person</Label>
                  <Input id="contact_person" value={form.contact_person} onChange={e => setForm(f => ({ ...f, contact_person: e.target.value }))} placeholder="John Doe" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="john@acme.com" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91 98765 43210" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="industry">Industry</Label>
                  <select
                    id="industry"
                    value={form.industry}
                    onChange={e => setForm(f => ({ ...f, industry: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  >
                    <option value="">Select industry…</option>
                    {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="monthly_deliverables">Monthly Deliverables</Label>
                  <Input id="monthly_deliverables" type="number" min="0" value={form.monthly_deliverables} onChange={e => setForm(f => ({ ...f, monthly_deliverables: e.target.value }))} placeholder="8" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="contract_start">Contract Start</Label>
                    <Input id="contract_start" type="date" value={form.contract_start} onChange={e => setForm(f => ({ ...f, contract_start: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="contract_end">Contract End</Label>
                    <Input id="contract_end" type="date" value={form.contract_end} onChange={e => setForm(f => ({ ...f, contract_end: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="notes">Notes</Label>
                  <textarea
                    id="notes"
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Internal notes about this client…"
                    rows={3}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none"
                  />
                </div>
              </div>

              {/* Client Portal Access - only show when editing */}
              {editingClient && (
                <div className="border-t border-glass-border pt-4">
                  <ClientPortalAccess
                    clientId={editingClient.id}
                    clientEmail={editingClient.email}
                    clientName={editingClient.name}
                    userId={editingClient.user_id}
                    onUpdate={fetchClients}
                  />
                </div>
              )}
            </form>

            <div className="p-6 border-t border-sidebar-border flex gap-3">
              <Button variant="outline" onClick={() => setPanelOpen(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1 gap-2">
                {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                {editingClient ? 'Save Changes' : 'Add Client'}
              </Button>
            </div>
          </div>
        </>
      )}

      <ConfirmDeleteModal
        open={deleteModal.open}
        onOpenChange={(open) => !open && setDeleteModal({ open: false, client: null })}
        onConfirm={handleDelete}
        title="Delete Client"
        description={`This will permanently delete "${deleteModal.client?.name}" and all associated data. This cannot be undone.`}
      />
    </AdminLayout>
  );
}
