

# Eka Creative Agency — Full Management System

## Overview
A production-grade agency management platform for Eka, a video production & creative agency. The system serves as the central operating system with role-based workspaces for 5 user types: Managing Director (Admin), Video Editor, Graphic Designer, Content Writer, and Client.

**Design:** Dark-mode-first with Eka's purple brand system (#7C3AED), glassmorphism cards, gradient accents, Google Fonts pairing (Syne + DM Sans), skeleton loaders, and fully responsive layout.

---

## Phase 1: Foundation & Authentication

### Database Setup
- Full Supabase schema: `profiles`, `clients`, `videos`, `design_tasks`, `writing_tasks`, `feedback`, `notifications`, `activity_log`, and `user_roles` tables
- Row-Level Security policies ensuring clients only see their own data, team members only see assigned work, and admins see everything
- Security definer helper functions to prevent RLS recursion
- Storage buckets for voice feedback, client logos, and brand assets

### Authentication & Routing
- Dark-themed login page with animated purple gradient, glassmorphism card, and styled "Eka" text logo
- Email + password auth with show/hide toggle on password fields
- Forgot password flow via Supabase email reset
- Role-based redirect after login (admin → admin dashboard, editor → editor tasks, etc.)
- Plain English error messages throughout (no tech jargon)
- Auth context and protected route wrappers

---

## Phase 2: Managing Director (Admin) Dashboard

### Sidebar Navigation
- Eka logo, sections: Overview, Clients, Videos, Design Tasks, Writing Tasks, Team, Notifications, Settings

### Overview Dashboard
- Agency health bar (% on-track deliverables)
- Stats cards: Active Clients, Videos in Production, Pending Reviews, Tasks Due This Week, Videos Live This Month
- Client snapshot grid with logos and activity
- Team activity feed (real-time)
- Upcoming deadlines (next 7 days)
- Recent client feedback

### Clients Management
- Client cards grid with logo, industry, contract info, deliverable progress
- Add/edit client via slide-in panel with full form including logo upload, brand colors, fonts, contract dates
- Client detail page with tabs: Videos, Design Tasks, Writing Tasks, Feedback, Brand Assets, Notes
- Reset client password, deactivate client

### Videos Management
- Filterable/sortable table (by client, status, editor, date)
- Add video form with client, editor assignment, linked design/writing tasks
- Slide-in detail panel with full status stepper, links, notes, feedback history
- Inline status updates

### Design Tasks & Writing Tasks Management
- Filterable tables for each task type
- Add task forms with client, assignee, type, due date, links
- Status tracking per workflow

### Team Management
- Team member cards with role badges, active task counts
- Add/edit team members (editors, designers, writers)
- Password reset and deactivate

### Settings
- Agency profile, admin accounts (new admin creation with security key), notification preferences, client portal settings, danger zone (archive/export)

### Deletion Protection
- Reusable confirmation modal requiring security key (`123@xcodeH`) for any destructive action — server-validated, never exposed in UI

---

## Phase 3: Video Editor Dashboard

- Simplified sidebar: My Tasks, All Clients, Notifications, Profile
- **My Tasks** as default home: grouped by Due Today / This Week / Upcoming
- Task cards with client logo, video title, status badge, color-coded due dates
- Horizontal status stepper for video workflow stages
- Video detail view: status stepper, Drive link input (with auto-conversion to direct download), internal notes, linked design/writing tasks (read-only), client feedback view
- All Clients view: grid of clients they've worked with → click to see associated videos

---

## Phase 4: Graphic Designer Dashboard

- Simplified sidebar: My Design Tasks, Client Brand Kits, Notifications, Profile
- **My Design Tasks** with Kanban board / list view toggle
- Kanban columns: Briefed → In Progress → In Review → Revisions → Approved → Delivered
- Task cards with type badge, client info, Figma/Drive link inputs, version notes, linked video status
- **Client Brand Kits** page: grid of clients showing logo, color swatches, fonts, downloadable brand files

---

## Phase 5: Content Writer Dashboard

- Simplified sidebar: My Writing Tasks, Client Briefs, Notifications, Profile
- **My Writing Tasks** in list view: Active / For Review / Completed sections
- Task cards with type badge, word count target, Google Doc link, version notes
- **Client Briefs** page: per-client brief, tone of voice, target audience, content pillars (read-only, populated by admin)

---

## Phase 6: Client Portal

- Clean, minimal design — client's own logo in header
- Welcome header with notification bell, "Need Help?" button (phone: 6304980350), logout
- **Progress overview**: visual pipeline of monthly deliverables (progress ring/bar)
- **Video cards grid** with client-friendly status labels and emojis (Planning, Filming, Ready for Your Review, Live!, etc.)
- "Ready for Review" cards highlighted with Download, Approve, and Request Changes buttons
- **Feedback modal**: text feedback textarea + voice note recording (MediaRecorder API → Supabase Storage), feedback history with resolved status
- **Design asset downloads**: grid of approved deliverables with download buttons
- Sticky contact CTA with phone number

---

## Phase 7: Cross-Cutting Features

### Notifications System
- Auto-generated notifications for: video created, status changes, client feedback, approvals, task updates
- Bell icon with unread badge, slide-in notification panel
- Mark individual/all as read
- Real-time via Supabase Realtime subscriptions

### Real-time Sync
- Supabase Realtime subscriptions on videos, feedback, and notifications tables
- Changes appear across all devices without refresh

### Voice Feedback Recording
- `useVoiceRecorder` hook encapsulating MediaRecorder API
- Record up to 5 minutes, playback before sending, upload to Supabase Storage
- Audio player for playback in both client and admin views

### Activity Logging
- All significant actions logged to `activity_log` table
- Displayed in admin dashboard team activity feed and video detail histories

### Google Drive Link Processing
- Utility function auto-converts Google Drive share URLs to direct download links

### Responsive Design
- Mobile (<768px): single column, bottom tab navigation
- Tablet (768–1024px): 2-column grid, collapsible sidebar
- Desktop (>1024px): full sidebar, multi-column tables, split-panel details

### Loading & Error States
- Skeleton loaders for all data grids and tables
- Optimistic UI for status updates
- Fade-in page transitions
- Global error boundary with friendly messaging

