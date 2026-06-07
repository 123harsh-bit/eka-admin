---
name: phase-3-features
description: New features added in Phase 3 — WhatsApp templates, Invoices, Capacity planner, AI brief generator
type: feature
---
**WhatsApp Templates** (`/admin/whatsapp-templates`): table `whatsapp_templates` (stage, name, template_text, client_id, is_active). Variables `{client} {title} {shoot_date} {link}`. `<WhatsAppButton stage clientId phone clientName videoTitle link />` opens wa.me link. Seeded 5 default templates.

**Invoices** (`/admin/invoices`): table `invoices` (invoice_number unique, client_id, amount, currency, status[draft|sent|paid|overdue|cancelled], issue_date, due_date, sent_at, paid_at, notes, pdf_url, line_items jsonb). Auto-marks overdue client-side when sent && due_date < today. Dashboard: outstanding, paid this month, overdue count. Clients can read their own via RLS.

**Capacity Planner** (`/admin/capacity`): 14-day heatmap of due tasks + scheduled shoots per profile. Reads videos.due_date (assigned_editor), writing_tasks.due_date (assigned_writer), design_tasks.due_date (assigned_designer), videos.shoot_date (assigned_camera_operator). Intensity buckets: 0 / 1 / 2-3 / 4-5 / 6+.

**AI Brief Generator** (`<AIBriefGenerator topic clientName contentType durationSeconds onApply />`): edge function `generate-brief` → Lovable AI Gateway `google/gemini-2.5-flash` with `response_format: json_object`. Returns `{ writing_brief, shoot_checklist[], caption_drafts[] }`. Currently wired in AdminClientIdeas detail panel. Table `ai_briefs` exists for caching but is not yet auto-populated.
