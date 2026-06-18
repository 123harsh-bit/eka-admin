import { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Wallet, CheckCircle2, Clock, ChevronLeft, ChevronRight, Loader2, HandCoins, Trash2 } from 'lucide-react';

interface Member {
  id: string;
  full_name: string;
  email: string;
  designation: string | null;
  monthly_salary: number | null;
  salary_currency: string | null;
  joining_date: string | null;
  role: string;
}

interface Payment {
  id: string;
  user_id: string;
  period_month: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'skipped';
  paid_on: string | null;
  payment_method: string | null;
  notes: string | null;
}

interface Advance {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  requested_on: string;
  paid_on: string | null;
  status: 'requested' | 'paid' | 'rejected' | 'adjusted';
  reason: string | null;
  deduct_from_month: string | null;
  payment_method: string | null;
  notes: string | null;
}

const fmtINR = (n: number, c = 'INR') =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(n);

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
const defaultSalaryPeriod = () => {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth() - 1, 1);
};
const salaryDueDate = (period: Date) => new Date(period.getFullYear(), period.getMonth() + 1, 10);
type SalaryFilter = 'due' | 'paid' | 'all';

export default function AdminSalaries() {
  const [members, setMembers] = useState<Member[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(defaultSalaryPeriod);
  const [salaryFilter, setSalaryFilter] = useState<SalaryFilter>('due');
  const [editing, setEditing] = useState<{ member: Member; payment?: Payment } | null>(null);
  const [advanceFor, setAdvanceFor] = useState<Member | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ amount: '', status: 'paid', paid_on: '', payment_method: '', notes: '' });
  const [advForm, setAdvForm] = useState({ amount: '', paid_on: '', reason: '', payment_method: 'Bank transfer', deduct_from_month: '', status: 'paid' });
  const { toast } = useToast();

  const periodMonth = monthKey(cursor);
  const periodLabel = cursor.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const dueDate = salaryDueDate(cursor);

  const load = async () => {
    setLoading(true);
    const { data: roles } = await supabase.from('user_roles').select('user_id, role').not('role', 'eq', 'client');
    if (!roles) { setLoading(false); return; }
    const ids = roles.map(r => r.user_id);
    if (ids.length === 0) { setMembers([]); setPayments([]); setAdvances([]); setLoading(false); return; }
    const [profilesRes, { data: pays }, { data: advs }] = await Promise.all([
      (supabase.rpc as any)('admin_list_profiles'),
      (supabase as any).from('salary_payments').select('*').eq('period_month', periodMonth),
      (supabase as any).from('salary_advances').select('*').in('user_id', ids).order('requested_on', { ascending: false }),
    ]);
    const profiles = ((profilesRes as any).data || []).filter((p: any) => ids.includes(p.id));
    const roleMap: Record<string, string> = {};
    roles.forEach(r => { roleMap[r.user_id] = r.role; });
    const list: Member[] = (profiles || []).map((p: any) => ({
      id: p.id,
      full_name: p.full_name,
      email: p.email,
      designation: p.designation || null,
      monthly_salary: p.monthly_salary != null ? Number(p.monthly_salary) : null,
      salary_currency: p.salary_currency || 'INR',
      joining_date: p.joining_date || null,
      role: roleMap[p.id] || 'editor',
    })).sort((a, b) => a.full_name.localeCompare(b.full_name));
    setMembers(list);
    setPayments((pays as Payment[]) || []);
    setAdvances((advs as Advance[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [periodMonth]);

  const paymentFor = (uid: string) => payments.find(p => p.user_id === uid);
  // advances paid that should be deducted from THIS month's salary
  const advanceDeduction = (uid: string) =>
    advances
      .filter(a => a.user_id === uid && a.status === 'paid' && (a.deduct_from_month === periodMonth || (!a.deduct_from_month && a.paid_on && a.paid_on.slice(0, 7) === periodMonth.slice(0, 7))))
      .reduce((s, a) => s + Number(a.amount), 0);

  const totals = useMemo(() => {
    let due = 0, paid = 0, advTotal = 0;
    members.forEach(m => {
      if (!m.monthly_salary) return;
      const p = paymentFor(m.id);
      const amt = p ? Number(p.amount) : m.monthly_salary;
      due += amt;
      if (p?.status === 'paid') paid += Number(p.amount);
      advTotal += advanceDeduction(m.id);
    });
    return { due, paid, outstanding: Math.max(0, due - paid - advTotal), advances: advTotal };
  }, [members, payments, advances]);

  const openPay = (member: Member) => {
    const p = paymentFor(member.id);
    const adv = advanceDeduction(member.id);
    const suggested = (p?.amount ?? Math.max(0, (member.monthly_salary || 0) - adv)).toString();
    setEditing({ member, payment: p });
    setForm({
      amount: suggested,
      status: p?.status || 'paid',
      paid_on: p?.paid_on || new Date().toISOString().slice(0, 10),
      payment_method: p?.payment_method || 'Bank transfer',
      notes: p?.notes || (adv > 0 ? `Net of advance ${fmtINR(adv, member.salary_currency || 'INR')}` : ''),
    });
  };

  const savePayment = async () => {
    if (!editing) return;
    setSaving(true);
    const payload = {
      user_id: editing.member.id,
      period_month: periodMonth,
      amount: parseFloat(form.amount) || 0,
      currency: editing.member.salary_currency || 'INR',
      status: form.status,
      paid_on: form.status === 'paid' ? form.paid_on || null : null,
      payment_method: form.payment_method || null,
      notes: form.notes || null,
    };
    const { error } = editing.payment
      ? await (supabase as any).from('salary_payments').update(payload).eq('id', editing.payment.id)
      : await (supabase as any).from('salary_payments').insert(payload);
    setSaving(false);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Payment recorded' });
    setEditing(null);
    load();
  };

  const openAdvance = (m: Member) => {
    setAdvForm({
      amount: '',
      paid_on: new Date().toISOString().slice(0, 10),
      reason: '',
      payment_method: 'Bank transfer',
      deduct_from_month: periodMonth,
      status: 'paid',
    });
    setAdvanceFor(m);
  };

  const saveAdvance = async () => {
    if (!advanceFor) return;
    const amt = parseFloat(advForm.amount);
    if (!amt || amt <= 0) { toast({ title: 'Enter a valid amount', variant: 'destructive' }); return; }
    setSaving(true);
    const { error } = await (supabase as any).from('salary_advances').insert({
      user_id: advanceFor.id,
      amount: amt,
      currency: advanceFor.salary_currency || 'INR',
      status: advForm.status,
      paid_on: advForm.status === 'paid' ? (advForm.paid_on || null) : null,
      reason: advForm.reason || null,
      payment_method: advForm.payment_method || null,
      deduct_from_month: advForm.deduct_from_month || null,
    });
    setSaving(false);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Advance recorded' });
    setAdvanceFor(null);
    load();
  };

  const deleteAdvance = async (id: string) => {
    if (!confirm('Delete this advance?')) return;
    const { error } = await (supabase as any).from('salary_advances').delete().eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    load();
  };

  const setAdvanceStatus = async (id: string, status: Advance['status']) => {
    const patch: any = { status };
    if (status === 'paid') patch.paid_on = new Date().toISOString().slice(0, 10);
    await (supabase as any).from('salary_advances').update(patch).eq('id', id);
    load();
  };

  const shiftMonth = (d: number) => {
    const nx = new Date(cursor); nx.setMonth(nx.getMonth() + d); setCursor(nx);
  };

  const memberName = (uid: string) => members.find(m => m.id === uid)?.full_name || '—';
  const visibleMembers = useMemo(() => members.filter(m => {
    const p = payments.find(payment => payment.user_id === m.id);
    if (salaryFilter === 'all') return true;
    if (salaryFilter === 'paid') return p?.status === 'paid' || p?.status === 'skipped';
    return !p || p.status === 'pending';
  }), [members, payments, salaryFilter]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-display font-bold gradient-text">Salaries & Advances</h1>
            <p className="text-muted-foreground mt-1">Salary for each month is due by the 10th of the next month · Paid rows hide from Due</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Button variant="outline" size="sm" onClick={() => shiftMonth(-1)}><ChevronLeft size={14} /></Button>
            <Input
              type="month"
              value={periodMonth.slice(0, 7)}
              onChange={e => e.target.value && setCursor(new Date(`${e.target.value}-01T00:00:00`))}
              className="w-[155px] bg-muted text-center"
            />
            <Button variant="outline" size="sm" onClick={() => shiftMonth(1)}><ChevronRight size={14} /></Button>
          </div>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="text-sm text-muted-foreground">Showing {periodLabel} salary · Due {dueDate.toLocaleDateString('en-GB')}</div>
          <div className="flex rounded-md border border-input overflow-hidden">
            {(['due', 'paid', 'all'] as SalaryFilter[]).map(filter => (
              <button
                key={filter}
                type="button"
                onClick={() => setSalaryFilter(filter)}
                className={`px-3 py-1.5 text-sm capitalize ${salaryFilter === filter ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:text-foreground'}`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-card p-5">
            <p className="text-xs text-muted-foreground">Total payroll</p>
            <p className="text-2xl font-bold text-foreground">{fmtINR(totals.due)}</p>
          </div>
          <div className="glass-card p-5">
            <p className="text-xs text-muted-foreground">Advances given</p>
            <p className="text-2xl font-bold text-blue-400">{fmtINR(totals.advances)}</p>
          </div>
          <div className="glass-card p-5">
            <p className="text-xs text-muted-foreground">Paid this month</p>
            <p className="text-2xl font-bold text-success">{fmtINR(totals.paid)}</p>
          </div>
          <div className="glass-card p-5">
            <p className="text-xs text-muted-foreground">Net outstanding · Due {dueDate.toLocaleDateString('en-GB')}</p>
            <p className="text-2xl font-bold text-warning">{fmtINR(totals.outstanding)}</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="glass-card h-16 animate-pulse" />)}</div>
        ) : members.length === 0 ? (
          <div className="glass-card p-12 text-center text-muted-foreground">No team members.</div>
        ) : visibleMembers.length === 0 ? (
          <div className="glass-card p-12 text-center text-muted-foreground">No {salaryFilter} salaries for {periodLabel}.</div>
        ) : (
          <div className="glass-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3">Member</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Designation</th>
                  <th className="text-right px-4 py-3">Salary</th>
                  <th className="text-right px-4 py-3">Advance</th>
                  <th className="text-right px-4 py-3">Net due</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-glass-border">
                {visibleMembers.map(m => {
                  const p = paymentFor(m.id);
                  const adv = advanceDeduction(m.id);
                  const noSalary = !m.monthly_salary;
                  const net = Math.max(0, (m.monthly_salary || 0) - adv);
                  return (
                    <tr key={m.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{m.full_name}</div>
                        <div className="text-xs text-muted-foreground">{m.email}</div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{m.designation || '—'}</td>
                      <td className="px-4 py-3 text-right font-mono">
                        {noSalary ? <span className="text-muted-foreground">Not set</span> : fmtINR(m.monthly_salary!, m.salary_currency || 'INR')}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-blue-400">
                        {adv > 0 ? `− ${fmtINR(adv, m.salary_currency || 'INR')}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold">
                        {noSalary ? '—' : fmtINR(net, m.salary_currency || 'INR')}
                      </td>
                      <td className="px-4 py-3">
                        {p?.status === 'paid' ? (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-success/20 text-success"><CheckCircle2 size={12} /> Paid {p.paid_on ? `· ${new Date(p.paid_on).toLocaleDateString('en-GB')}` : ''}</span>
                        ) : p?.status === 'skipped' ? (
                          <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">Skipped</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-warning/20 text-warning"><Clock size={12} /> Pending</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => openAdvance(m)} className="gap-1.5">
                            <HandCoins size={12} /> Advance
                          </Button>
                          <Button size="sm" variant="outline" disabled={noSalary} onClick={() => openPay(m)} className="gap-1.5">
                            <Wallet size={12} />{p ? 'Edit' : 'Pay'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Recent advances */}
        <div className="glass-card overflow-hidden">
          <div className="px-4 py-3 border-b border-glass-border flex items-center justify-between">
            <h2 className="font-semibold text-foreground flex items-center gap-2"><HandCoins size={16} /> All advances</h2>
            <span className="text-xs text-muted-foreground">Most recent first</span>
          </div>
          {advances.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No advances recorded yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2">Member</th>
                  <th className="text-left px-4 py-2">Date</th>
                  <th className="text-right px-4 py-2">Amount</th>
                  <th className="text-left px-4 py-2 hidden md:table-cell">Reason</th>
                  <th className="text-left px-4 py-2">Deduct from</th>
                  <th className="text-left px-4 py-2">Status</th>
                  <th className="text-right px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-glass-border">
                {advances.slice(0, 30).map(a => (
                  <tr key={a.id} className="hover:bg-muted/20">
                    <td className="px-4 py-2 font-medium">{memberName(a.user_id)}</td>
                    <td className="px-4 py-2 text-muted-foreground">{new Date(a.paid_on || a.requested_on).toLocaleDateString('en-GB')}</td>
                    <td className="px-4 py-2 text-right font-mono">{fmtINR(Number(a.amount), a.currency)}</td>
                    <td className="px-4 py-2 text-muted-foreground hidden md:table-cell">{a.reason || '—'}</td>
                    <td className="px-4 py-2 text-muted-foreground">{a.deduct_from_month ? new Date(a.deduct_from_month).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : '—'}</td>
                    <td className="px-4 py-2">
                      <select value={a.status} onChange={e => setAdvanceStatus(a.id, e.target.value as Advance['status'])} className="bg-transparent border border-input rounded px-2 py-0.5 text-xs">
                        <option value="requested">Requested</option>
                        <option value="paid">Paid</option>
                        <option value="adjusted">Adjusted</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button onClick={() => deleteAdvance(a.id)} className="text-destructive hover:opacity-70"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {editing && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setEditing(null)} />
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-sidebar border-l border-sidebar-border z-50 flex flex-col shadow-2xl">
            <div className="p-6 border-b border-sidebar-border">
              <h2 className="text-xl font-display font-bold text-foreground">Record Salary Payment</h2>
              <p className="text-sm text-muted-foreground mt-1">{editing.member.full_name} · {periodLabel}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="space-y-1.5"><Label>Amount ({editing.member.salary_currency || 'INR'})</Label>
                <Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Status</Label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="paid">Paid</option><option value="pending">Pending</option><option value="skipped">Skipped</option>
                </select></div>
              {form.status === 'paid' && (
                <>
                  <div className="space-y-1.5"><Label>Paid on</Label>
                    <Input type="date" value={form.paid_on} onChange={e => setForm(f => ({ ...f, paid_on: e.target.value }))} /></div>
                  <div className="space-y-1.5"><Label>Payment method</Label>
                    <Input value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))} placeholder="Bank transfer / UPI / Cash" /></div>
                </>
              )}
              <div className="space-y-1.5"><Label>Notes</Label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></div>
            </div>
            <div className="p-6 border-t border-sidebar-border flex gap-3">
              <Button variant="outline" onClick={() => setEditing(null)} className="flex-1">Cancel</Button>
              <Button onClick={savePayment} disabled={saving} className="flex-1 gap-2">
                {saving && <Loader2 size={14} className="animate-spin" />}Save
              </Button>
            </div>
          </div>
        </>
      )}

      {advanceFor && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setAdvanceFor(null)} />
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-sidebar border-l border-sidebar-border z-50 flex flex-col shadow-2xl">
            <div className="p-6 border-b border-sidebar-border">
              <h2 className="text-xl font-display font-bold text-foreground">Give Advance</h2>
              <p className="text-sm text-muted-foreground mt-1">{advanceFor.full_name}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="space-y-1.5"><Label>Amount ({advanceFor.salary_currency || 'INR'})</Label>
                <Input type="number" value={advForm.amount} onChange={e => setAdvForm(f => ({ ...f, amount: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Status</Label>
                <select value={advForm.status} onChange={e => setAdvForm(f => ({ ...f, status: e.target.value }))} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="paid">Paid now</option>
                  <option value="requested">Requested (not yet paid)</option>
                </select></div>
              {advForm.status === 'paid' && (
                <>
                  <div className="space-y-1.5"><Label>Paid on</Label>
                    <Input type="date" value={advForm.paid_on} onChange={e => setAdvForm(f => ({ ...f, paid_on: e.target.value }))} /></div>
                  <div className="space-y-1.5"><Label>Method</Label>
                    <Input value={advForm.payment_method} onChange={e => setAdvForm(f => ({ ...f, payment_method: e.target.value }))} /></div>
                </>
              )}
              <div className="space-y-1.5"><Label>Deduct from salary of</Label>
                <Input type="month" value={advForm.deduct_from_month ? advForm.deduct_from_month.slice(0, 7) : ''} onChange={e => setAdvForm(f => ({ ...f, deduct_from_month: e.target.value ? `${e.target.value}-01` : '' }))} />
                <p className="text-xs text-muted-foreground">This amount will be subtracted from the chosen month's net payout.</p>
              </div>
              <div className="space-y-1.5"><Label>Reason / notes</Label>
                <textarea value={advForm.reason} onChange={e => setAdvForm(f => ({ ...f, reason: e.target.value }))} rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="e.g. Medical emergency, festival advance" /></div>
            </div>
            <div className="p-6 border-t border-sidebar-border flex gap-3">
              <Button variant="outline" onClick={() => setAdvanceFor(null)} className="flex-1">Cancel</Button>
              <Button onClick={saveAdvance} disabled={saving} className="flex-1 gap-2">
                {saving && <Loader2 size={14} className="animate-spin" />}Save advance
              </Button>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
