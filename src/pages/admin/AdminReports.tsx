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
const uploadDate = (v: Row) => v.social_posted_at ?? v.date_delivered ?? null;

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

  const periodLabel = month === 'all'
    ? 'All months'
    : new Date(`${month}-01`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const generatedOn = new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

  const exportCsv = () => {
    const head = ['Title', 'Client', 'Stage', 'Uploaded', 'Live URL', 'Created', 'Upload date'];
    const lines = chosen.map(r => [
      r.title,
      r.client_id ? clients[r.client_id] ?? '' : '',
      VIDEO_STATUSES[r.status as VideoStatus]?.label ?? r.status,
      isUploaded(r) ? 'Yes' : 'No',
      r.live_url ?? '',
      r.created_at.slice(0, 10),
      (uploadDate(r) ?? '').slice(0, 10),
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

        {/* Selection list */}
        <div className="glass-card overflow-hidden print:hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <button onClick={toggleAll} className="flex items-center gap-2 text-sm text-foreground">
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
            <div className="divide-y divide-border max-h-[420px] overflow-y-auto">
              {filtered.map(r => {
                const up = isUploaded(r);
                const on = selected.has(r.id);
                return (
                  <div key={r.id} className={cn('flex items-center gap-3 px-4 py-2.5', on && 'bg-primary/5')}>
                    <button onClick={() => toggle(r.id)} aria-label="Select video">
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

        {/* Printable document */}
        <p className="text-xs text-muted-foreground print:hidden">Document preview — this is exactly what prints / exports to PDF.</p>
        <div className="report-doc">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24 }}>
            <div>
              <div className="rd-brand">EKA</div>
              <div className="rd-muted" style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Content &amp; Production Agency
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="rd-muted">Generated {generatedOn}</div>
            </div>
          </div>

          <div className="rd-rule" />

          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{reportTitle}</h1>
          <div className="rd-muted" style={{ marginTop: 4 }}>
            {clientFilter === 'all' ? 'All clients' : `Client: ${clients[clientFilter] ?? '—'}`}
            {' · '}
            {uploadFilter === 'all' ? 'All delivery states' : uploadFilter === 'uploaded' ? 'Uploaded / live only' : 'Pending upload only'}
            {selected.size > 0 && ` · ${selected.size} hand-picked item${selected.size > 1 ? 's' : ''}`}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, margin: '22px 0 26px' }}>
            {[
              { l: 'Total videos', v: stats.total },
              { l: 'Uploaded / live', v: stats.uploaded },
              { l: 'Pending upload', v: stats.pending },
              { l: 'Completion', v: `${stats.total ? Math.round((stats.uploaded / stats.total) * 100) : 0}%` },
            ].map(s => (
              <div key={s.l} className="rd-stat">
                <div className="rd-label">{s.l}</div>
                <div className="rd-stat-value">{s.v}</div>
              </div>
            ))}
          </div>

          <h2 style={{ fontSize: 13, fontWeight: 700, margin: '0 0 8px' }}>Deliverables</h2>
          <table>
            <thead>
              <tr>
                <th style={{ width: 26 }}>#</th>
                <th>Video / Project</th>
                <th style={{ width: 130 }}>Client</th>
                <th style={{ width: 110 }}>Stage</th>
                <th style={{ width: 90 }}>Upload date</th>
                <th style={{ width: 92 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {chosen.length === 0 ? (
                <tr><td colSpan={6} className="rd-muted">No videos in this selection.</td></tr>
              ) : chosen.map((r, i) => (
                <tr key={r.id}>
                  <td className="rd-muted">{i + 1}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{r.title}</div>
                    {r.live_url && (
                      <div className="rd-muted" style={{ fontSize: 9, wordBreak: 'break-all' }}>{r.live_url}</div>
                    )}
                  </td>
                  <td>{r.client_id ? clients[r.client_id] ?? 'Unknown' : '—'}</td>
                  <td>{VIDEO_STATUSES[r.status as VideoStatus]?.label ?? r.status}</td>
                  <td className="rd-muted">{uploadDate(r) ? new Date(uploadDate(r)!).toLocaleDateString() : '—'}</td>
                  <td>
                    <span className={cn('rd-pill', isUploaded(r) ? 'rd-live' : 'rd-pending')}>
                      {isUploaded(r) ? 'Live' : 'Pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="rd-foot">
            EKA · {stats.total} deliverable{stats.total !== 1 ? 's' : ''} reported ·
            {' '}{stats.uploaded} live, {stats.pending} pending. Report generated {generatedOn}.
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

