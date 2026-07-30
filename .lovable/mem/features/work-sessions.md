---
name: Work session tracking
description: Start/Stop work timers (work_sessions table) so admin sees which task each team member is actively working on, plus per-role My Profile pages
type: feature
---
- `work_sessions` table: user_id, entity_type ('video'|'writing_task'|'design_task'|'shoot'|'social_post'), entity_id, entity_title, client_id, started_at, ended_at, duration_minutes (auto-computed by trigger).
- Only ONE active session per user (partial unique index on ended_at IS NULL); starting a new task auto-closes the previous one.
- Hook `useWorkSession()` + `<WorkSessionButton />` are used on every team task card (editor, writer, designer, camera) in any pipeline stage — the timer is independent of status.
- Admin sees live activity via `admin_active_work_sessions()` RPC → `<WhosWorkingNow />` on Admin Dashboard and Editor Tasks.
- Team members have `/{role}/profile` (MyProfilePage): edit full name + mobile, view completed work per month (last 6 months) and logged hours. Email is admin-only.
