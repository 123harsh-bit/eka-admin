// AI brief generator — uses Lovable AI Gateway (Gemini)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { topic, clientName, contentType, durationSeconds, notes } = await req.json();
    if (!topic) {
      return new Response(JSON.stringify({ error: 'topic required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const system = `You are a senior content producer at a creative agency. Generate a production brief as STRICT JSON only — no prose, no markdown. Schema:
{
  "writing_brief": "string — 120-200 word script/copy direction with hook, body, CTA",
  "shoot_checklist": ["string", ...]  // 5-10 concrete shots/setups,
  "caption_drafts": ["string", "string", "string"]  // 3 distinct social caption variants
}`;

    const user = `Brand: ${clientName || 'Unspecified'}
Content type: ${contentType || 'short-form video'}
Target duration: ${durationSeconds ? `${durationSeconds}s` : 'flexible'}
Topic / idea: ${topic}
${notes ? `Extra notes: ${notes}` : ''}`;

    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        response_format: { type: 'json_object' },
      }),
    });

    if (res.status === 429) {
      return new Response(JSON.stringify({ error: 'Rate limited — try again shortly' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (res.status === 402) {
      return new Response(JSON.stringify({ error: 'AI credits exhausted — add credits in workspace settings' }), {
        status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!res.ok) {
      const t = await res.text();
      return new Response(JSON.stringify({ error: `AI error: ${t}` }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const json = await res.json();
    const content = json.choices?.[0]?.message?.content || '{}';
    const match = content.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : content);

    return new Response(JSON.stringify({
      writing_brief: parsed.writing_brief || '',
      shoot_checklist: Array.isArray(parsed.shoot_checklist) ? parsed.shoot_checklist : [],
      caption_drafts: Array.isArray(parsed.caption_drafts) ? parsed.caption_drafts : [],
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
