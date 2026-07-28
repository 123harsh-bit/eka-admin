## Verified current state
- The custom domains and Lovable URL return `200`, but the rendered page is visually blank except for the Lovable badge.
- The hosted backend is healthy: database, auth, storage, memory, disk, and connections are not saturated.
- The slow-query report points to repeated profile/notification reads and admin dashboard/client video counting patterns as likely contributors to sluggish in-app loading.
- A team `Clients Hub` already exists for editor/designer/writer/camera/social routes, but it is read-only and only shows basic client info/logo/contact details.
- Admin client management currently supports logo upload only; there is no general client asset/belongings library for files teams can download.

## Plan

### 1. Fix the blank website first
- Reproduce the blank published site in a browser run and capture the exact JavaScript/network error.
- Compare published-domain behavior against the local preview.
- Fix the specific app crash or missing asset issue rather than guessing.
- If the fix requires a fresh deployment, publish/update the site after verification so `ekaofficial.in`, `www.ekaofficial.in`, and the Lovable URL stop showing a blank page.

### 2. Improve loading speed without changing workflows
- Remove or reduce repeated dashboard queries that load one count per client.
- Make admin dashboard fetches smaller and more targeted.
- Reduce duplicate notification/profile reads where possible.
- Add database indexes only where the slow-query output supports them, likely around:
  - notifications by recipient/date
  - videos by client/status/date/assigned users
  - task lookups by video/assignee
  - activity log by created date
- Keep the backend sizing unchanged for now because health checks do not show compute saturation.

### 3. Build a proper Client Hub / Client Asset Library
- Upgrade the team Clients Hub into a usable library with:
  - client search and filter
  - logo/contact/business details
  - brand notes/colors/fonts
  - downloadable assets grouped by client
- Add admin-only upload controls from the admin client page:
  - upload logos
  - upload brand files, references, documents, briefs, photos, guidelines, etc.
  - label/type each asset
  - delete/replace assets
- Store asset metadata in a new `client_assets` table.
- Use the existing private `brand-assets` storage bucket for files.
- Access rules:
  - admin/COO can upload, edit, delete, and manage all assets
  - team members can view/download assets only through the hub
  - billing/payment fields remain hidden from team members

### 4. Clean up team navigation around the hub
- Keep `Clients Hub` available for editor, designer, writer, camera, and social executive.
- Rename it to a clearer name like `Client Assets` or `Brand Hub` if it better matches usage.
- Remove duplicate/confusing brand-kit surfaces if the new hub fully replaces them.

### 5. Add one useful app-specific suggestion feature
- Add an `Operations Snapshot` for admin: a lightweight dashboard section that shows what needs attention today:
  - videos awaiting approval
  - approved videos waiting for social posting
  - missing raw footage/final drive links
  - overdue team tasks
  - clients missing logo/assets
- This fits your current agency workflow and helps you find bottlenecks quickly without opening every panel.

### 6. Verify
- Browser-check the published/custom domain for nonblank rendering.
- Browser-check admin dashboard loading.
- Test admin upload of a client asset.
- Test team-member download/view access from Clients Hub.
- Confirm team members still cannot see salary or client billing fields.