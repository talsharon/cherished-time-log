import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface LogEntry {
  title: string;
  comment: string | null;
  start_time: string;
  duration: number;
}

interface Category {
  name: string;
  description: string | null;
}

interface GraphDataPoint {
  name: string;
  value: number;
  date?: string;
}

interface Graph {
  title: string;
  type: "pie" | "bar" | "line";
  data: GraphDataPoint[];
}

interface AnalysisResult {
  summary: string;
  insights: string;
  recommendations: string;
  new_categories: { name: string; description: string }[];
  graphs: Graph[];
}

// Calculate the PREVIOUS completed week (Saturday to Friday)
// Cron runs Saturday 06:30 UTC, so Friday is fully complete
function getPreviousWeekRange(): { weekStart: Date; weekEnd: Date } {
  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // Sunday = 0, Saturday = 6

  // Calculate days back to the previous Saturday
  // Saturday = 6: go back 7 days to previous Saturday
  // Sunday = 0: go back 1 day, Monday = 1: go back 2, etc.
  const daysBackToSaturday = dayOfWeek === 6 ? 7 : dayOfWeek + 1;

  const weekStart = new Date(now);
  weekStart.setUTCDate(now.getUTCDate() - daysBackToSaturday);
  weekStart.setUTCHours(0, 0, 0, 0);

  // Week ends on Friday (6 days after Saturday)
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
  weekEnd.setUTCHours(23, 59, 59, 999);

  return { weekStart, weekEnd };
}

