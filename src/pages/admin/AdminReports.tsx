import { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { VIDEO_STATUSES, type VideoStatus } from '@/lib/statusConfig';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileBarChart, Download, Printer, CheckSquare, Square, Globe, CircleSlash } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Row {
  id: string;
  title: string;
  status: string;
  client_id: string | null;
  created_at: string;
  date_delivered: string | null;
  live_url: string | null;
  social_posted_at: string | null;
}

const monthKey = (iso: string) => iso.slice(0, 7);
const isUploaded = (v: Row) => v.status === 'live' || !!v.live_url || !!v.social_posted_at;

export default function AdminReports() {
  const [rows, setRows] = useState<Row[]>([]);
  const [clients, setClients] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [clientFilter, setClientFilter] = useState('all');
  const [uploadFilter, setUploadFilter] = useState<'all' | 'uploaded' | 'pending'>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [reportTitle, setReportTitle] = useState('Video Delivery Report');

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: vids }, { data: cls }] = await Promise.all([
        supabase
          .from('videos')
          .select('id, title, status, client_id, created_at, date_delivered, live_url, social_posted_at')
          .order('created_at', { ascending: false }),
        supabase.from('clients').select('id, name'),
      ]);
      const map: Record<string, string> = {};
      (cls ?? []).forEach((c: { id: string; name: string }) => { map[c.id] = c.name; });
      setClients(map);
      setRows((vids ?? []) as Row[]);
      setLoading(false);
    })();
  }, []);

  const months = useMemo(() => {
    const set = new Set(rows.map(r => monthKey(r.created_at)));
    return Array.from(set).sort().reverse();
  }, [rows]);

  const filtered = useMemo(() => rows.filter(r => {
    if (month !== 'all' && monthKey(r.created_at) !== month) return false;
    if (clientFilter !== 'all' && r.client_id !== clientFilter) return false;
    if (uploadFilter === 'uploaded' && !isUploaded(r)) return false;
    if (uploadFilter === 'pending' && isUploaded(r)) return false;
    return true;
  }), [rows, month, clientFilter, uploadFilter]);

  const chosen = useMemo(
    () => (selected.size ? filtered.filter(r => selected.has(r.id)) : filtered),
    [filtered, selected]
  );

  const stats = useMemo(() => {
    const uploaded = chosen.filter(isUploaded).length;
    const byStatus: Record<string, number> = {};
    const byClient: Record<string, { total: number; live: number }> = {};
    chosen.forEach(r => {
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
      const key = r.client_id ? clients[r.client_id] || 'Unknown client' : 'No client';
      byClient[key] = byClient[key] || { total: 0, live: 0 };
      byClient[key].total += 1;
      if (isUploaded(r)) byClient[key].live += 1;
    });
    return { total: chosen.length, uploaded, pending: chosen.length - uploaded, byStatus, byClient };
  }, [chosen, clients]);

  const toggle = (id: string) => setSelected(s => {
    const n = new Set(s);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });
  const allSelected = filtered.length > 0 && filtered.every(r => selected.has(r.id));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(filtered.map(r => r.id)));

  const exportCsv = () => {
    const head = ['Title', 'Client', 'Stage', 'Uploaded', 'Live URL', 'Created', 'Delivered'];
    const lines = chosen.map(r => [
      r.title,
      r.client_id ? clients[r.client_id] ?? '' : '',
      VIDEO_STATUSES[r.status as VideoStatus]?.label ?? r.status,
      isUploaded(r) ? 'Yes' : 'No',
      r.live_url ?? '',
      r.created_at.slice(0, 10),
      r.date_delivered ?? '',
    ].map(c => `"${String(c).replace(/"/g, '""')}"`).join(','));
    const blob = new Blob([[head.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportTitle.replace(/\s+/g, '-').toLowerCase()}-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
          <div>
            <h1 className="text-3xl font-display font-bold gradient-text">Report Maker</h1>
            <p className="text-muted-foreground mt-1">Pick videos and build a delivery report — what's live and what isn't.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={exportCsv}>
              <Download size={14} /> CSV
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => window.print()}>
              <Printer size={14} /> Print / PDF
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="glass-card p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 print:hidden">
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">Report title</span>
            <Input value={reportTitle} onChange={e => setReportTitle(e.target.value)} className="h-9" />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">Month</span>
            <select value={month} onChange={e => setMonth(e.target.value)} className="w-full h-9 rounded-md bg-background border border-border px-2 text-sm">
              <option value="all">All months</option>
              {months.map(m => (
                <option key={m} value={m}>
                  {new Date(`${m}-01`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">Client</span>
            <select value={clientFilter} onChange={e => setClientFilter(e.target.value)} className="w-full h-9 rounded-md bg-background border border-border px-2 text-sm">
              <option value="all">All clients</option>
              {Object.entries(clients).sort(([, a], [, b]) => a.localeCompare(b)).map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">Upload state</span>
            <select value={uploadFilter} onChange={e => setUploadFilter(e.target.value as 'all' | 'uploaded' | 'pending')} className="w-full h-9 rounded-md bg-background border border-border px-2 text-sm">
              <option value="all">Everything</option>
              <option value="uploaded">Uploaded / Live only</option>
              <option value="pending">Not uploaded yet</option>
            </select>
          </label>
        </div>

        {/* Report summary */}
        <div className="glass-card p-6 space-y-5">
          <div className="flex items-center gap-2">
            <FileBarChart size={18} className="text-primary" />
            <h2 className="text-lg font-display font-semibold text-foreground">{reportTitle}</h2>
            <span className="text-xs text-muted-foreground">
              {month === 'all' ? 'All months' : new Date(`${month}-01`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              {clientFilter !== 'all' && ` · ${clients[clientFilter]}`}
              {selected.size > 0 && ` · ${selected.size} selected`}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Videos in report', value: stats.total, icon: FileBarChart, color: 'text-primary' },
              { label: 'Uploaded / Live', value: stats.uploaded, icon: Globe, color: 'text-success' },
              { label: 'Not uploaded', value: stats.pending, icon: CircleSlash, color: 'text-warning' },
            ].map(c => (
              <div key={c.label} className="p-4 rounded-xl bg-muted/30 border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{c.label}</p>
                  <c.icon size={15} className={c.color} />
                </div>
                <p className="text-3xl font-display font-bold text-foreground">{c.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">By stage</p>
              {Object.entries(stats.byStatus).length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing in this selection.</p>
              ) : Object.entries(stats.byStatus).sort(([, a], [, b]) => b - a).map(([s, n]) => (
                <div key={s} className="flex items-center justify-between text-sm">
                  <span className={VIDEO_STATUSES[s as VideoStatus]?.color ?? 'text-muted-foreground'}>
                    {VIDEO_STATUSES[s as VideoStatus]?.label ?? s}
                  </span>
                  <span className="font-semibold text-foreground">{n}</span>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">By client</p>
              {Object.entries(stats.byClient).length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing in this selection.</p>
              ) : Object.entries(stats.byClient).sort(([, a], [, b]) => b.total - a.total).map(([name, v]) => (
                <div key={name} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{name}</span>
                  <span className="text-muted-foreground">{v.live} live / {v.total} total</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Selection table */}
        <div className="glass-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <button onClick={toggleAll} className="flex items-center gap-2 text-sm text-foreground print:hidden">
              {allSelected ? <CheckSquare size={16} className="text-primary" /> : <Square size={16} className="text-muted-foreground" />}
              Select all ({filtered.length})
            </button>
            <span className="text-xs text-muted-foreground">
              {selected.size ? `${selected.size} in report` : 'No selection — report covers all filtered videos'}
            </span>
          </div>
          {loading ? (
            <div className="p-4 space-y-2">
              {[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-muted/40 rounded animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No videos match these filters.</p>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map(r => {
                const up = isUploaded(r);
                const on = selected.has(r.id);
                return (
                  <div key={r.id} className={cn('flex items-center gap-3 px-4 py-2.5', on && 'bg-primary/5')}>
                    <button onClick={() => toggle(r.id)} className="print:hidden" aria-label="Select video">
                      {on ? <CheckSquare size={16} className="text-primary" /> : <Square size={16} className="text-muted-foreground" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{r.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.client_id ? clients[r.client_id] ?? 'Unknown client' : 'No client'} · {new Date(r.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full shrink-0', VIDEO_STATUSES[r.status as VideoStatus]?.bgColor, VIDEO_STATUSES[r.status as VideoStatus]?.color)}>
                      {VIDEO_STATUSES[r.status as VideoStatus]?.label ?? r.status}
                    </span>
                    <span className={cn('text-xs font-semibold shrink-0 w-24 text-right', up ? 'text-success' : 'text-warning')}>
                      {up ? 'Uploaded' : 'Not uploaded'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
