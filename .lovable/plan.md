
## Scripts Workspace — Plan

A built-in Google Docs-style editor for writers (and admins) to create and collaborate on scripts inside the app.

### 1. Where it lives

- New nav item **Scripts** for the `writer` role (in `WriterLayout`) and for `admin` (in `AdminLayout`).
- Two pages:
  - `/writer/scripts` and `/admin/scripts` → **Scripts Library** (list, search, create, rename, delete, filter by client, link/unlink to writing task).
  - `/writer/scripts/:id` and `/admin/scripts/:id` → **Script Editor** (the doc).
- Optional link to a writing task: on the writing-task detail card, an "Open Script" button appears if a script is linked; otherwise "Create Script" creates one linked to the task.

### 2. Data model (new tables)

- `scripts` — id, title, client_id (nullable), linked_writing_task_id (nullable, unique), created_by, updated_by, content_json (jsonb — TipTap doc), content_html (nullable, for previews), word_count, char_count, ydoc_state (bytea — Yjs binary snapshot), archived (bool), created_at, updated_at.
- `script_collaborators` — script_id, user_id, role ('viewer'|'editor'). Admins always have full access; writer who created it is editor.
- `script_comments` — id, script_id, author_id, anchor (jsonb — TipTap mark id / range), body (text), parent_id (nullable — replies), resolved (bool), created_at.
- `script_updates` (Yjs sync log) — id, script_id, update (bytea), created_at. Compact via a scheduled snapshot back into `scripts.ydoc_state` when the log grows past N rows.

RLS: admins full access; writers see scripts they created, are collaborators on, or that are linked to their own writing tasks; clients cannot see scripts. GRANTs to `authenticated` + `service_role` (no anon).

Realtime enabled on `script_updates`, `script_comments`, `scripts`.

### 3. Editor (TipTap)

Install: `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-underline`, `@tiptap/extension-highlight`, `@tiptap/extension-image`, `@tiptap/extension-table` (+ row/cell/header), `@tiptap/extension-link`, `@tiptap/extension-placeholder`, `@tiptap/extension-character-count`, `@tiptap/extension-collaboration`, `@tiptap/extension-collaboration-cursor`, plus `yjs` and `y-protocols`.

Toolbar: headings (H1–H3), bold/italic/underline/strike, highlight, bullet/ordered list, quote, link, image (upload to a new `script-assets` storage bucket), table, undo/redo, word + char count in the footer.

Export:
- **PDF** — client-side using `html2pdf.js` (renders the editor DOM to a PDF).
- **DOCX** — client-side using `docx` package converting TipTap JSON → DOCX runs/paragraphs.

Images pasted or uploaded go to Supabase Storage bucket `script-assets` (private; signed URLs, 1-year expiry — matches existing `social-media` bucket pattern).

### 4. Real-time collaboration

- Yjs `Y.Doc` is the source of truth in the editor. TipTap `Collaboration` extension binds it.
- **Transport (custom Supabase provider)** — one Supabase Realtime channel per script:
  - **Broadcast** — every local Yjs update is base64-encoded and sent as a `broadcast` event `update`; peers apply the received update to their local Y.Doc.
  - **Presence** — `CollaborationCursor` awareness state (user id, name, color, cursor) is synced through Supabase Realtime presence.
  - **Persistence** — on every update we also insert the binary update into `script_updates`. On load, we read `scripts.ydoc_state` (if any) + all newer `script_updates` rows and apply them to build the initial doc. Debounced (~10 s) we also write the merged snapshot back to `scripts.ydoc_state`, `content_json`, `content_html`, `word_count`, `char_count`, and clear consumed `script_updates` rows.
- Cursor color derived from user id hash; label from `profiles.full_name`.

This gives real Google-Docs-style multi-cursor collab without requiring us to run a Yjs sync server.

### 5. Inline comments

- Custom TipTap `Mark` `comment` with attribute `commentId`. Selecting text → "Comment" button in a floating menu → creates a `script_comments` row and wraps the selection with the mark.
- Right-side comments panel lists open comments in document order, with reply threads and a **Resolve** button (sets `resolved=true` and removes the mark).
- Clicking a comment scrolls to and highlights the anchored text.
- Comments stream in via Realtime on `script_comments`.

### 6. Library UX

- Card grid: title, client badge, linked-task badge, last-edited-by avatar + relative time, word count, quick actions (open, rename, duplicate, archive, delete for admin/owner).
- Filters: client, "Linked to my tasks", "Shared with me", archived.
- "New Script" modal: title, optional client, optional writing task to link.

### 7. Files to create / edit

Create:
- `src/pages/shared/ScriptsLibrary.tsx`
- `src/pages/shared/ScriptEditor.tsx`
- `src/components/scripts/EditorToolbar.tsx`
- `src/components/scripts/CommentsPanel.tsx`
- `src/components/scripts/NewScriptModal.tsx`
- `src/lib/scripts/useYSupabaseProvider.ts` (Yjs ↔ Supabase Realtime bridge + persistence)
- `src/lib/scripts/exportDocx.ts`, `src/lib/scripts/exportPdf.ts`
- `src/lib/scripts/commentMark.ts` (TipTap Mark)
- Migration: tables, RLS, GRANTs, Realtime publication, `script-assets` storage bucket + policies.

Edit:
- `src/components/writer/WriterLayout.tsx` — add Scripts nav item.
- `src/components/admin/AdminLayout.tsx` — add Scripts nav item.
- `src/App.tsx` — add routes.
- `src/pages/writer/WriterDashboard.tsx` and admin writing-task views — add "Open/Create Script" link on tasks.

### 8. Rollout order

1. Migration + storage bucket (approve first — types file regenerates after).
2. Install deps.
3. Library page + New Script modal + routes + nav entries.
4. Editor shell with TipTap + toolbar + local autosave (no collab yet) — usable checkpoint.
5. Yjs + Supabase provider + cursors.
6. Comments (mark + panel + realtime).
7. Export DOCX / PDF.
8. Task ↔ script linking on writer + admin task pages.

### Notes / trade-offs

- Real-time via Supabase Realtime broadcast is bandwidth-efficient for small teams but is not as battle-tested as a dedicated Yjs server (Hocuspocus). Fine for an in-house tool with a handful of concurrent editors; if you ever have many simultaneous editors on one doc, we can swap in Hocuspocus later without changing the editor code.
- Rich exports render what's in the editor; very complex layouts (nested tables inside tables, etc.) may look simpler in the exported file than in the browser.
