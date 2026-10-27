// Connect Instagram / Facebook Page accounts via Meta OAuth.
// POST (signed in): returns the Meta login URL.
// GET ?code&state: Meta redirects here; stores pages + IG accounts, redirects back to app.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const GRAPH = 'https://graph.facebook.com/v21.0';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const admin = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/meta-connect`;
const SCOPES = [
  'pages_show_list', 'pages_read_engagement', 'pages_manage_posts',
  'instagram_basic', 'instagram_content_publish', 'business_management',
].join(',');

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

async function graph(path: string, params: Record<string, string>) {
  const r = await fetch(`${GRAPH}${path}?${new URLSearchParams(params)}`);
  const body = await r.json();
  if (!r.ok || body.error) throw new Error(body.error?.message || `Meta error ${r.status}`);
  return body;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const appId = Deno.env.get('META_APP_ID');
  const appSecret = Deno.env.get('META_APP_SECRET');

  if (req.method === 'POST') {
    if (!appId || !appSecret) return json({ error: 'Meta app keys are not added yet.' }, 400);
    const auth = req.headers.get('Authorization') || '';
    const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ error: 'Unauthorized' }, 401);
    const { data: roles } = await admin.from('user_roles').select('role').eq('user_id', u.user.id);
    const ok = (roles || []).some((r) => ['admin', 'coo', 'social_executive'].includes(r.role as string));
    if (!ok) return json({ error: 'Forbidden' }, 403);

    const body = await req.json().catch(() => ({}));
    const returnUrl = typeof body.return_url === 'string' && /^https?:\/\//.test(body.return_url) ? body.return_url : '';
    if (!returnUrl) return json({ error: 'return_url required' }, 400);
    const state = crypto.randomUUID().replace(/-/g, '');
    await admin.from('social_oauth_states').insert({ state, user_id: u.user.id, return_url: returnUrl });
    const url = `https://www.facebook.com/v21.0/dialog/oauth?${new URLSearchParams({
      client_id: appId, redirect_uri: REDIRECT_URI, state, scope: SCOPES, response_type: 'code',
    })}`;
    return json({ url });
  }

  // GET callback
  const url = new URL(req.url);
  const state = url.searchParams.get('state') || '';
  const code = url.searchParams.get('code');
  const { data: st } = await admin.from('social_oauth_states').select('*').eq('state', state).maybeSingle();
  if (!st) return new Response('Invalid or expired link. Please try connecting again.', { status: 400 });
  await admin.from('social_oauth_states').delete().eq('state', state);
  const back = (q: string) => Response.redirect(`${st.return_url}${st.return_url.includes('?') ? '&' : '?'}${q}`, 302);
  if (!code) return back(`meta_error=${encodeURIComponent(url.searchParams.get('error_description') || 'Cancelled')}`);

  try {
    const short = await graph('/oauth/access_token', {
      client_id: appId!, client_secret: appSecret!, redirect_uri: REDIRECT_URI, code,
    });
    const long = await graph('/oauth/access_token', {
      grant_type: 'fb_exchange_token', client_id: appId!, client_secret: appSecret!, fb_exchange_token: short.access_token,
    });
    // Page tokens derived from a long-lived user token do not expire.
    const pages = await graph('/me/accounts', {
      access_token: long.access_token,
      fields: 'id,name,access_token,picture{url},instagram_business_account{id,username,name,profile_picture_url}',
      limit: '100',
    });
    let count = 0;
    for (const p of pages.data || []) {
      const rows = [{
        platform: 'facebook', external_id: p.id, page_id: p.id, name: p.name,
        username: null, avatar_url: p.picture?.data?.url ?? null,
      }];
      const ig = p.instagram_business_account;
      if (ig) rows.push({
        platform: 'instagram', external_id: ig.id, page_id: p.id, name: ig.name || ig.username,
        username: ig.username, avatar_url: ig.profile_picture_url ?? null,
      });
      for (const r of rows) {
        const { data: acc, error } = await admin.from('social_accounts')
          .upsert({ ...r, connected_by: st.user_id, is_active: true }, { onConflict: 'platform,external_id' })
          .select('id').single();
        if (error || !acc) { console.error(error); continue; }
        await admin.from('social_account_tokens').upsert({ account_id: acc.id, access_token: p.access_token, updated_at: new Date().toISOString() });
        count++;
      }
    }
    return back(`meta_connected=${count}`);
  } catch (e) {
    console.error('meta-connect failed', e);
    return back(`meta_error=${encodeURIComponent((e as Error).message)}`);
  }
});
