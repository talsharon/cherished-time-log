import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
    const vapidSubject = Deno.env.get("VAPID_SUBJECT")!.replace(/[<>]/g, "").replace(/\s+/g, "");

    // Only allow internal calls with service role key
    const authHeader = req.headers.get("Authorization");
    if (authHeader !== `Bearer ${supabaseServiceKey}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { user_id, title, body } = await req.json();

    if (!user_id || !title || !body) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch user's push subscription
    const { data: subs, error: subError } = await adminClient
      .from("push_subscriptions")
      .select("subscription")
      .eq("user_id", user_id)
      .limit(1);

    if (subError || !subs || subs.length === 0) {
      console.log(`No push subscription found for user ${user_id}`);
      return new Response(
        JSON.stringify({ success: false, reason: "no_subscription" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const subscription = subs[0].subscription as {
      endpoint: string;
      keys: { p256dh: string; auth: string };
    };

    // Configure web-push with VAPID details
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const payload = JSON.stringify({ title, body });

    try {
      await webpush.sendNotification(subscription, payload);
    } catch (pushError: unknown) {
      const err = pushError as { statusCode?: number; body?: string };
      console.error(`Push failed (${err.statusCode}):`, err.body);

      // Clean up expired subscriptions
      if (err.statusCode === 410 || err.statusCode === 404) {
        await adminClient
          .from("push_subscriptions")
          .delete()
          .eq("user_id", user_id);
        console.log(`Removed expired subscription for user ${user_id}`);
      }

      return new Response(
        JSON.stringify({ success: false, status: err.statusCode }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Push notification sent to user ${user_id}`);
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("send-push-notification error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
