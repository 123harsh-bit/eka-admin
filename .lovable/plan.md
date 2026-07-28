## Goal
Four targeted improvements, shipped in order of impact-per-effort.

---

### 1. Performance (biggest win, lowest risk)
The app ships one 2.8 MB JS chunk — every role loads every page.

- Convert all route components in `App.tsx` to `React.lazy` + `Suspense`, with the existing skeleton as fallback.
- Lazy-load heavy libs only when used: `html2pdf`/`jspdf` (`src/lib/scripts/exportPdf.ts`), `docx` (`exportDocx.ts`), TipTap + Yjs (only in ScriptEditor).
- Add `build.rollupOptions.output.manualChunks` in `vite.config.ts` to split `react`, `supabase`, `tiptap/yjs`, `recharts`, `radix` vendors.
- Target: initial chunk under ~500 kB.

---

### 2. Videos panel declutter
Builds on the existing month tabs / group-by-client / kanban toggle.

- **Saved view persistence** — remember month tab, view mode, grouping, and client filter in `localStorage` per user.
- **Archive rule** — videos that are `live` and older than 60 days move behind an "Archive" tab instead of the month tabs.
- **Sticky filter bar** with an active-filter chip row and one-click "Clear all".
- **Compact density toggle** (comfortable / compact rows) for large months.

---

### 3. Notifications → real delivery
Currently DB-only (`notifications` table + bell).

- Add a **notification preferences** section (per-user toggles: assignments, deadline alerts, approvals, client feedback).
- Add a **daily digest** edge function on pg_cron that emails each team member their due/overdue items.
- Email sending needs a sender domain you own — I'll prompt for setup when we reach this step.
- In-app: group the bell dropdown by day, add "Mark all read", and unread count badge on the nav item.

---

### 4. Invoices UX rebuild
Current page is confusing because payment state is spread across two tables.

- **One clear line per invoice**: `Total · Paid · Remaining · Due in N days` with a single status chip (Draft / Sent / Part-paid / Paid / Overdue).
- **Client rollup card** at top: total outstanding, oldest unpaid, next due.
- **Payment drawer** replaces the modal — shows full payment history for that invoice with delete-a-payment, plus "Record payment" inline.
- **Quick filters**: Unpaid / Overdue / Part-paid / All, plus client search.
- Remove duplicate/legacy views so there is exactly one invoices screen.

---

### Technical notes
- No schema changes needed for 1, 2, 4. Item 3 adds a `notification_preferences` table (with grants + RLS scoped to `auth.uid()`) and one scheduled edge function.
- Order: Performance → Videos panel → Invoices → Notifications (last, since it needs your email domain).
