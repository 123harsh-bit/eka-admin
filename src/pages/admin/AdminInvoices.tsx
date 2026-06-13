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
import { Plus, IndianRupee, Wallet, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Invoice {
  id: string;
  invoice_number: string;
  client_id: string;
  amount: number;
  currency: string;
  status: 'draft' | 'sent' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';
  issue_date: string;
  due_date: string | null;
  paid_at: string | null;
  notes: string | null;
}

interface Payment {
  id: string;
  invoice_id: string;
  amount: number;
  paid_on: string;
  payment_method: string | null;
  notes: string | null;
}

interface Client { id: string; name: string; }

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  sent: 'bg-blue-500/20 text-blue-400',
  partially_paid: 'bg-warning/20 text-warning',
  paid: 'bg-success/20 text-success',
  overdue: 'bg-destructive/20 text-destructive',
  cancelled: 'bg-muted text-muted-foreground line-through',
};

export default function AdminInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [view, setView] = useState<'by_client' | 'list'>('by_client');
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [payOpen, setPayOpen] = useState<Invoice | null>(null);
  const [payForm, setPayForm] = useState({ amount: '', paid_on: '', payment_method: 'Bank transfer', notes: '' });
  const [draft, setDraft] = useState({
    invoice_number: '', client_id: '', amount: '', currency: 'INR', due_date: '', notes: '',
  });

  const load = async () => {
    setLoading(true);
    const [{ data: inv }, { data: cl }, { data: pays }] = await Promise.all([
      supabase.from('invoices').select('*').order('issue_date', { ascending: false }),
      supabase.from('clients').select('id,name').eq('is_active', true).order('name'),
      (supabase as any).from('invoice_payments').select('*').order('paid_on', { ascending: false }),
    ]);
    const today = new Date().toISOString().slice(0, 10);
    const list = ((inv || []) as Invoice[]).map(i =>
      (i.status === 'sent' || i.status === 'partially_paid') && i.due_date && i.due_date < today
        ? { ...i, status: 'overdue' as const } : i
    );
    setInvoices(list);
    setClients((cl || []) as Client[]);
    setPayments((pays || []) as Payment[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const paidFor = (id: string) => payments.filter(p => p.invoice_id === id).reduce((s, p) => s + Number(p.amount), 0);

  const filtered = useMemo(
    () => filter === 'all' ? invoices : invoices.filter(i => i.status === filter),
    [invoices, filter]
  );

  const totals = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    let outstanding = 0, paidThisMonth = 0, overdueCount = 0;
    invoices.forEach(i => {
      const paid = paidFor(i.id);
      if (['sent', 'overdue', 'partially_paid'].includes(i.status)) outstanding += Math.max(0, Number(i.amount) - paid);
      if (i.status === 'overdue') overdueCount += 1;
    });
    payments.forEach(p => { if (p.paid_on >= monthStart) paidThisMonth += Number(p.amount); });
    return { outstanding, paidThisMonth, overdueCount };
  }, [invoices, payments]);

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
    const patch: any = { status };
    if (status === 'paid') patch.paid_at = new Date().toISOString();
    if (status === 'sent') patch.sent_at = new Date().toISOString();
    const { error } = await supabase.from('invoices').update(patch).eq('id', id);
    if (error) return toast.error(error.message);
    load();
  };

  const openPayDialog = (inv: Invoice) => {
    const remaining = Number(inv.amount) - paidFor(inv.id);
    setPayForm({
      amount: remaining > 0 ? remaining.toString() : '',
      paid_on: new Date().toISOString().slice(0, 10),
      payment_method: 'Bank transfer',
      notes: '',
    });
    setPayOpen(inv);
  };

  const recordPayment = async () => {
    if (!payOpen) return;
    const amt = parseFloat(payForm.amount);
    if (!amt || amt <= 0) return toast.error('Enter a valid amount');
    const { error } = await (supabase as any).from('invoice_payments').insert({
      invoice_id: payOpen.id,
      amount: amt,
      paid_on: payForm.paid_on || new Date().toISOString().slice(0, 10),
      payment_method: payForm.payment_method || null,
      notes: payForm.notes || null,
    });
    if (error) return toast.error(error.message);
    // recompute & update invoice status
    const newPaid = paidFor(payOpen.id) + amt;
    const total = Number(payOpen.amount);
    let newStatus: Invoice['status'] = payOpen.status;
    const patch: any = {};
    if (newPaid >= total) { newStatus = 'paid'; patch.paid_at = new Date().toISOString(); }
    else if (newPaid > 0) { newStatus = 'partially_paid'; patch.paid_at = null; }
    patch.status = newStatus;
    await supabase.from('invoices').update(patch).eq('id', payOpen.id);
    toast.success('Payment recorded');
    setPayOpen(null);
    load();
  };

  const deletePayment = async (id: string, invId: string) => {
    if (!confirm('Delete this payment?')) return;
    const { error } = await (supabase as any).from('invoice_payments').delete().eq('id', id);
    if (error) return toast.error(error.message);
    // recalc status
    const inv = invoices.find(i => i.id === invId);
    if (inv) {
      const remainingPays = payments.filter(p => p.invoice_id === invId && p.id !== id);
      const newPaid = remainingPays.reduce((s, p) => s + Number(p.amount), 0);
      const total = Number(inv.amount);
      let newStatus: Invoice['status'] = 'sent';
      const patch: any = { paid_at: null };
      if (newPaid >= total) { newStatus = 'paid'; patch.paid_at = new Date().toISOString(); }
      else if (newPaid > 0) newStatus = 'partially_paid';
      patch.status = newStatus;
      await supabase.from('invoices').update(patch).eq('id', invId);
    }
    load();
  };

  const clientName = (id: string) => clients.find(c => c.id === id)?.name || '—';

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Invoices</h1>
            <p className="text-muted-foreground mt-1">Track billing, advances & partial payments</p>
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
                  <Input className="col-span-2" type="number" placeholder="Total amount" value={draft.amount} onChange={e => setDraft(d => ({ ...d, amount: e.target.value }))} />
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
                <p className="text-xs text-muted-foreground">Tip: enter the full amount here. Record the advance and remaining payments separately using the “Record payment” button.</p>
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
            <p className="text-sm text-muted-foreground">Collected this month</p>
            <p className="text-2xl font-bold flex items-center gap-1 text-success"><IndianRupee className="w-5 h-5" />{totals.paidThisMonth.toLocaleString()}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Overdue</p>
            <p className="text-2xl font-bold text-destructive">{totals.overdueCount}</p>
          </Card>
        </div>

        <Tabs value={view} onValueChange={v => setView(v as 'by_client' | 'list')}>
          <TabsList>
            <TabsTrigger value="by_client">By client</TabsTrigger>
            <TabsTrigger value="list">All invoices</TabsTrigger>
          </TabsList>
        </Tabs>

        {view === 'by_client' && !loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {clients.map(c => {
              const clientInvs = invoices.filter(i => i.client_id === c.id && i.status !== 'cancelled');
              if (clientInvs.length === 0) return null;
              const totalBilled = clientInvs.reduce((s, i) => s + Number(i.amount), 0);
              const totalPaid = clientInvs.reduce((s, i) => s + paidFor(i.id), 0);
              const remaining = totalBilled - totalPaid;
              const oldestUnpaid = clientInvs
                .filter(i => Number(i.amount) - paidFor(i.id) > 0)
                .sort((a, b) => (a.due_date || '9999').localeCompare(b.due_date || '9999'))[0];
              return (
                <Card key={c.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{c.name}</h3>
                      <p className="text-xs text-muted-foreground">{clientInvs.length} invoice{clientInvs.length !== 1 ? 's' : ''}</p>
                    </div>
                    {remaining > 0 ? (
                      <Badge className="bg-warning/20 text-warning">{clientInvs[0].currency} {remaining.toLocaleString()} due</Badge>
                    ) : (
                      <Badge className="bg-success/20 text-success">All clear</Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded bg-muted/30 p-2">
                      <p className="text-muted-foreground">Billed</p>
                      <p className="font-semibold text-sm">{totalBilled.toLocaleString()}</p>
                    </div>
                    <div className="rounded bg-success/10 p-2">
                      <p className="text-success/80">Paid</p>
                      <p className="font-semibold text-sm text-success">{totalPaid.toLocaleString()}</p>
                    </div>
                    <div className="rounded bg-warning/10 p-2">
                      <p className="text-warning/80">Remaining</p>
                      <p className="font-semibold text-sm text-warning">{remaining.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-success transition-all" style={{ width: `${totalBilled > 0 ? (totalPaid / totalBilled) * 100 : 0}%` }} />
                  </div>
                  {oldestUnpaid && (
                    <Button size="sm" variant="outline" className="w-full gap-1.5" onClick={() => openPayDialog(oldestUnpaid)}>
                      <Wallet size={14} /> Record payment ({oldestUnpaid.invoice_number})
                    </Button>
                  )}
                </Card>
              );
            })}
            {clients.every(c => invoices.filter(i => i.client_id === c.id && i.status !== 'cancelled').length === 0) && (
              <p className="text-muted-foreground col-span-2 text-center py-12">No invoices yet. Create one to get started.</p>
            )}
          </div>
        )}

        {view === 'list' && (
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="draft">Draft</TabsTrigger>
              <TabsTrigger value="sent">Sent</TabsTrigger>
              <TabsTrigger value="partially_paid">Partial</TabsTrigger>
              <TabsTrigger value="overdue">Overdue</TabsTrigger>
              <TabsTrigger value="paid">Paid</TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        {view === 'list' && (loading ? <p>Loading…</p> : (
          <div className="space-y-2">
            {filtered.map(i => {
              const paid = paidFor(i.id);
              const remaining = Math.max(0, Number(i.amount) - paid);
              const pct = Number(i.amount) > 0 ? Math.min(100, (paid / Number(i.amount)) * 100) : 0;
              return (
                <Card key={i.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold">{i.invoice_number}</span>
                        <Badge className={STATUS_COLORS[i.status]}>{i.status.replace('_', ' ')}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {clientName(i.client_id)} · Issued {format(new Date(i.issue_date), 'd MMM yyyy')}
                        {i.due_date && ` · Due ${format(new Date(i.due_date), 'd MMM')}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold">{i.currency} {Number(i.amount).toLocaleString()}</p>
                      {paid > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Paid <span className="text-success font-medium">{paid.toLocaleString()}</span> · Remaining <span className="text-warning font-medium">{remaining.toLocaleString()}</span>
                        </p>
                      )}
                    </div>
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => openPayDialog(i)} disabled={remaining <= 0}>
                      <Wallet size={14} /> Record payment
                    </Button>
                    <Select value={i.status} onValueChange={v => setStatus(i.id, v as Invoice['status'])}>
                      <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                        <SelectItem value="partially_paid">Partially paid</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {paid > 0 && (
                    <div className="space-y-2">
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-success transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="space-y-1">
                        {payments.filter(p => p.invoice_id === i.id).map(p => (
                          <div key={p.id} className="flex items-center justify-between text-xs text-muted-foreground bg-muted/30 rounded px-2 py-1">
                            <span>{format(new Date(p.paid_on), 'd MMM yyyy')} · {p.payment_method || '—'} {p.notes && `· ${p.notes}`}</span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-medium text-foreground">{i.currency} {Number(p.amount).toLocaleString()}</span>
                              <button onClick={() => deletePayment(p.id, i.id)} className="text-destructive hover:opacity-70"><Trash2 size={12} /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
            {filtered.length === 0 && <p className="text-muted-foreground text-center py-12">No invoices in this view.</p>}
          </div>
        ))}
      </div>

      <Dialog open={!!payOpen} onOpenChange={o => !o && setPayOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record payment</DialogTitle>
          </DialogHeader>
          {payOpen && (
            <div className="space-y-3">
              <div className="bg-muted/30 rounded p-3 text-sm space-y-1">
                <p><span className="text-muted-foreground">Invoice:</span> <span className="font-mono">{payOpen.invoice_number}</span></p>
                <p><span className="text-muted-foreground">Total:</span> {payOpen.currency} {Number(payOpen.amount).toLocaleString()}</p>
                <p><span className="text-muted-foreground">Already paid:</span> {payOpen.currency} {paidFor(payOpen.id).toLocaleString()}</p>
                <p className="font-medium"><span className="text-muted-foreground">Remaining:</span> {payOpen.currency} {(Number(payOpen.amount) - paidFor(payOpen.id)).toLocaleString()}</p>
              </div>
              <Input type="number" placeholder="Amount received" value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} />
              <Input type="date" value={payForm.paid_on} onChange={e => setPayForm(f => ({ ...f, paid_on: e.target.value }))} />
              <Input placeholder="Payment method (Bank / UPI / Cash)" value={payForm.payment_method} onChange={e => setPayForm(f => ({ ...f, payment_method: e.target.value }))} />
              <Input placeholder="Notes (e.g. Advance, Final settlement)" value={payForm.notes} onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))} />
              <Button onClick={recordPayment} className="w-full">Save payment</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
