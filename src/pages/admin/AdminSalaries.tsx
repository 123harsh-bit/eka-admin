import { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Wallet, CheckCircle2, Clock, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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

const fmtINR = (n: number, c = 'INR') =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(n);

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;

export default function AdminSalaries() {
  const [members, setMembers] = useState<Member[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [editing, setEditing] = useState<{ member: Member; payment?: Payment } | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ amount: '', status: 'paid', paid_on: '', payment_method: '', notes: '' });
  const { toast } = useToast();

  const periodMonth = monthKey(cursor);
  const periodLabel = cursor.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const dueDate = new Date(cursor.getFullYear(), cursor.getMonth(), 5);

  const load = async () => {
    setLoading(true);
    const { data: roles } = await supabase.from('user_roles').select('user_id, role').not('role', 'eq', 'client');
    if (!roles) { setLoading(false); return; }
    const ids = roles.map(r => r.user_id);
    if (ids.length === 0) { setMembers([]); setPayments([]); setLoading(false); return; }
    const [{ data: profiles }, { data: pays }] = await Promise.all([
      supabase.from('profiles').select('*').in('id', ids),
      (supabase as any).from('salary_payments').select('*').eq('period_month', periodMonth),
    ]);
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
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [periodMonth]);

  const paymentFor = (uid: string) => payments.find(p => p.user_id === uid);

  const totals = useMemo(() => {
    let due = 0, paid = 0;
    members.forEach(m => {
      if (!m.monthly_salary) return;
      const p = paymentFor(m.id);
      const amt = p ? Number(p.amount) : m.monthly_salary;
      due += amt;
      if (p?.status === 'paid') paid += Number(p.amount);
    });
    return { due, paid, outstanding: due - paid };
  }, [members, payments]);

  const openPay = (member: Member) => {
    const p = paymentFor(member.id);
    setEditing({ member, payment: p });
    setForm({
      amount: (p?.amount ?? member.monthly_salary ?? 0).toString(),
      status: p?.status || 'paid',
      paid_on: p?.paid_on || new Date().toISOString().slice(0, 10),
      payment_method: p?.payment_method || 'Bank transfer',
      notes: p?.notes || '',
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

  const shiftMonth = (d: number) => {
    const nx = new Date(cursor); nx.setMonth(nx.getMonth() + d); setCursor(nx);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-display font-bold gradient-text">Salaries</h1>
            <p className="text-muted-foreground mt-1">Monthly payouts — due on the 5th of each month</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => shiftMonth(-1)}><ChevronLeft size={14} /></Button>
            <div className="px-4 py-1.5 rounded-md bg-muted text-sm font-medium min-w-[150px] text-center">{periodLabel}</div>
            <Button variant="outline" size="sm" onClick={() => shiftMonth(1)}><ChevronRight size={14} /></Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-card p-5">
            <p className="text-xs text-muted-foreground">Total payroll</p>
            <p className="text-2xl font-bold text-foreground">{fmtINR(totals.due)}</p>
          </div>
          <div className="glass-card p-5">
            <p className="text-xs text-muted-foreground">Paid this month</p>
            <p className="text-2xl font-bold text-success">{fmtINR(totals.paid)}</p>
          </div>
          <div className="glass-card p-5">
            <p className="text-xs text-muted-foreground">Outstanding · Due {dueDate.toLocaleDateString('en-GB')}</p>
            <p className="text-2xl font-bold text-warning">{fmtINR(totals.outstanding)}</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="glass-card h-16 animate-pulse" />)}</div>
        ) : members.length === 0 ? (
          <div className="glass-card p-12 text-center text-muted-foreground">No team members.</div>
        ) : (
          <div className="glass-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3">Member</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Designation</th>
                  <th className="text-right px-4 py-3">Salary</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-right px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-glass-border">
                {members.map(m => {
                  const p = paymentFor(m.id);
                  const noSalary = !m.monthly_salary;
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
                        <Button size="sm" variant="outline" disabled={noSalary} onClick={() => openPay(m)} className="gap-1.5">
                          <Wallet size={12} />{p ? 'Edit' : 'Record'}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
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
    </AdminLayout>
  );
}
