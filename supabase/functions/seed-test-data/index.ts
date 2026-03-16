import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Create test parent user
    const { data: parentAuth, error: parentErr } = await supabase.auth.admin.createUser({
      email: "parent@test.com",
      password: "Test1234!",
      email_confirm: true,
    });
    if (parentErr && !parentErr.message.includes("already been registered")) throw parentErr;
    const parentId = parentAuth?.user?.id;

    // If user already exists, look them up
    let finalParentId = parentId;
    if (!finalParentId) {
      const { data: existing } = await supabase.auth.admin.listUsers();
      finalParentId = existing?.users?.find((u) => u.email === "parent@test.com")?.id;
    }

    // 2. Create test practitioner user
    const { data: practAuth, error: practErr } = await supabase.auth.admin.createUser({
      email: "practitioner@test.com",
      password: "Test1234!",
      email_confirm: true,
    });
    if (practErr && !practErr.message.includes("already been registered")) throw practErr;
    let practId = practAuth?.user?.id;
    if (!practId) {
      const { data: existing } = await supabase.auth.admin.listUsers();
      practId = existing?.users?.find((u) => u.email === "practitioner@test.com")?.id;
    }

    // 3. Assign roles
    if (finalParentId) {
      await supabase.from("user_roles").upsert(
        { user_id: finalParentId, role: "parent" },
        { onConflict: "user_id,role" }
      );
    }
    if (practId) {
      await supabase.from("user_roles").upsert(
        { user_id: practId, role: "practitioner" },
        { onConflict: "user_id,role" }
      );
    }

    // 4. Create test children
    if (!finalParentId) throw new Error("Parent user not found");

    // Child 1: active, phase 1, with some sessions
    const { data: child1, error: c1Err } = await supabase
      .from("children")
      .upsert(
        {
          first_name: "איתי",
          last_name: "כהן",
          parent_id: finalParentId,
          current_phase: 1,
          passive_duration: 40,
          start_date: "2026-03-01",
          is_active: true,
        },
        { onConflict: "parent_id,first_name,last_name", ignoreDuplicates: true }
      )
      .select()
      .single();

    // Child 2: active, phase 3
    const { data: child2 } = await supabase
      .from("children")
      .upsert(
        {
          first_name: "נועה",
          last_name: "לוי",
          parent_id: finalParentId,
          current_phase: 3,
          passive_duration: 60,
          start_date: "2026-02-15",
          is_active: true,
        },
        { onConflict: "parent_id,first_name,last_name", ignoreDuplicates: true }
      )
      .select()
      .single();

    // Child 3: completed
    const { data: child3 } = await supabase
      .from("children")
      .upsert(
        {
          first_name: "יונתן",
          last_name: "ברק",
          parent_id: finalParentId,
          current_phase: 6,
          passive_duration: 40,
          start_date: "2025-10-01",
          is_active: false,
        },
        { onConflict: "parent_id,first_name,last_name", ignoreDuplicates: true }
      )
      .select()
      .single();

    // 5. Create test sessions for child 1 (5 sessions over last 5 days)
    if (child1) {
      const today = new Date();
      const sessions = [];
      for (let i = 1; i <= 5; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        sessions.push({
          child_id: child1.id,
          date: d.toISOString().split("T")[0],
          passive_completed: true,
          active_completed: false,
          is_archived: false,
        });
      }
      await supabase.from("sessions").upsert(sessions, { onConflict: "child_id,date", ignoreDuplicates: true });
    }

    // Sessions for child 2 (10 sessions)
    if (child2) {
      const today = new Date();
      const sessions = [];
      for (let i = 1; i <= 10; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        sessions.push({
          child_id: child2.id,
          date: d.toISOString().split("T")[0],
          passive_completed: true,
          active_completed: i % 2 === 0,
          active_minutes: i % 2 === 0 ? 15 : null,
          is_archived: false,
        });
      }
      await supabase.from("sessions").upsert(sessions, { onConflict: "child_id,date", ignoreDuplicates: true });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Test data seeded!",
        credentials: {
          parent: { email: "parent@test.com", password: "Test1234!" },
          practitioner: { email: "practitioner@test.com", password: "Test1234!" },
        },
        children: [child1?.id, child2?.id, child3?.id].filter(Boolean),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