async function processUserInsights(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
  weekStart: Date,
  weekEnd: Date,
  lovableApiKey: string
): Promise<boolean> {
  const weekStartStr = weekStart.toISOString().split("T")[0];
  const weekEndStr = weekEnd.toISOString().split("T")[0];

  // Fetch THIS WEEK's logs (what we're analyzing)
  const { data: weekLogs, error: weekLogsError } = await adminClient
    .from("logs")
    .select("title, comment, start_time, duration")
    .eq("user_id", userId)
    .gte("start_time", weekStart.toISOString())
    .lte("start_time", weekEnd.toISOString())
    .order("start_time", { ascending: true });

  if (weekLogsError) {
    console.error(`Error fetching week logs for user ${userId}:`, weekLogsError);
    return;
  }

  if (!weekLogs || weekLogs.length === 0) {
    console.log(`No logs for user ${userId} in week ${weekStartStr} - ${weekEndStr}. Skipping.`);
    return;
  }

  // Fetch HISTORICAL logs for comparison (up to 500, before this week)
  const { data: historicalLogs, error: histLogsError } = await adminClient
    .from("logs")
    .select("title, comment, start_time, duration")
    .eq("user_id", userId)
    .lt("start_time", weekStart.toISOString())
    .order("start_time", { ascending: false })
    .limit(500);

  if (histLogsError) {
    console.error(`Error fetching historical logs for user ${userId}:`, histLogsError);
    return;
  }

  // Fetch existing categories
  const { data: categories } = await adminClient
    .from("categories")
    .select("name, description")
    .eq("user_id", userId);

  // Pre-compute stats so the AI doesn't need to sum raw logs
  const totalSeconds = weekLogs.reduce((sum: number, l: any) => sum + l.duration, 0);
  const totalHours = Math.floor(totalSeconds / 3600);
  const totalMinutes = Math.round((totalSeconds % 3600) / 60);

  const byTitle: Record<string, number> = {};
  for (const log of weekLogs) {
    byTitle[log.title] = (byTitle[log.title] || 0) + log.duration;
  }
  const breakdown = Object.entries(byTitle)
    .sort((a, b) => b[1] - a[1])
    .map(([title, secs]) => `  - ${title}: ${(secs / 3600).toFixed(1)} hours (${((secs / totalSeconds) * 100).toFixed(1)}%)`)
    .join('\n');

  const statsBlock = `
COMPUTED STATS (use these exact numbers, do NOT re-calculate from raw logs):
- Total tracked time: ${totalHours} hours ${totalMinutes} minutes
- Activity count: ${weekLogs.length} entries
- Breakdown by activity:
${breakdown}
`;

  const prompt = buildPrompt(
    weekLogs as LogEntry[],
    (historicalLogs || []) as LogEntry[],
    categories as Category[] || [],
    weekStartStr,
    weekEndStr,
    statsBlock
  );

  // Call Lovable AI
  const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [{ role: "user", content: prompt }],
      tools: [
        {
          type: "function",
          function: {
            name: "submit_weekly_analysis",
            description: "Submit the complete weekly time tracking analysis",
            parameters: {
              type: "object",
              properties: {
                summary: {
                  type: "string",
                  description:
                    "A comprehensive summary paragraph in HEBREW of the week's activities (3-5 sentences)",
                },
                insights: {
                  type: "string",
                  description:
                    "Detailed insights in HEBREW as formatted text with bullet points and bold headers using ** markdown. Include all relevant observations.",
                },
                recommendations: {
                  type: "string",
                  description:
                    "Actionable recommendations in HEBREW as formatted text with bullet points and bold headers using ** markdown (3-5 items)",
                },
                new_categories: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      description: { type: "string" },
                    },
                    required: ["name", "description"],
                  },
                  description: "New categories discovered that don't exist in the provided list",
                },
                graphs: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      type: { type: "string", enum: ["pie", "bar", "line"] },
                      data: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            name: { type: "string" },
                            value: { type: "number" },
                            date: { type: "string" },
                          },
                          required: ["name", "value"],
                        },
                      },
                    },
                    required: ["title", "type", "data"],
                  },
                  minItems: 2,
                  maxItems: 3,
                },
              },
              required: ["summary", "insights", "recommendations", "new_categories", "graphs"],
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "submit_weekly_analysis" } },
    }),
  });

  if (!aiResponse.ok) {
    const errorText = await aiResponse.text();
    console.error(`AI gateway error for user ${userId}:`, aiResponse.status, errorText);
    return;
  }

  const aiData = await aiResponse.json();
  const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

  if (!toolCall || toolCall.function.name !== "submit_weekly_analysis") {
    console.error(`Unexpected AI response for user ${userId}:`, aiData);
    return;
  }

  const analysis: AnalysisResult = JSON.parse(toolCall.function.arguments);

  // Save new categories
  if (analysis.new_categories && analysis.new_categories.length > 0) {
    for (const cat of analysis.new_categories) {
      await adminClient
        .from("categories")
        .upsert(
          { user_id: userId, name: cat.name, description: cat.description },
          { onConflict: "user_id,name" }
        );
    }
  }

  // Upsert weekly insight
  const { error: upsertError } = await adminClient.from("weekly_insights").upsert(
    {
      user_id: userId,
      week_start: weekStartStr,
      week_end: weekEndStr,
      summary: analysis.summary,
      insights: analysis.insights,
      recommendations: analysis.recommendations,
      graphs: analysis.graphs,
    },
    { onConflict: "user_id,week_start" }
  );

  if (upsertError) {
    console.error(`Error saving insight for user ${userId}:`, upsertError);
  } else {
    console.log(`Successfully generated insights for user ${userId} (${weekStartStr} - ${weekEndStr})`);

    // Send push notification
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    try {
      await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          user_id: userId,
          title: "Time Tracker",
          body: "Your weekly insights are ready! 📊",
        }),
      });
    } catch (pushErr) {
      console.warn(`Push notification failed for user ${userId}:`, pushErr);
    }
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    // Admin client (service role) for all DB operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { weekStart, weekEnd } = getPreviousWeekRange();

    // Detect system call (cron) vs manual user call by checking JWT role claim
    let isSystemCall = false;
    try {
      const token = authHeader.replace("Bearer ", "");
      const payload = JSON.parse(atob(token.split('.')[1]));
      isSystemCall = payload.role === "service_role";
    } catch {
      isSystemCall = false;
    }

    if (isSystemCall) {
      // SYSTEM CALL: process all users that have active sessions
      console.log("System call detected — processing all users...");

      const { data: sessions, error: sessionsError } = await adminClient
        .from("active_sessions")
        .select("user_id");

      if (sessionsError || !sessions) {
        console.error("Error fetching active sessions:", sessionsError);
        return new Response(JSON.stringify({ error: "Failed to fetch users" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let processed = 0;
      for (const { user_id } of sessions) {
        await processUserInsights(adminClient, user_id, weekStart, weekEnd, lovableApiKey);
        processed++;
      }

      return new Response(
        JSON.stringify({ success: true, processed_users: processed }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } else {
      // MANUAL USER CALL: process only the authenticated user
      const token = authHeader.replace("Bearer ", "");
      const {
        data: { user },
        error: userError,
      } = await adminClient.auth.getUser(token);

      if (userError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if the user has any logs this week
      const { data: weekLogs } = await adminClient
        .from("logs")
        .select("id")
        .eq("user_id", user.id)
        .gte("start_time", weekStart.toISOString())
        .lte("start_time", weekEnd.toISOString())
        .limit(1);

      if (!weekLogs || weekLogs.length === 0) {
        return new Response(
          JSON.stringify({
            error: "No logs found for the analyzed week. Start tracking your time to get insights!",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      await processUserInsights(adminClient, user.id, weekStart, weekEnd, lovableApiKey);

      const weekStartStr = weekStart.toISOString().split("T")[0];
      const weekEndStr = weekEnd.toISOString().split("T")[0];

      return new Response(
        JSON.stringify({
          success: true,
          week_start: weekStartStr,
          week_end: weekEndStr,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function buildPrompt(
  weekLogs: LogEntry[],
  historicalLogs: LogEntry[],
  categories: Category[],
  weekStart: string,
  weekEnd: string,
  statsBlock: string
): string {
  const weekLogsJson = JSON.stringify(
    weekLogs.map((l) => ({
      title: l.title,
      comment: l.comment,
      start_time: l.start_time,
      duration_seconds: l.duration,
    })),
    null,
    2
  );

  const historicalLogsJson =
    historicalLogs.length > 0
      ? JSON.stringify(
          historicalLogs.map((l) => ({
            title: l.title,
            comment: l.comment,
            start_time: l.start_time,
            duration_seconds: l.duration,
          })),
          null,
          2
        )
      : "No historical data available yet.";

  const categoriesJson =
    categories.length > 0
      ? JSON.stringify(categories, null, 2)
      : "No categories yet - create appropriate ones based on the activities.";

  return `You are analyzing time tracking data to provide weekly insights for a user.

IMPORTANT: Write ALL text responses (summary, insights, recommendations) in HEBREW (עברית).
Category names should remain in ENGLISH for consistency.
Graph titles should be in HEBREW.

WEEK BEING ANALYZED: ${weekStart} (Saturday) to ${weekEnd} (Friday)

${statsBlock}

EXISTING CATEGORIES (use these when possible, only create new ones if truly needed):
${categoriesJson}

---

## THIS WEEK'S RAW LOGS (the period being analyzed — ${weekStart} to ${weekEnd}):
Format: { title, comment, start_time (ISO), duration_seconds }
${weekLogsJson}

---

## HISTORICAL LOGS (previous data for comparison — up to 500 entries before this week):
Use this to identify trends, changes, and compare against past patterns.
${historicalLogsJson}

---

YOUR TASK: Provide a comprehensive weekly analysis with 3 text sections and 2-3 visualizations. ALL TEXT MUST BE IN HEBREW.

---

## 1. SUMMARY
Write a comprehensive paragraph in HEBREW (3-5 sentences) summarizing the week's activities.

Include in your summary:
- Total tracked time and activity count FOR THIS WEEK
- Dominant categories and their proportion
- Notable shifts or patterns compared to historical data
- Overall assessment of the week

---

## 2. INSIGHTS
Provide detailed insights in HEBREW as formatted text with bullet points. Use **bold** for headers.

You must include these categories but add more if you find interesting patterns:
- Most time spent categories (with hours and percentages for THIS WEEK)
- Comparison with historical averages (what changed vs previous weeks)
- Unusual activity patterns
- Productivity patterns, time-of-day analysis, streaks, etc.

---

## 3. RECOMMENDATIONS
Provide actionable recommendations in HEBREW based on your analysis (3-5 items). Use **bold** for emphasis.

Base recommendations on:
- Differences between this week and historical patterns
- Broken streaks or habits
- Productivity improvements
- Work-life balance

---

## 4. GRAPHS
Create 2-3 visualizations. All values must be in MINUTES. Graph TITLES should be in HEBREW.

Required charts:
1. PIE chart showing time distribution by category for THIS WEEK (title in Hebrew, e.g., "התפלגות זמן לפי קטגוריה")
2. BAR or LINE chart showing daily totals or category comparison this week vs historical average (title in Hebrew)
3. (Optional) Additional chart revealing an interesting pattern (title in Hebrew)

Chart data format:
- PIE/BAR: { name: "Category Name", value: 120 } (value in minutes, category names in ENGLISH)
- LINE: { name: "Day", value: 480, date: "2026-01-27" } (date in YYYY-MM-DD)

---

Call the submit_weekly_analysis function with your complete analysis in HEBREW.`;
}
