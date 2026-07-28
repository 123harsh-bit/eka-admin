---
name: Removed modules
description: Features permanently removed from the workspace — attendance, invoices, capacity planner, WhatsApp templates, social library/analytics/import
type: constraint
---
Permanently removed — do NOT re-add unless the user explicitly asks:
- Attendance tracking (AttendanceBar, StartWorkday gate, useAttendance hook, /admin/attendance, per-role /attendance routes). **Why:** team never followed it; wasted data.
- Invoices module (AdminInvoices, invoice nav). **Why:** confusing UX, unused.
- Capacity Planner (/admin/capacity).
- WhatsApp templates page + WhatsAppButton component.
- Social executive pages: Library + AI, Analytics, Bulk Import.

Added instead: **Clients Hub** — a read-only client directory (logo, contact person, phone, email, brand colors, notes) for every team role at `/<role>/clients`, powered by the security-definer RPC `team_list_clients()`. Billing/financial client fields stay admin/COO only.

Admins can change a team member's login email from Admin → Team (edge function `create-admin-user`, action `update_email`) — the auth user id is preserved so all their data stays linked.
