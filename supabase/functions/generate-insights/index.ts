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

IMPORTANT: Write ALL text responses (summary, insights, recommendations) in HEBREW (עברית).
Category names should remain in ENGLISH for consistency.
Graph titles should be in HEBREW.

TODAY'S DATE: ${currentDate}
WEEK BEING ANALYZED: ${weekStart} (Sunday) to ${weekEnd} (Saturday)

EXISTING CATEGORIES (use these when possible, only create new ones if truly needed):
${categoriesJson}

ACTIVITY LOGS (most recent 500 entries, includes historical data for comparison):
Format: { title: string, comment: string | null, start_time: ISO string, duration: number (seconds) }
${logsJson}

---

YOUR TASK: Provide a comprehensive weekly analysis with 3 text sections and 2-3 visualizations. ALL TEXT MUST BE IN HEBREW.

---

## 1. SUMMARY
Write a comprehensive paragraph in HEBREW (3-5 sentences) summarizing the week's activities.

Example output:
"השבוע רשמת 42 שעות מעקב זמן ב-8 פעילויות שונות. משימות הקשורות לעבודה שלטו בלוח הזמנים שלך, והוות 60% מהזמן שלך, עם עלייה ניכרת בפגישות 'עבודה עמוקה' בהשוואה לשבוע שעבר. שמרת על איזון בריא עם אימונים קבועים וזמני מנוחה מספקים. סוף השבוע הראה מעבר לכיוון בידור ופעילויות חברתיות, מה שעולה בקנה אחד עם הדפוסים הרגילים שלך."

Include in your summary:
- Total tracked time and activity count
- Dominant categories and their proportion
- Notable shifts or patterns
- Overall assessment of the week
- Any other relevant observations you find interesting

---

## 2. INSIGHTS
Provide detailed insights in HEBREW as formatted text with bullet points. Use **bold** for headers. Be thorough and add any interesting observations.

Example output:
"**קטגוריות עם הכי הרבה זמן:**
- Work: 25.2 שעות (60%) - עלייה של 15% מהשבוע שעבר
- Self-improvement: 8.5 שעות (20%) - עקבי עם הממוצע
- Entertainment: 5.3 שעות (13%) - ירידה של 30% מהשבוע שעבר
- Rest: 3 שעות (7%) - מתחת ל-10% הרגיל שלך

**דפוסי פעילות חריגים:**
- היה לך מפגש 'עבודה עמוקה' של 4 שעות ביום שלישי - הבלוק הארוך ביותר שלך החודש
- לא נרשמו אימונים ביום רביעי, מה ששבר רצף של 6 שבועות
- מפגש תכנות לילי ביום חמישי (23:00 - 02:00) - פעם ראשונה ב-3 שבועות

**שינויים מדפוסי העבר:**
- שעות העבודה עלו ב-5 שעות בהשוואה לממוצע של 4 שבועות
- זמן הקריאה ירד משמעותית - רק 30 דקות לעומת 3 שעות הרגילות שלך
- מפגשי עבודה מפוצלים יותר (ממוצע 45 דקות לעומת שעה וחצי הרגילה)

**תצפיות נוספות:**
- היום הפרודוקטיבי ביותר שלך היה יום שלישי עם 9 שעות של עבודה ממוקדת
- פעילויות סוף השבוע היו מאוזנות בין מנוחה לבידור
- מפגשי בוקר (לפני 10:00) היו פרודוקטיביים ב-40% יותר ממפגשי אחר הצהריים
- אתה מראה סימנים של עלייה בהחלפת הקשרים השבוע"

You must include these categories but add more if you find interesting patterns:
- Most time spent categories (with hours and percentages)
- Unusual activity patterns
- Changes from past patterns  
- Other observations (productivity patterns, time-of-day analysis, streaks, etc.)

---

## 3. RECOMMENDATIONS
Provide actionable recommendations in HEBREW based on your analysis (3-5 items). Use **bold** for emphasis.

Example output:
"**המלצות:**

1. **הגן על זמן העבודה העמוקה שלך** - המפגש של 4 שעות ביום שלישי היה פרודוקטיבי מאוד. שקול לחסום חלונות זמן דומים בימים אחרים.

2. **חזור לשגרת האימונים** - שברת רצף של 6 שבועות. לחזור למסלול מחר יהיה קל יותר מאשר לחכות לשבוע הבא.

3. **טפל בירידה בקריאה** - עברת מ-3 שעות ל-30 דקות. אפילו 15 דקות לפני השינה יכולות לעזור לבנות מחדש את ההרגל הזה.

4. **שמור על לוח זמנים קבוע לשינה** - מפגש התכנות הלילי עשוי להשפיע על הפרודוקטיביות שלך ביום חמישי. נסה לשמור על שעות שינה עקביות.

5. **הפחת החלפת הקשרים** - מפגשי העבודה שלך מפוצלים יותר מהרגיל. שקול להשתמש בחסימת זמן או בטכניקת פומודורו לשמירה על תקופות מיקוד ארוכות יותר."

Base recommendations on:
- Broken streaks or habits
- Productivity improvements
- Work-life balance
- Time management optimizations
- Any patterns that could be improved

---

## 4. GRAPHS
Create 2-3 visualizations. All values must be in MINUTES. Graph TITLES should be in HEBREW.

Required charts:
1. PIE chart showing time distribution by category for the analyzed week (title in Hebrew, e.g., "התפלגות זמן לפי קטגוריה")
2. BAR or LINE chart showing daily totals or category comparison (title in Hebrew)
3. (Optional) Additional chart revealing an interesting pattern (title in Hebrew)

Chart data format:
- PIE/BAR: { name: "Category Name", value: 120 } (value in minutes, category names in ENGLISH)
- LINE: { name: "Day", value: 480, date: "2026-01-27" } (date in YYYY-MM-DD)

---

Call the submit_weekly_analysis function with your complete analysis in HEBREW.`;
}
