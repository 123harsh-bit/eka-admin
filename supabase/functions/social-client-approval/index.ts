import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    if (!token || !/^[a-z0-9]{16,64}$/i.test(token)) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('scheduled_posts')
        .select('id,title,caption,hashtags,media_urls,media_type,platforms,scheduled_at,client_approval_status,client_feedback,clients(name,logo_url)')
        .eq('client_approval_token', token)
        .maybeSingle();
      if (error || !data) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (req.method === 'POST') {
      const body = await req.json();
      const { decision, feedback } = body || {};
      if (!['approved', 'changes_requested'].includes(decision)) {
        return new Response(JSON.stringify({ error: 'Invalid decision' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const { error } = await supabase
        .from('scheduled_posts')
        .update({
          client_approval_status: decision,
          client_approval_at: new Date().toISOString(),
          client_feedback: typeof feedback === 'string' ? feedback.slice(0, 1000) : null,
        })
        .eq('client_approval_token', token);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
