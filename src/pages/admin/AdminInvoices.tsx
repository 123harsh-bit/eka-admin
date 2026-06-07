import { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, IndianRupee } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Invoice {
  id: string;
  invoice_number: string;
  client_id: string;
  amount: number;
  currency: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  issue_date: string;
  due_date: string | null;
  paid_at: string | null;
  notes: string | null;
}

interface Client { id: string; name: string; }

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  sent: 'bg-blue-500/20 text-blue-400',
  paid: 'bg-success/20 text-success',
  overdue: 'bg-destructive/20 text-destructive',
  cancelled: 'bg-muted text-muted-foreground line-through',
};

export default function AdminInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({
    invoice_number: '', client_id: '', amount: '', currency: 'INR', due_date: '', notes: '',
  });

  const load = async () => {
    setLoading(true);
    const [{ data: inv }, { data: cl }] = await Promise.all([
      supabase.from('invoices').select('*').order('issue_date', { ascending: false }),
      supabase.from('clients').select('id,name').eq('is_active', true).order('name'),
    ]);
    // auto-mark overdue
    const today = new Date().toISOString().slice(0, 10);
    const list = ((inv || []) as Invoice[]).map(i =>
      i.status === 'sent' && i.due_date && i.due_date < today ? { ...i, status: 'overdue' as const } : i
    );
    setInvoices(list);
    setClients((cl || []) as Client[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(
    () => filter === 'all' ? invoices : invoices.filter(i => i.status === filter),
    [invoices, filter]
  );

  const totals = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const thisMonth = invoices.filter(i => i.issue_date >= monthStart);
    return {
      outstanding: invoices.filter(i => ['sent', 'overdue'].includes(i.status)).reduce((s, i) => s + Number(i.amount), 0),
      paidThisMonth: thisMonth.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.amount), 0),
      overdueCount: invoices.filter(i => i.status === 'overdue').length,
    };
  }, [invoices]);

  const create = async () => {
    if (!draft.invoice_number || !draft.client_id || !draft.amount) {
      return toast.error('Number, client and amount required');
    }
    const { error } = await supabase.from('invoices').insert({
      invoice_number: draft.invoice_number,
      client_id: draft.client_id,
      amount: Number(draft.amount),
      currency: draft.currency,
      due_date: draft.due_date || null,
      notes: draft.notes || null,
    });
    if (error) return toast.error(error.message);
    toast.success('Invoice created');
    setOpen(false);
    setDraft({ invoice_number: '', client_id: '', amount: '', currency: 'INR', due_date: '', notes: '' });
    load();
  };

  const setStatus = async (id: string, status: Invoice['status']) => {
    const patch: Partial<Invoice> = { status };
    if (status === 'paid') patch.paid_at = new Date().toISOString();
    if (status === 'sent') (patch as any).sent_at = new Date().toISOString();
    const { error } = await supabase.from('invoices').update(patch).eq('id', id);
    if (error) return toast.error(error.message);
    load();
  };

  const clientName = (id: string) => clients.find(c => c.id === id)?.name || '—';

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Invoices</h1>
            <p className="text-muted-foreground mt-1">Track billing & payments</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="gap-2"><Plus className="w-4 h-4" /> New invoice</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create invoice</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Invoice number (e.g. INV-2026-001)" value={draft.invoice_number} onChange={e => setDraft(d => ({ ...d, invoice_number: e.target.value }))} />
                <Select value={draft.client_id} onValueChange={v => setDraft(d => ({ ...d, client_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>
                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="grid grid-cols-3 gap-2">
                  <Input className="col-span-2" type="number" placeholder="Amount" value={draft.amount} onChange={e => setDraft(d => ({ ...d, amount: e.target.value }))} />
                  <Select value={draft.currency} onValueChange={v => setDraft(d => ({ ...d, currency: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">INR</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Input type="date" value={draft.due_date} onChange={e => setDraft(d => ({ ...d, due_date: e.target.value }))} />
                <Input placeholder="Notes (optional)" value={draft.notes} onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))} />
                <Button onClick={create} className="w-full">Create</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Outstanding</p>
            <p className="text-2xl font-bold flex items-center gap-1"><IndianRupee className="w-5 h-5" />{totals.outstanding.toLocaleString()}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Paid this month</p>
            <p className="text-2xl font-bold flex items-center gap-1 text-success"><IndianRupee className="w-5 h-5" />{totals.paidThisMonth.toLocaleString()}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Overdue</p>
            <p className="text-2xl font-bold text-destructive">{totals.overdueCount}</p>
          </Card>
        </div>

        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="draft">Draft</TabsTrigger>
            <TabsTrigger value="sent">Sent</TabsTrigger>
            <TabsTrigger value="overdue">Overdue</TabsTrigger>
            <TabsTrigger value="paid">Paid</TabsTrigger>
          </TabsList>
        </Tabs>

        {loading ? <p>Loading…</p> : (
          <div className="space-y-2">
            {filtered.map(i => (
              <Card key={i.id} className="p-4 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold">{i.invoice_number}</span>
                    <Badge className={STATUS_COLORS[i.status]}>{i.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {clientName(i.client_id)} · Issued {format(new Date(i.issue_date), 'd MMM yyyy')}
                    {i.due_date && ` · Due ${format(new Date(i.due_date), 'd MMM')}`}
                  </p>
                </div>
                <p className="text-lg font-semibold">{i.currency} {Number(i.amount).toLocaleString()}</p>
                <Select value={i.status} onValueChange={v => setStatus(i.id, v as Invoice['status'])}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </Card>
            ))}
            {filtered.length === 0 && <p className="text-muted-foreground text-center py-12">No invoices in this view.</p>}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
