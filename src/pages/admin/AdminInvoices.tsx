import { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, IndianRupee, Wallet, Trash2, Search, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { format, differenceInCalendarDays } from 'date-fns';
import { cn } from '@/lib/utils';

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

type QuickFilter = 'unpaid' | 'overdue' | 'partial' | 'paid' | 'all';

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  sent: 'Sent',
  partially_paid: 'Part-paid',
  paid: 'Paid',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  sent: 'bg-blue-500/20 text-blue-400',
  partially_paid: 'bg-warning/20 text-warning',
  paid: 'bg-success/20 text-success',
  overdue: 'bg-destructive/20 text-destructive',
  cancelled: 'bg-muted text-muted-foreground line-through',
};

const QUICK_FILTERS: { key: QuickFilter; label: string }[] = [
  { key: 'unpaid', label: 'Unpaid' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'partial', label: 'Part-paid' },
  { key: 'paid', label: 'Paid' },
  { key: 'all', label: 'All' },
];

export default function AdminInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [filter, setFilter] = useState<QuickFilter>('unpaid');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [drawerId, setDrawerId] = useState<string | null>(null);
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
  const remainingFor = (i: Invoice) => Math.max(0, Number(i.amount) - paidFor(i.id));
  const clientName = (id: string) => clients.find(c => c.id === id)?.name || '—';

  const drawerInvoice = invoices.find(i => i.id === drawerId) || null;

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invoices
      .filter(i => i.status !== 'cancelled')
      .filter(i => {
        const rem = remainingFor(i);
        if (filter === 'unpaid') return rem > 0;
        if (filter === 'overdue') return i.status === 'overdue';
        if (filter === 'partial') return paidFor(i.id) > 0 && rem > 0;
        if (filter === 'paid') return rem === 0;
        return true;
      })
      .filter(i => !q || i.invoice_number.toLowerCase().includes(q) || clientName(i.client_id).toLowerCase().includes(q))
      .sort((a, b) => (a.due_date || '9999').localeCompare(b.due_date || '9999'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoices, payments, clients, filter, search]);

  const totals = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    let outstanding = 0, paidThisMonth = 0, overdueCount = 0;
    invoices.forEach(i => {
      if (i.status === 'cancelled') return;
      if (['sent', 'overdue', 'partially_paid'].includes(i.status)) outstanding += remainingFor(i);
      if (i.status === 'overdue') overdueCount += 1;
    });
    payments.forEach(p => { if (p.paid_on >= monthStart) paidThisMonth += Number(p.amount); });
    return { outstanding, paidThisMonth, overdueCount };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoices, payments]);

  // Per-client rollup — only clients that owe something
  const clientRollups = useMemo(() => {
    return clients.map(c => {
      const list = invoices.filter(i => i.client_id === c.id && i.status !== 'cancelled');
      const billed = list.reduce((s, i) => s + Number(i.amount), 0);
      const paid = list.reduce((s, i) => s + paidFor(i.id), 0);
      const outstanding = list.reduce((s, i) => s + remainingFor(i), 0);
      const nextDue = list
        .filter(i => remainingFor(i) > 0 && i.due_date)
        .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''))[0];
      return { client: c, count: list.length, billed, paid, outstanding, nextDue };
    }).filter(r => r.outstanding > 0).sort((a, b) => b.outstanding - a.outstanding);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients, invoices, payments]);

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

  const openDrawer = (inv: Invoice) => {
    const remaining = remainingFor(inv);
    setPayForm({
      amount: remaining > 0 ? remaining.toString() : '',
      paid_on: new Date().toISOString().slice(0, 10),
      payment_method: 'Bank transfer',
      notes: '',
    });
    setDrawerId(inv.id);
  };

  const recordPayment = async () => {
    if (!drawerInvoice) return;
    const amt = parseFloat(payForm.amount);
    if (!amt || amt <= 0) return toast.error('Enter a valid amount');
    const { error } = await (supabase as any).from('invoice_payments').insert({
      invoice_id: drawerInvoice.id,
      amount: amt,
      paid_on: payForm.paid_on || new Date().toISOString().slice(0, 10),
      payment_method: payForm.payment_method || null,
      notes: payForm.notes || null,
    });
    if (error) return toast.error(error.message);
    const newPaid = paidFor(drawerInvoice.id) + amt;
    const total = Number(drawerInvoice.amount);
    const patch: any = {};
    if (newPaid >= total) { patch.status = 'paid'; patch.paid_at = new Date().toISOString(); }
    else { patch.status = 'partially_paid'; patch.paid_at = null; }
    await supabase.from('invoices').update(patch).eq('id', drawerInvoice.id);
    toast.success('Payment recorded');
    setPayForm(f => ({ ...f, amount: '', notes: '' }));
    load();
  };

  const deletePayment = async (id: string, invId: string) => {
    if (!confirm('Delete this payment?')) return;
    const { error } = await (supabase as any).from('invoice_payments').delete().eq('id', id);
    if (error) return toast.error(error.message);
    const inv = invoices.find(i => i.id === invId);
    if (inv) {
      const newPaid = payments.filter(p => p.invoice_id === invId && p.id !== id).reduce((s, p) => s + Number(p.amount), 0);
      const patch: any = { paid_at: null, status: 'sent' as Invoice['status'] };
      if (newPaid >= Number(inv.amount)) { patch.status = 'paid'; patch.paid_at = new Date().toISOString(); }
      else if (newPaid > 0) patch.status = 'partially_paid';
      await supabase.from('invoices').update(patch).eq('id', invId);
    }
    load();
  };

  const deleteInvoice = async (id: string, invoiceNumber: string) => {
    if (!confirm(`Delete invoice ${invoiceNumber}? This also removes all recorded payments for it. This cannot be undone.`)) return;
    await (supabase as any).from('invoice_payments').delete().eq('invoice_id', id);
    const { error } = await supabase.from('invoices').delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Invoice deleted');
    setDrawerId(null);
    load();
  };

  const dueLabel = (i: Invoice) => {
    if (remainingFor(i) === 0) return 'Settled';
    if (!i.due_date) return 'No due date';
    const days = differenceInCalendarDays(new Date(i.due_date), new Date());
    if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue`;
    if (days === 0) return 'Due today';
    return `Due in ${days} day${days === 1 ? '' : 's'}`;
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold">Invoices</h1>
            <p className="text-muted-foreground mt-1">Every invoice shows Total · Paid · Remaining. Click a row to record or review payments.</p>
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
                <p className="text-xs text-muted-foreground">Enter the full amount here. Advances and balance payments are recorded separately on the invoice.</p>
                <Button onClick={create} className="w-full">Create</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Top rollup */}
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
            <p className="text-sm text-muted-foreground">Overdue invoices</p>
            <p className="text-2xl font-bold text-destructive">{totals.overdueCount}</p>
          </Card>
        </div>

        {/* Who owes what */}
        {clientRollups.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Who owes what</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {clientRollups.map(r => (
                <Card key={r.client.id} className="p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium truncate">{r.client.name}</span>
                    <Badge className="bg-warning/20 text-warning shrink-0">{r.outstanding.toLocaleString()} due</Badge>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-success" style={{ width: `${r.billed > 0 ? (r.paid / r.billed) * 100 : 0}%` }} />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {r.count} invoice{r.count === 1 ? '' : 's'} · paid {r.paid.toLocaleString()} of {r.billed.toLocaleString()}
                    {r.nextDue?.due_date && ` · next due ${format(new Date(r.nextDue.due_date), 'd MMM')}`}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-md border border-input overflow-hidden">
            {QUICK_FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn('h-9 px-3 text-sm transition-colors border-r border-input last:border-r-0',
                  filter === f.key ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:text-foreground')}
              >{f.label}</button>
            ))}
          </div>
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search invoice number or client…" className="pl-8 h-9" />
          </div>
        </div>

        {/* One line per invoice */}
        {loading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : visible.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">No invoices in this view.</p>
        ) : (
          <div className="space-y-2">
            {visible.map(i => {
              const paid = paidFor(i.id);
              const remaining = remainingFor(i);
              const pct = Number(i.amount) > 0 ? Math.min(100, (paid / Number(i.amount)) * 100) : 0;
              return (
                <Card
                  key={i.id}
                  onClick={() => openDrawer(i)}
                  className="p-4 cursor-pointer hover:border-primary/50 transition-colors space-y-2"
                >
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex-1 min-w-[180px]">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold">{i.invoice_number}</span>
                        <Badge className={STATUS_COLORS[i.status]}>{STATUS_LABEL[i.status]}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{clientName(i.client_id)}</p>
                    </div>
                    <div className="flex items-center gap-5 text-sm">
                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</p>
                        <p className="font-semibold">{i.currency} {Number(i.amount).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Paid</p>
                        <p className="font-semibold text-success">{paid.toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Remaining</p>
                        <p className={cn('font-semibold', remaining > 0 ? 'text-warning' : 'text-muted-foreground')}>{remaining.toLocaleString()}</p>
                      </div>
                      <div className="text-right min-w-28">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Due</p>
                        <p className={cn('font-medium flex items-center gap-1 justify-end',
                          i.status === 'overdue' ? 'text-destructive' : 'text-foreground')}>
                          {i.status === 'overdue' && <AlertTriangle size={12} />}{dueLabel(i)}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={e => { e.stopPropagation(); openDrawer(i); }}>
                      <Wallet size={14} /> Payments
                    </Button>
                  </div>
                  {paid > 0 && (
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-success transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Payment drawer */}
      <Sheet open={!!drawerInvoice} onOpenChange={o => !o && setDrawerId(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {drawerInvoice && (
            <>
              <SheetHeader>
                <SheetTitle className="font-mono">{drawerInvoice.invoice_number}</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-5">
                <div className="rounded-lg bg-muted/30 p-3 text-sm space-y-1">
                  <p><span className="text-muted-foreground">Client:</span> {clientName(drawerInvoice.client_id)}</p>
                  <p><span className="text-muted-foreground">Total:</span> {drawerInvoice.currency} {Number(drawerInvoice.amount).toLocaleString()}</p>
                  <p><span className="text-muted-foreground">Paid:</span> <span className="text-success">{paidFor(drawerInvoice.id).toLocaleString()}</span></p>
                  <p className="font-medium"><span className="text-muted-foreground">Remaining:</span> <span className="text-warning">{remainingFor(drawerInvoice).toLocaleString()}</span></p>
                  <p><span className="text-muted-foreground">Issued:</span> {format(new Date(drawerInvoice.issue_date), 'd MMM yyyy')}
                    {drawerInvoice.due_date && ` · ${dueLabel(drawerInvoice)}`}</p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Payment history</p>
                  {payments.filter(p => p.invoice_id === drawerInvoice.id).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
                  ) : payments.filter(p => p.invoice_id === drawerInvoice.id).map(p => (
                    <div key={p.id} className="flex items-center justify-between text-xs bg-muted/30 rounded px-2 py-1.5">
                      <span className="text-muted-foreground">
                        {format(new Date(p.paid_on), 'd MMM yyyy')} · {p.payment_method || '—'}{p.notes && ` · ${p.notes}`}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium text-foreground">{drawerInvoice.currency} {Number(p.amount).toLocaleString()}</span>
                        <button onClick={() => deletePayment(p.id, drawerInvoice.id)} className="text-destructive hover:opacity-70"><Trash2 size={12} /></button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Record a payment</p>
                  <Input type="number" placeholder="Amount received" value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} />
                  <Input type="date" value={payForm.paid_on} onChange={e => setPayForm(f => ({ ...f, paid_on: e.target.value }))} />
                  <Input placeholder="Payment method (Bank / UPI / Cash)" value={payForm.payment_method} onChange={e => setPayForm(f => ({ ...f, payment_method: e.target.value }))} />
                  <Input placeholder="Notes (e.g. Advance, Final settlement)" value={payForm.notes} onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))} />
                  <Button onClick={recordPayment} className="w-full">Save payment</Button>
                </div>

                <div className="space-y-2 pt-2 border-t border-border">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Invoice status</p>
                  <Select value={drawerInvoice.status} onValueChange={v => setStatus(drawerInvoice.id, v as Invoice['status'])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="partially_paid">Partially paid</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
                    onClick={() => deleteInvoice(drawerInvoice.id, drawerInvoice.invoice_number)}
                  >
                    <Trash2 size={14} /> Delete invoice
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </AdminLayout>
  );
}
