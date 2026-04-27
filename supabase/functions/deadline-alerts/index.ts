import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const now = new Date();
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().split("T")[0];

  let alertsCreated = 0;

  try {
    // Videos due in 48h
    const { data: videos } = await supabase
      .from("videos")
      .select("id, title, due_date, assigned_editor, assigned_camera_operator, client_id")
      .not("due_date", "is", null)
      .gte("due_date", fmt(now))
      .lte("due_date", fmt(in48h))
      .neq("status", "live");

    for (const v of videos || []) {
      const recipients = [v.assigned_editor, v.assigned_camera_operator].filter(Boolean);
      for (const r of recipients) {
        // Skip if already alerted today
        const { data: exists } = await supabase
          .from("notifications")
          .select("id")
          .eq("recipient_id", r!)
          .eq("related_video_id", v.id)
          .eq("type", "deadline")
          .gte("created_at", fmt(now))
          .maybeSingle();
        if (exists) continue;

        await supabase.from("notifications").insert({
          recipient_id: r,
          related_video_id: v.id,
          related_client_id: v.client_id,
          type: "deadline",
          message: `⏰ "${v.title}" is due ${v.due_date}`,
        });
        alertsCreated++;
      }
    }

    // Writing tasks
    const { data: writing } = await supabase
      .from("writing_tasks")
      .select("id, title, due_date, assigned_writer, client_id")
      .not("due_date", "is", null)
      .gte("due_date", fmt(now))
      .lte("due_date", fmt(in48h))
      .not("status", "in", "(delivered,approved)");

    for (const t of writing || []) {
      if (!t.assigned_writer) continue;
      const { data: exists } = await supabase
        .from("notifications").select("id")
        .eq("recipient_id", t.assigned_writer)
        .eq("type", "deadline")
        .gte("created_at", fmt(now))
        .ilike("message", `%${t.title}%`)
        .maybeSingle();
      if (exists) continue;

      await supabase.from("notifications").insert({
        recipient_id: t.assigned_writer,
        related_client_id: t.client_id,
        type: "deadline",
        message: `⏰ Script "${t.title}" is due ${t.due_date}`,
      });
      alertsCreated++;
    }

    // Design tasks
    const { data: design } = await supabase
      .from("design_tasks")
      .select("id, title, due_date, assigned_designer, client_id")
      .not("due_date", "is", null)
      .gte("due_date", fmt(now))
      .lte("due_date", fmt(in48h))
      .not("status", "in", "(delivered,approved)");

    for (const t of design || []) {
      if (!t.assigned_designer) continue;
      const { data: exists } = await supabase
        .from("notifications").select("id")
        .eq("recipient_id", t.assigned_designer)
        .eq("type", "deadline")
        .gte("created_at", fmt(now))
        .ilike("message", `%${t.title}%`)
        .maybeSingle();
      if (exists) continue;

      await supabase.from("notifications").insert({
        recipient_id: t.assigned_designer,
        related_client_id: t.client_id,
        type: "deadline",
        message: `⏰ Design "${t.title}" is due ${t.due_date}`,
      });
      alertsCreated++;
    }

    return new Response(JSON.stringify({ ok: true, alertsCreated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
