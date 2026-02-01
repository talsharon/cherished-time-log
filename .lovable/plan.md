

## Weekly AI Insights Feature

### Overview

Add a 3rd "Insights" tab that displays AI-generated weekly time analysis. An edge function will analyze the last 500 logs, categorize activities, compare the past week to historical patterns, and generate visual insights with charts.

### System Architecture

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATA FLOW                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐    ┌──────────────────┐    ┌──────────────────────────┐  │
│  │ Cron Trigger │───▶│ generate-insights│───▶│ Lovable AI (Gemini)      │  │
│  │ Sun 9am IST  │    │ Edge Function    │    │ Analyze + Categorize     │  │
│  └──────────────┘    └────────┬─────────┘    └────────────┬─────────────┘  │
│                               │                           │                 │
│                               ▼                           ▼                 │
│                        ┌─────────────────────────────────────────┐         │
│                        │           Supabase Database             │         │
│                        │  ┌─────────────┐  ┌──────────────────┐  │         │
│                        │  │ categories  │  │  weekly_insights │  │         │
│                        │  └─────────────┘  └──────────────────┘  │         │
│                        └────────────────────────────────────────┘          │
│                                          │                                  │
│                                          ▼                                  │
│                        ┌─────────────────────────────────────┐             │
│                        │        Frontend - Insights Tab      │             │
│                        │  Summary | Insights | Graphs        │             │
│                        └─────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Database Schema

#### 1. `categories` Table
Stores AI-discovered activity categories that persist across analysis runs.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | User reference |
| name | text | Category name (e.g., "Work", "Entertainment") |
| description | text | AI-generated description of category |
| created_at | timestamp | When category was first discovered |

#### 2. `weekly_insights` Table
Stores the AI analysis results for each week.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | User reference |
| week_start | date | Start date of the analyzed week (Sunday) |
| week_end | date | End date of the analyzed week (Saturday) |
| summary | text | AI-generated summary (rich text paragraph) |
| insights | text | AI-generated insights (rich text with bullet points) |
| recommendations | text | AI-generated recommendations (rich text with bullet points) |
| graphs | jsonb | Chart data array (2-3 charts) |
| created_at | timestamp | When insight was generated |

---

### Edge Function: `generate-insights`

The function will:

1. **Fetch Data**
   - Get last 500 logs for the user (title, comment, start_time, duration)
   - Get existing categories from the database

2. **Build AI Prompt with Structured Tool Calling**
   - Send logs and existing categories to Lovable AI
   - Use `tool_choice` to force structured output

3. **Tool Schema with 3 Text Sections + Graphs**

```typescript
{
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
              description: "A comprehensive summary paragraph of the week's activities (3-5 sentences)"
            },
            insights: {
              type: "string", 
              description: "Detailed insights as formatted text with bullet points. Include all relevant observations."
            },
            recommendations: {
              type: "string",
              description: "Actionable recommendations as formatted text with bullet points (3-5 items)"
            },
            new_categories: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  description: { type: "string" }
                },
                required: ["name", "description"]
              },
              description: "New categories discovered that don't exist in the provided list"
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
                        date: { type: "string" }
                      },
                      required: ["name", "value"]
                    }
                  }
                },
                required: ["title", "type", "data"]
              },
              minItems: 2,
              maxItems: 3
            }
          },
          required: ["summary", "insights", "recommendations", "new_categories", "graphs"]
        }
      }
    }
  ],
  tool_choice: { type: "function", function: { name: "submit_weekly_analysis" } }
}
```

---

### AI Prompt Template with Examples

```text
You are analyzing time tracking data to provide weekly insights for a user.

TODAY'S DATE: {current_date}
WEEK BEING ANALYZED: {week_start} (Sunday) to {week_end} (Saturday)

EXISTING CATEGORIES (use these when possible, only create new ones if truly needed):
{categories_json}

ACTIVITY LOGS (most recent 500 entries, includes historical data for comparison):
Format: { title: string, comment: string | null, start_time: ISO string, duration: number (seconds) }
{logs_json}

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
Provide detailed insights as formatted text with bullet points. Be thorough and add any interesting observations.

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
Provide actionable recommendations based on your analysis (3-5 items).

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

Call the submit_weekly_analysis function with your complete analysis.
```

---

### Cron Job Setup

Schedule the edge function to run every Sunday at 9:00 AM Israel Time:
- Use `0 6 * * 0` (6 AM UTC on Sundays) to target ~9 AM Israel time

---

### Frontend Components

#### 1. Update Tab Navigation in `Index.tsx`
Add third "Insights" tab with a Lightbulb icon.

#### 2. New `InsightsTab.tsx` Component
- Fetch all `weekly_insights` for the user, ordered by `week_start` descending
- Display as a list of week cards
- Each card shows:
  - Header: Week date range (e.g., "Jan 26 - Feb 1, 2026")
  - Summary section (rendered as paragraph)
  - Insights section (rendered with markdown-like formatting for bold headers and bullet points)
  - Recommendations section (rendered with markdown-like formatting)
  - 2-3 interactive charts using Recharts

#### 3. New `useWeeklyInsights.ts` Hook
Fetch and manage weekly insights data from Supabase.

#### 4. Chart Rendering
Render charts based on the `type` field:
- `pie` -> Recharts `PieChart`
- `bar` -> Recharts `BarChart`  
- `line` -> Recharts `LineChart`

#### 5. Test Button in `ClockTab.tsx`
Add a small button (sparkles icon) that triggers the edge function immediately. Uses `supabase.functions.invoke('generate-insights')`.

---

### File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| **Database** | | |
| Migration | Create | Add `categories` and `weekly_insights` tables with RLS |
| Cron job | Create | Schedule weekly insights generation |
| **Backend** | | |
| `supabase/functions/generate-insights/index.ts` | Create | Edge function with structured tool calling |
| `supabase/config.toml` | Modify | Add function config |
| **Frontend** | | |
| `src/pages/Index.tsx` | Modify | Add Insights tab to navigation |
| `src/components/InsightsTab.tsx` | Create | Main insights display with text sections and charts |
| `src/hooks/useWeeklyInsights.ts` | Create | Hook to fetch insights data |
| `src/components/ClockTab.tsx` | Modify | Add test button to trigger insights |

---

### Implementation Order

1. Create database migrations (categories + weekly_insights tables with RLS)
2. Create the edge function with structured AI tool calling and detailed prompt
3. Update config.toml for the new function  
4. Set up the cron job for weekly execution
5. Create useWeeklyInsights hook
6. Create InsightsTab component with text rendering and charts
7. Update Index.tsx with new tab
8. Add test button to ClockTab

