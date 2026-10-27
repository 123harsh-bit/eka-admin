// Publishes due auto-publish posts to connected Instagram / Facebook accounts.
// Called by the schedule every few minutes, or by a signed-in team member with { post_id } for "Publish now".
// Instagram videos are processed by Meta asynchronously, so each run advances every account one step.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const GRAPH = 'https://graph.facebook.com/v21.0';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const admin = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

type Result = { status: 'pending' | 'processing' | 'published' | 'failed'; container_id?: string; url?: string; error?: string };

async function call(method: 'GET' | 'POST', path: string, params: Record<string, string>) {
  const qs = new URLSearchParams(params);
  const r = method === 'GET'
    ? await fetch(`${GRAPH}${path}?${qs}`)
    : await fetch(`${GRAPH}${path}`, { method: 'POST', body: qs });
  const body = await r.json();
  if (!r.ok || body.error) throw new Error(body.error?.message || `Meta error ${r.status}`);
  return body;
}

const isVideo = (url: string, mediaType: string) =>
  ['video', 'reel'].includes(mediaType) || /\.(mp4|mov|webm|m4v)(\?|$)/i.test(url);

async function step(post: any, acc: any, token: string, prev: Result | undefined): Promise<Result> {
  const caption = [post.caption, post.hashtags].filter(Boolean).join('\n\n');
  const media: string = (post.media_urls || [])[0];
  if (!media) return { status: 'failed', error: 'No media attached' };
  const video = isVideo(media, post.media_type);

  if (acc.platform === 'facebook') {
    const r = video
      ? await call('POST', `/${acc.external_id}/videos`, { file_url: media, description: caption, access_token: token })
      : await call('POST', `/${acc.external_id}/photos`, { url: media, caption, access_token: token });
    return { status: 'published', url: `https://www.facebook.com/${r.post_id || r.id}` };
  }

  // Instagram: create container -> wait until FINISHED -> publish
  let containerId = prev?.container_id;
  if (!containerId) {
    const params: Record<string, string> = { caption, access_token: token };
    if (video) { params.media_type = post.media_type === 'story' ? 'STORIES' : 'REELS'; params.video_url = media; }
    else { params.image_url = media; if (post.media_type === 'story') params.media_type = 'STORIES'; }
    const c = await call('POST', `/${acc.external_id}/media`, params);
    containerId = c.id;
  }
  const s = await call('GET', `/${containerId}`, { fields: 'status_code,status', access_token: token });
  if (s.status_code === 'ERROR' || s.status_code === 'EXPIRED') return { status: 'failed', error: s.status || 'Meta could not process the media' };
  if (s.status_code !== 'FINISHED') return { status: 'processing', container_id: containerId };
  const pub = await call('POST', `/${acc.external_id}/media_publish`, { creation_id: containerId!, access_token: token });
  const info = await call('GET', `/${pub.id}`, { fields: 'permalink', access_token: token }).catch(() => ({}));
  return { status: 'published', url: (info as any).permalink };
}

async function processPost(post: any) {
  const ids: string[] = post.account_ids || [];
  const results: Record<string, Result> = { ...(post.publish_results || {}) };
  const { data: accounts } = await admin.from('social_accounts').select('*').in('id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']);
  const { data: tokens } = await admin.from('social_account_tokens').select('*').in('account_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']);
  for (const id of ids) {
    const prev = results[id];
    if (prev?.status === 'published' || prev?.status === 'failed') continue;
    const acc = accounts?.find((a) => a.id === id);
    const tok = tokens?.find((t) => t.account_id === id)?.access_token;
    if (!acc || !tok) { results[id] = { status: 'failed', error: 'Account disconnected' }; continue; }
    try { results[id] = await step(post, acc, tok, prev); }
    catch (e) { results[id] = { status: 'failed', error: (e as Error).message, container_id: prev?.container_id }; }
  }
  const all = ids.map((i) => results[i]);
  const done = all.every((r) => r && (r.status === 'published' || r.status === 'failed'));
  const anyOk = all.some((r) => r?.status === 'published');
  const errors = ids.filter((i) => results[i]?.status === 'failed').map((i) => {
    const a = accounts?.find((x) => x.id === i);
    return `${a?.name || 'Account'}: ${results[i].error}`;
  });
  const platform_urls: Record<string, string> = { ...(post.platform_urls || {}) };
  for (const i of ids) {
    const a = accounts?.find((x) => x.id === i);
    if (results[i]?.url && a) platform_urls[`${a.platform}:${a.username || a.name}`] = results[i].url!;
  }
  const update: Record<string, unknown> = {
    publish_results: results, platform_urls,
    publish_attempts: (post.publish_attempts || 0) + 1,
    publish_error: errors.length ? errors.join(' | ') : null,
  };
  if (done) {
    update.status = anyOk ? 'published' : 'failed';
    if (anyOk) update.published_at = new Date().toISOString();
  } else {
    update.status = 'publishing';
  }
  // Give up after ~2 hours of Meta processing.
  if (!done && (post.publish_attempts || 0) > 24) { update.status = anyOk ? 'published' : 'failed'; update.publish_error = 'Timed out waiting for Meta'; }
  await admin.from('scheduled_posts').update(update).eq('id', post.id);
  if (done && post.linked_video_id && anyOk) {
    await admin.from('videos').update({ social_posted_at: new Date().toISOString() }).eq('id', post.linked_video_id);
  }
  return { id: post.id, status: update.status };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    if (body?.post_id) {
      if (typeof body.post_id !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.post_id)) return json({ error: 'Invalid post_id' }, 400);
      const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
      });
      const { data: u } = await userClient.auth.getUser();
      if (!u?.user) return json({ error: 'Unauthorized' }, 401);
      const { data: roles } = await admin.from('user_roles').select('role').eq('user_id', u.user.id);
      if (!(roles || []).some((r) => ['admin', 'coo', 'social_executive'].includes(r.role as string))) return json({ error: 'Forbidden' }, 403);
      const { data: post } = await admin.from('scheduled_posts').select('*').eq('id', body.post_id).single();
      if (!post) return json({ error: 'Not found' }, 404);
      return json(await processPost(post));
    }

    const { data: due } = await admin.from('scheduled_posts').select('*')
      .eq('auto_publish', true)
      .in('status', ['scheduled', 'publishing'])
      .lte('scheduled_at', new Date().toISOString())
      .limit(20);
    const out = [];
    for (const p of due || []) out.push(await processPost(p));
    return json({ processed: out.length, out });
  } catch (e) {
    console.error('auto-publish failed', e);
    return json({ error: (e as Error).message }, 500);
  }
});
