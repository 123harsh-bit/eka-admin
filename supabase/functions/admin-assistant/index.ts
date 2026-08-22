// Admin AI assistant — chat with tool calling to create/assign/update videos.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const VIDEO_STATUSES = [
  'idea', 'scripting', 'script_submitted', 'script_client_review', 'script_approved',
  'shoot_assigned', 'shooting', 'footage_delivered', 'editing', 'internal_review',
  'client_review', 'revisions', 'approved', 'ready_to_upload', 'live',
];

const tools = [
  {
    type: 'function',
    function: {
      name: 'list_clients',
      description: 'List all clients (id + name). Use to resolve a client name the user mentions.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_team',
      description: 'List team members with their roles. Use to resolve a person name to an id.',
      parameters: {
        type: 'object',
        properties: { role: { type: 'string', description: 'Optional role filter: editor, writer, designer, camera_operator, social_executive' } },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'find_videos',
      description: 'Search videos by title text, client name, or status. Returns ids, titles, statuses and current assignees.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Text to match in the video title' },
          client_name: { type: 'string' },
          status: { type: 'string' },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_video',
      description: 'Create a new video/project. Requires a title and client name.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          client_name: { type: 'string' },
          description: { type: 'string' },
          status: { type: 'string', description: `One of: ${VIDEO_STATUSES.join(', ')}. Defaults to idea.` },
          date_planned: { type: 'string', description: 'YYYY-MM-DD' },
          priority: { type: 'number', description: 'Lower = higher priority. 1 is first priority.' },
        },
        required: ['title', 'client_name'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_video',
      description: 'Update an existing video: status, priority, planned date, links.',
      parameters: {
        type: 'object',
        properties: {
          video_id: { type: 'string' },
          status: { type: 'string' },
          priority: { type: 'number' },
          date_planned: { type: 'string' },
          drive_link: { type: 'string' },
          live_url: { type: 'string' },
          raw_footage_link: { type: 'string' },
          shoot_date: { type: 'string' },
          shoot_location: { type: 'string' },
        },
        required: ['video_id'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'assign_person',
      description: 'Assign a team member to a video for a given role. Creates the writing/design task when needed and notifies them.',
      parameters: {
        type: 'object',
        properties: {
          video_id: { type: 'string' },
          person_id: { type: 'string' },
          role: { type: 'string', description: 'writer | editor | camera_operator | designer | social_executive' },
          due_date: { type: 'string', description: 'YYYY-MM-DD, optional' },
        },
        required: ['video_id', 'person_id', 'role'],
        additionalProperties: false,
      },
    },
  },
];

type SB = ReturnType<typeof createClient>;

// --- typo-tolerant matching ---------------------------------------------
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
const STOP = new Set(['dr', 'mr', 'mrs', 'ms', 'the', 'a', 'of', 'and', 'video', 'reel', 'for']);

function lev(a: string, b: string) {
  const m = a.length, n = b.length;
  if (!m || !n) return Math.max(m, n);
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

function tokenScore(t: string, target: string) {
  if (!t) return 0;
  const words = norm(target).split(' ').filter(Boolean);
  let best = 0;
  for (const w of words) {
    if (w === t) best = Math.max(best, 1);
    else if (w.startsWith(t) || t.startsWith(w)) best = Math.max(best, 0.85);
    else if (w.includes(t) || t.includes(w)) best = Math.max(best, 0.7);
    else {
      const d = lev(t, w);
      const sim = 1 - d / Math.max(t.length, w.length);
      if (sim >= 0.7) best = Math.max(best, sim * 0.9);
    }
  }
  return best;
}

/** 0..1 similarity that tolerates typos, partials, missing titles and word order. */
function fuzzyScore(needle: string, target: string) {
  const n = norm(needle), t = norm(target);
  if (!n || !t) return 0;
  if (t.includes(n)) return 1;
  const toks = n.split(' ').filter(w => w && !STOP.has(w));
  if (!toks.length) return 0;
  const scores = toks.map(tok => tokenScore(tok, t));
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return Math.max(avg, Math.max(...scores) * 0.8);
}

function bestMatch<T>(needle: string, rows: T[], get: (r: T) => string) {
  const scored = rows.map(r => ({ r, s: fuzzyScore(needle, get(r)) })).sort((a, b) => b.s - a.s);
  return scored.length && scored[0].s > 0.5 ? scored[0].r : null;
}


async function notify(db: SB, userId: string, message: string, videoId?: string, clientId?: string | null) {
  await db.from('notifications').insert({
    recipient_id: userId,
    type: 'assignment',
    message,
    related_video_id: videoId ?? null,
    related_client_id: clientId ?? null,
  } as any);
}

async function runTool(db: SB, name: string, args: any) {
  switch (name) {
    case 'list_clients': {
      const { data } = await db.from('clients').select('id, name').order('name');
      return data ?? [];
    }
    case 'list_team': {
      const { data: roles } = await db.from('user_roles').select('user_id, role');
      const filtered = (roles ?? []).filter((r: any) => r.role !== 'client' && (!args?.role || r.role === args.role));
      const ids = filtered.map((r: any) => r.user_id);
      if (!ids.length) return [];
      const { data: profiles } = await db.from('profiles').select('id, full_name').in('id', ids);
      return filtered.map((r: any) => ({
        id: r.user_id,
        role: r.role,
        name: (profiles ?? []).find((p: any) => p.id === r.user_id)?.full_name ?? 'Unknown',
      }));
    }
    case 'find_videos': {
      let q = db.from('videos').select('id, title, status, priority, date_planned, created_at, assigned_editor, assigned_camera_operator, assigned_social_id, client_id, clients(name)').order('created_at', { ascending: false }).limit(300);
      if (args?.status) q = q.eq('status', args.status);
      const { data, error } = await q;
      if (error) return { error: error.message };
      let rows = (data ?? []) as any[];
      if (args?.client_name) {
        const scored = rows
          .map(r => ({ r, s: fuzzyScore(String(args.client_name), r.clients?.name ?? '') }))
          .filter(x => x.s > 0.34)
          .sort((a, b) => b.s - a.s);
        rows = scored.map(x => x.r);
      }
      if (args?.query) {
        const scored = rows
          .map(r => ({ r, s: Math.max(fuzzyScore(String(args.query), r.title ?? ''), fuzzyScore(String(args.query), `${r.clients?.name ?? ''} ${r.title ?? ''}`)) }))
          .filter(x => x.s > 0.34)
          .sort((a, b) => b.s - a.s);
        rows = scored.map(x => x.r);
      }
      return rows.slice(0, 25).map(r => ({ id: r.id, title: r.title, status: r.status, priority: r.priority, date_planned: r.date_planned, created_at: r.created_at, client: r.clients?.name, assigned_editor: r.assigned_editor, assigned_camera_operator: r.assigned_camera_operator, assigned_social_id: r.assigned_social_id }));
    }
    case 'create_video': {
      const { data: clients } = await db.from('clients').select('id, name');
      const client = bestMatch(String(args.client_name ?? ''), (clients ?? []) as any[], (c: any) => c.name);
      if (!client) return { error: `No client matching "${args.client_name}". Available: ${(clients ?? []).map((c: any) => c.name).join(', ')}` };
      const status = args.status && VIDEO_STATUSES.includes(args.status) ? args.status : 'idea';
      const { data, error } = await db.from('videos').insert({
        title: args.title,
        description: args.description ?? null,
        client_id: (client as any).id,
        status,
        date_planned: args.date_planned ?? null,
        priority: args.priority ?? 100,
      } as any).select('id, title, status').single();
      if (error) return { error: error.message };
      return { created: data, client: (client as any).name };
    }
    case 'update_video': {
      const patch: Record<string, unknown> = {};
      if (args.status) {
        if (!VIDEO_STATUSES.includes(args.status)) return { error: `Invalid status. Valid: ${VIDEO_STATUSES.join(', ')}` };
        patch.status = args.status;
      }
      for (const k of ['priority', 'date_planned', 'drive_link', 'live_url', 'raw_footage_link', 'shoot_date', 'shoot_location']) {
        if (args[k] !== undefined && args[k] !== null) patch[k] = args[k];
      }
      if (!Object.keys(patch).length) return { error: 'Nothing to update' };
      const { data, error } = await db.from('videos').update(patch as any).eq('id', args.video_id).select('id, title, status, priority, client_id').single();
      if (error) return { error: error.message };
      // keep linked writing task in sync on script approval
      if (patch.status === 'script_approved') {
        await db.from('writing_tasks').update({ status: 'approved' }).eq('video_id', args.video_id);
      }
      return { updated: data };
    }
    case 'assign_person': {
      const { data: video, error: vErr } = await db.from('videos').select('id, title, client_id, clients(name)').eq('id', args.video_id).single();
      if (vErr || !video) return { error: 'Video not found' };
      const title = (video as any).title;
      const clientName = (video as any).clients?.name ?? 'client';
      const clientId = (video as any).client_id;
      const role = String(args.role);

      if (role === 'writer') {
        const { data: existing } = await db.from('writing_tasks').select('id').eq('video_id', args.video_id).limit(1);
        if (existing && existing.length) {
          await db.from('writing_tasks').update({ assigned_writer: args.person_id }).eq('id', (existing[0] as any).id);
        } else {
          const { error } = await db.from('writing_tasks').insert({
            title: `${title} — Script`, client_id: clientId, video_id: args.video_id,
            assigned_writer: args.person_id, task_type: 'reel_script', status: 'briefed',
            due_date: args.due_date ?? null,
          } as any);
          if (error) return { error: error.message };
        }
        await db.from('videos').update({ status: 'scripting' } as any).eq('id', args.video_id);
        await notify(db, args.person_id, `📝 New script assignment: '${title}' for ${clientName}.`, args.video_id, clientId);
        return { ok: true, message: `Writer assigned and video moved to Scripting.` };
      }

      if (role === 'designer') {
        const { data: existing } = await db.from('design_tasks').select('id').eq('video_id', args.video_id).limit(1);
        if (existing && existing.length) {
          await db.from('design_tasks').update({ assigned_designer: args.person_id }).eq('id', (existing[0] as any).id);
        } else {
          const { error } = await db.from('design_tasks').insert({
            title: `${title} — Design`, client_id: clientId, video_id: args.video_id,
            assigned_designer: args.person_id, status: 'briefed', due_date: args.due_date ?? null,
          } as any);
          if (error) return { error: error.message };
        }
        await notify(db, args.person_id, `🎨 New design task: '${title}' for ${clientName}.`, args.video_id, clientId);
        return { ok: true, message: 'Designer assigned.' };
      }

      const column = role === 'editor' ? 'assigned_editor'
        : role === 'camera_operator' ? 'assigned_camera_operator'
        : role === 'social_executive' ? 'assigned_social_id' : null;
      if (!column) return { error: `Unknown role "${role}"` };

      const patch: Record<string, unknown> = { [column]: args.person_id };
      if (role === 'camera_operator' && args.due_date) patch.shoot_date = args.due_date;
      const { error } = await db.from('videos').update(patch as any).eq('id', args.video_id);
      if (error) return { error: error.message };

      const msg = role === 'editor' ? `✂️ '${title}' for ${clientName} has been assigned to you for editing.`
        : role === 'camera_operator' ? `🎬 You've been assigned the shoot for '${title}' (${clientName}).`
        : `📤 '${title}' for ${clientName} is assigned to you for publishing.`;
      await notify(db, args.person_id, msg, args.video_id, clientId);
      return { ok: true, message: `${role} assigned.` };
    }
    default:
      return { error: `Unknown tool ${name}` };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401);

    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: userData } = await db.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!userData?.user) return json({ error: 'Unauthorized' }, 401);

    const { data: roleRow } = await db.from('user_roles').select('role').eq('user_id', userData.user.id).single();
    const callerRole = (roleRow as any)?.role;
    if (callerRole !== 'admin' && callerRole !== 'coo') return json({ error: 'Forbidden — admins only' }, 403);

    const body = await req.json();
    const history = Array.isArray(body?.messages) ? body.messages : [];
    if (!history.length) return json({ error: 'messages required' }, 400);

    const today = new Date().toISOString().slice(0, 10);
    const system = `You are the production assistant for EKA, a content agency. You help the admin manage the video pipeline by calling tools.

Today is ${today}.

Rules:
- Always resolve names to ids with list_clients / list_team / find_videos BEFORE create/update/assign calls. Never invent ids.
- If a name is ambiguous (multiple matches), ask which one instead of guessing.
- Video statuses in order: ${VIDEO_STATUSES.join(', ')}.
- Priority is a number where lower = higher priority (1 = first priority).
- You may chain several tools in one turn to complete a multi-part request (e.g. create a video, then assign a writer, camera operator and editor).
- After acting, reply in short markdown confirming exactly what changed. Be concise, no fluff.`;

    const messages: any[] = [{ role: 'system', content: system }, ...history];
    const actions: string[] = [];

    for (let step = 0; step < 10; step++) {
      const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'google/gemini-2.5-flash', messages, tools, tool_choice: 'auto' }),
      });

      if (res.status === 429) return json({ error: 'Rate limited — try again shortly' }, 429);
      if (res.status === 402) return json({ error: 'AI credits exhausted — add credits in Lovable settings' }, 402);
      if (!res.ok) return json({ error: `AI error: ${await res.text()}` }, 500);

      const data = await res.json();
      const choice = data.choices?.[0];
      const msg = choice?.message;
      if (!msg) return json({ error: 'Empty AI response' }, 500);

      const calls = msg.tool_calls ?? [];
      if (!calls.length) {
        return json({ reply: msg.content ?? '', actions });
      }

      messages.push({ role: 'assistant', content: msg.content ?? '', tool_calls: calls });
      for (const call of calls) {
        let args: any = {};
        try { args = JSON.parse(call.function.arguments || '{}'); } catch { /* ignore */ }
        const result = await runTool(db, call.function.name, args);
        if (['create_video', 'update_video', 'assign_person'].includes(call.function.name) && !(result as any)?.error) {
          actions.push(call.function.name);
        }
        messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) });
      }
    }

    return json({ reply: 'I ran out of steps on that request — try breaking it into smaller instructions.', actions });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Server error' }, 500);
  }
});
