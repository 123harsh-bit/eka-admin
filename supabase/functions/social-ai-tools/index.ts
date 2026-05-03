const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;

async function callAI(messages: Array<{ role: string; content: unknown }>, model = 'google/gemini-2.5-flash') {
  const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages }),
  });
  if (res.status === 429) throw new Error('Rate limited — try again in a moment');
  if (res.status === 402) throw new Error('AI credits exhausted — please add funds in workspace settings');
  if (!res.ok) throw new Error(`AI error: ${await res.text()}`);
  const json = await res.json();
  return json.choices?.[0]?.message?.content || '';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { mode, ...payload } = await req.json();

    if (mode === 'caption') {
      const { topic, platform, tone, clientName, language } = payload;
      if (!topic) return new Response(JSON.stringify({ error: 'Topic required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const sys = `You are a senior social-media copywriter. Write a ${platform || 'Instagram'} caption in ${language || 'English'}, ${tone || 'engaging'} tone${clientName ? `, for brand "${clientName}"` : ''}. Use line breaks for readability. End with a call-to-action. Do NOT add hashtags (those go separately). Return only the caption text.`;
      const out = await callAI([{ role: 'system', content: sys }, { role: 'user', content: topic }]);
      return new Response(JSON.stringify({ caption: out.trim() }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (mode === 'hashtags') {
      const { topic, platform, count } = payload;
      const n = Math.min(Math.max(Number(count) || 15, 3), 30);
      const sys = `Return ONLY ${n} relevant ${platform || 'Instagram'} hashtags for the topic, space-separated, each starting with #. Mix popular + niche. No commentary.`;
      const out = await callAI([{ role: 'system', content: sys }, { role: 'user', content: topic }]);
      const tags = out.match(/#[\p{L}0-9_]+/gu)?.join(' ') || out;
      return new Response(JSON.stringify({ hashtags: tags }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (mode === 'extract_analytics') {
      const { imageUrl, platform } = payload;
      if (!imageUrl) return new Response(JSON.stringify({ error: 'imageUrl required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const sys = `Extract social media analytics numbers from this ${platform || ''} screenshot. Return ONLY a JSON object with optional integer keys: likes, comments, views, reach. Convert "1.2k"→1200, "3.4M"→3400000. If a number is missing, omit it. No prose.`;
      const out = await callAI([
        { role: 'system', content: sys },
        { role: 'user', content: [{ type: 'image_url', image_url: { url: imageUrl } }] },
      ], 'google/gemini-2.5-flash');
      const json = out.match(/\{[\s\S]*\}/)?.[0];
      const parsed = json ? JSON.parse(json) : {};
      return new Response(JSON.stringify({ analytics: parsed }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Unknown mode' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
