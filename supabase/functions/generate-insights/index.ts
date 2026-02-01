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

    // Create client with user's auth token
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get user from token
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch last 500 logs
    const { data: logs, error: logsError } = await supabase
      .from("logs")
      .select("title, comment, start_time, duration")
      .eq("user_id", user.id)
      .order("start_time", { ascending: false })
      .limit(500);

    if (logsError) {
      console.error("Error fetching logs:", logsError);
      return new Response(JSON.stringify({ error: "Failed to fetch logs" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!logs || logs.length === 0) {
      return new Response(
        JSON.stringify({ error: "No logs found. Start tracking your time to get insights!" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch existing categories
    const { data: categories } = await supabase
      .from("categories")
      .select("name, description")
      .eq("user_id", user.id);

    // Calculate week dates (Sunday to Saturday)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - dayOfWeek);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const weekStartStr = weekStart.toISOString().split("T")[0];
    const weekEndStr = weekEnd.toISOString().split("T")[0];

    // Build AI prompt
    const prompt = buildPrompt(
      logs as LogEntry[],
      categories as Category[] || [],
      now.toISOString().split("T")[0],
      weekStartStr,
      weekEndStr
    );

    // Call Lovable AI with tool calling
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
                      "A comprehensive summary paragraph of the week's activities (3-5 sentences)",
                  },
                  insights: {
                    type: "string",
                    description:
                      "Detailed insights as formatted text with bullet points and bold headers using ** markdown. Include all relevant observations.",
                  },
                  recommendations: {
                    type: "string",
                    description:
                      "Actionable recommendations as formatted text with bullet points and bold headers using ** markdown (3-5 items)",
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
      console.error("AI gateway error:", aiResponse.status, errorText);

      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add funds to your workspace." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall || toolCall.function.name !== "submit_weekly_analysis") {
      console.error("Unexpected AI response:", aiData);
      return new Response(JSON.stringify({ error: "Invalid AI response format" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const analysis: AnalysisResult = JSON.parse(toolCall.function.arguments);

    // Save new categories
    if (analysis.new_categories && analysis.new_categories.length > 0) {
      for (const cat of analysis.new_categories) {
        await supabase
          .from("categories")
          .upsert(
            { user_id: user.id, name: cat.name, description: cat.description },
            { onConflict: "user_id,name" }
          );
      }
    }

    // Upsert weekly insight
    const { error: upsertError } = await supabase.from("weekly_insights").upsert(
      {
        user_id: user.id,
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
      console.error("Error saving insight:", upsertError);
      return new Response(JSON.stringify({ error: "Failed to save insight" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
  logs: LogEntry[],
  categories: Category[],
  currentDate: string,
  weekStart: string,
  weekEnd: string
): string {
  const logsJson = JSON.stringify(
    logs.map((l) => ({
      title: l.title,
      comment: l.comment,
      start_time: l.start_time,
      duration: l.duration,
    })),
    null,
    2
  );

  const categoriesJson =
    categories.length > 0
      ? JSON.stringify(categories, null, 2)
      : "No categories yet - create appropriate ones based on the activities.";

  return `You are analyzing time tracking data to provide weekly insights for a user.

TODAY'S DATE: ${currentDate}
WEEK BEING ANALYZED: ${weekStart} (Sunday) to ${weekEnd} (Saturday)

EXISTING CATEGORIES (use these when possible, only create new ones if truly needed):
${categoriesJson}

ACTIVITY LOGS (most recent 500 entries, includes historical data for comparison):
Format: { title: string, comment: string | null, start_time: ISO string, duration: number (seconds) }
${logsJson}

---

YOUR TASK: Provide a comprehensive weekly analysis with 3 text sections and 2-3 visualizations.

---

## 1. SUMMARY
Write a comprehensive paragraph (3-5 sentences) summarizing the week's activities.

Example output:
"This week you logged 42 hours of tracked time across 8 different activities. Work-related tasks dominated your schedule, accounting for 60% of your time, with a notable increase in 'Deep Work' sessions compared to last week. You maintained a healthy balance with regular exercise sessions and adequate rest periods. The weekend showed a shift toward entertainment and social activities, which is consistent with your typical patterns."

Include in your summary:
- Total tracked time and activity count
- Dominant categories and their proportion
- Notable shifts or patterns
- Overall assessment of the week
- Any other relevant observations you find interesting

---

## 2. INSIGHTS
Provide detailed insights as formatted text with bullet points. Use **bold** for headers. Be thorough and add any interesting observations.

Example output:
"**Most Time Spent Categories:**
- Work: 25.2 hours (60%) - Up 15% from last week
- Self-improvement: 8.5 hours (20%) - Consistent with average
- Entertainment: 5.3 hours (13%) - Down 30% from last week
- Rest: 3 hours (7%) - Below your typical 10%

**Unusual Activity Patterns:**
- You had a 4-hour 'Deep Work' session on Tuesday - your longest uninterrupted work block this month
- No gym sessions logged on Wednesday, breaking your 6-week streak
- Late-night coding session on Thursday (11 PM - 2 AM) - first time in 3 weeks

**Changes from Past Patterns:**
- Work hours increased by 5 hours compared to your 4-week average
- Reading time dropped significantly - only 30 minutes vs your usual 3 hours
- More fragmented work sessions (average 45 min vs your usual 1.5 hours)

**Other Observations:**
- Your most productive day was Tuesday with 9 hours of focused work
- Weekend activities were well-balanced between rest and entertainment
- Morning sessions (before 10 AM) were 40% more productive than afternoon ones
- You're showing signs of increased context-switching this week"

You must include these categories but add more if you find interesting patterns:
- Most time spent categories (with hours and percentages)
- Unusual activity patterns
- Changes from past patterns  
- Other observations (productivity patterns, time-of-day analysis, streaks, etc.)

---

## 3. RECOMMENDATIONS
Provide actionable recommendations based on your analysis (3-5 items). Use **bold** for emphasis.

Example output:
"**Recommendations:**

1. **Protect your deep work time** - Your Tuesday 4-hour session was highly productive. Consider blocking similar time slots on other days to maintain focus.

2. **Resume your gym routine** - You broke a 6-week streak. Getting back on track tomorrow will be easier than waiting until next week.

3. **Address the reading decline** - You went from 3 hours to 30 minutes. Even 15 minutes before bed could help rebuild this habit.

4. **Watch your sleep schedule** - The late-night coding session may have impacted your Thursday productivity. Try to maintain consistent sleep hours.

5. **Reduce context-switching** - Your work sessions are more fragmented than usual. Consider using time-blocking or the Pomodoro technique to maintain longer focus periods."

Base recommendations on:
- Broken streaks or habits
- Productivity improvements
- Work-life balance
- Time management optimizations
- Any patterns that could be improved

---

## 4. GRAPHS
Create 2-3 visualizations. All values must be in MINUTES.

Required charts:
1. PIE chart showing time distribution by category for the analyzed week
2. BAR or LINE chart showing daily totals or category comparison
3. (Optional) Additional chart revealing an interesting pattern

Chart data format:
- PIE/BAR: { name: "Category Name", value: 120 } (value in minutes)
- LINE: { name: "Day", value: 480, date: "2026-01-27" } (date in YYYY-MM-DD)

---

Call the submit_weekly_analysis function with your complete analysis.`;
}
