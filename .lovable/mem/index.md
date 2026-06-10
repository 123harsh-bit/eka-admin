# Project Memory

## Core
Admin: admin@eka.agency / Eka@Admin2024. Admin key for permanent deletions (no soft-delete): 123@xcodeH.
Roles: admin (Managing Director), coo (Chief Operating Officer — full admin-equivalent access via ProtectedRoute), editor, designer, writer, camera_operator, social_executive, client. COO routes to /admin.
Client contact + billing info (email, phone, contact_person, monthly_fee, billing_currency, payment_day) is admin/COO-only. Team members (editor/designer/writer/camera/social) cannot see Clients pages — nav links + routes removed. AdminClients uses RPC `admin_list_clients` for full client data; column GRANTs restrict sensitive cols from non-admin team.
Clients have monthly_fee, billing_currency, payment_day (default 5). Editable in AdminClients form.
Team profiles have monthly_salary, salary_currency, designation, joining_date. Salary payouts tracked in `salary_payments` (period_month, amount, status pending/paid/skipped, paid_on). Default pay day = 5th. Admin page: /admin/salaries.
Client portal is LIVE at /client. Admin generates client logins via ClientPortalAccess (edge fn create-admin-user, action create/reset_password/revoke_client_access). Role 'client' links to clients.user_id.
Dark theme (bg 220 20% 4%), glassmorphism, Syne/Inter typography. 24px spacing, skeleton loaders, role-colored accents.
Mobile responsive: Sidebar desktop, bottom tab bar mobile. Mobile uses cards, 44px tap targets, safe-area-inset.
team_messages table DROPPED. Real-time team messaging is permanently disabled.
Writing tasks track duration in sec/min; NEVER use word count. "blog" is explicitly excluded from task types.
Strict workflow gates: Fields for assigning Writers, Camera, Editors are hidden/blocked until specific pipeline stages are reached.
Social Executive route prefix: /social. Social posts table: scheduled_posts. Phase B.1 LIVE = PublishHelper modal. B.2 pending native OAuth approval. Storage bucket: social-media (private).
Pipeline workflow logic lives in `src/lib/pipeline/`. Status constants in `src/lib/statusConfig.ts`.
TeamLayout is the single layout (supports navItems OR navGroups + showAttendance). Per-role Attendance/DailyTasks pages do NOT exist.
AI calls use Lovable AI Gateway `google/gemini-2.5-flash` via edge functions (generate-brief, social-ai-tools). Never call from client.
Editor "done" statuses: approved, ready_to_upload, live. Camera done once footage_delivered. Writer done at approved/delivered.

## Memories
- [Video pipeline](mem://logic/video-pipeline) — 15-stage sequential workflow and parallel thumbnail logic
- [Editing-only pipeline](mem://logic/logic/editing-only-service-workflow) — Streamlined 7-stage workflow
- [Workflow gates](mem://logic/workflow-gates) — Stage dependencies for assigning writers, camera, editors
- [Task sync](mem://logic/task-status-synchronization) — Bidirectional sync between videos and writing tasks
- [Pipeline module](mem://logic/pipeline-module) — Where workflow logic vs constants live
- [Layout architecture](mem://style/layout-architecture) — TeamLayout is the single layout
- [Performance metrics](mem://logic/performance-metrics) — Monthly resets and role-specific completion
- [Daily tasks](mem://features/daily-task-system) — Personal to-dos, 6 PM check-ins, carry-over
- [Attendance system](mem://features/attendance-system) — 9-hour workday, lunch lock, 5-min pings
- [Attendance rules](mem://logic/attendance/status-rules) — late/on_time/half_day/left_early calc
- [Content planner](mem://logic/content-planner/integration) — Strategy plans → auto task creation
- [Planner automation](mem://logic/content-planner/automation-rules) — Reels/Posts/Carousels/Stories/Ads mappings
- [Planner types](mem://logic/content-planner/supported-types) — Supported platforms/formats
- [Planner calendar](mem://features/content-planner/calendar-system) — PDF + "What's Coming Up"
- [Role definitions](mem://roles/definitions) — 7 roles and workspace scopes
- [Camera workflow](mem://roles/camera-operator-workflow) — shoot_assigned/shooting/footage_delivered
- [Editor workflow](mem://roles/editor-workflow-scope) — footage_delivered through internal_review
- [Task priority](mem://style/admin-task-priority) — 'Action Required' sorting
- [Weekly reports](mem://features/weekly-performance-reports) — 7-day productivity summaries
- [Writing task types](mem://logic/writing-task-types) — Permitted categorizations
- [Social phase B](mem://features/social-phase-b) — Manual PublishHelper live; native pending OAuth
- [Phase 3 features](mem://features/phase-3-features) — WhatsApp templates, Invoices, Capacity, AI brief
