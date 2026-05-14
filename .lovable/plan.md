# Eka Agency OS — Cleanup, Client Portal Revival & New Features

Scope is too big for one round. Splitting into 4 phases so each ships clean and testable.

---

## Phase 1 — Structural cleanup (foundation)

Do this first so portal + new features land on tidy code.

**1.1 Consolidate role layouts**
Replace `AdminLayout`, `EditorLayout`, `DesignerLayout`, `WriterLayout`, `CameraLayout`, `SocialLayout` with a single `RoleLayout` driven by a config map (nav items, accent color, route prefix per role). Saves ~400 lines, one source of truth for nav/sidebar/bottom-tab/attendance bar.

**1.2 Consolidate per-role Attendance + DailyTasks pages**
Routes for each role currently render thin wrappers. Point them straight at `shared/MyAttendancePage` and `shared/DailyTasksPage`. Delete `*/CameraAttendance.tsx`, `*/EditorAttendance.tsx`, etc. (10 files).

**1.3 Pipeline module**
Create `src/lib/pipeline/` containing:
- `stages.ts` (current `statusConfig`)
- `transitions.ts` (current `handleVideoStatusChange`)
- `sync.ts` (current `syncTaskToVideo`)
- `index.ts` re-exports
Update imports across the codebase.

**1.4 Drop `team_messages` table**
Migration: `DROP TABLE team_messages CASCADE`. Memory already says messaging is disabled.

---

## Phase 2 — Client portal revival

Restore login + dashboard for clients. Components already exist as dead code; main work is auth + RLS + routing.

**2.1 Database**
- Re-verify `clients.user_id` FK to `auth.users`
- Confirm RLS policies for `videos`, `content_items`, `content_plans`, `writing_tasks`, `design_tasks`, `client_ideas`, `client_ratings`, `feedback` allow client users via `clients.user_id = auth.uid()` (most already exist)
- Add `client` value to existing role checks if missing

**2.2 Auth**
- Re-enable client signup/login on `LoginPage` (or separate `/client/login`)
- Email + Google OAuth via Lovable Cloud (defaults)
- Add `/reset-password` page
- `RoleRedirect` routes client users → `/client`

**2.3 Admin: invite client**
- "Send portal invite" button on each client row in `AdminClients`
- Edge function `invite-client-user` creates auth user, links `clients.user_id`, emails invite via Supabase
- Admin can revoke access (clear `clients.user_id`)

**2.4 Restore client routes**
- `/client` → `ClientDashboard` (deliveries, plan, ideas, ratings)
- Wire up existing `ClientContentPlan`, `ClientIdeasList`, `IdeaSubmissionForm`, `VideoFeedbackModal`, `ClientRatingModal`, `DeliveryCalendar`, `VideoProgressTracker`
- Mobile responsive; bottom-tab nav

**2.5 Update memory**
Replace "Client portal & auth are REMOVED" with the new model.

---

## Phase 3 — New features (build in this order)

**3.1 WhatsApp deep-link templates per stage**
- Per video stage: pre-formatted message ("Hi {client}, your reel is ready for review: {link}")
- Templates stored in `whatsapp_templates` table (stage, template_text)
- One-click button on video detail → opens `https://wa.me/{phone}?text=…`
- Admin-editable templates in Settings

**3.2 Capacity planner (14-day workload)**
- New admin page `/admin/capacity`
- Heatmap: rows = team members, columns = next 14 days
- Cell value = sum of due tasks/videos/shoots assigned that day
- Click cell → list of items, drag to reassign (or open detail)

**3.3 Invoice & payment tracker**
- New tables: `invoices` (client_id, amount, currency, status, due_date, sent_at, paid_at, notes, pdf_url)
- Admin page `/admin/invoices` with status filters
- Monthly revenue dashboard widget on `AdminDashboard`
- Auto-overdue badge if `due_date < today AND status != paid`
- (PDF generation deferred — manual upload for now)

**3.4 AI brief generator**
- "Generate brief" button on `client_ideas` row and on new video creation
- Edge function `generate-brief` → Lovable AI Gateway (`google/gemini-2.5-flash`)
- Returns: writing brief, shoot checklist (jsonb array), 3 caption drafts
- Admin reviews, edits, then "Apply" creates linked writing_task + populates video.shoot_checklist

---

## Phase 4 — Wrap up

- Run `supabase--linter`, fix any new RLS warnings introduced
- Update `mem://index.md` Core block
- Add memory entries for: client portal model, WhatsApp templates, capacity planner, invoices, AI brief generator
- Quick smoke test: log in as each of 7 roles (admin, 5 team, client), confirm core flows work

---

## Recommendation

Approve **Phase 1 first** (low risk, makes everything after easier). I'll send Phase 2 plan after 1 lands so you can review the auth/RLS changes carefully before clients can log in.

If you'd rather I just do everything in one go without intermediate check-ins, say so and I'll execute all 4 phases sequentially — but expect ~30+ migrations and edits across ~80 files.

## Technical details (skip if non-technical)

- Phase 1 migrations: 1 (drop team_messages). Pure code refactors otherwise.
- Phase 2 migrations: ~2 (verify clients.user_id FK + audit RLS). 1 edge function.
- Phase 3 migrations: 3 (whatsapp_templates, invoices, indexes). 1 edge function for brief gen.
- All RLS uses existing `has_role()` SECURITY DEFINER pattern, no recursion risk.
- Layout consolidation uses a `RoleConfig` record keyed by `app_role` enum value.