

## Hebrew Language Support for AI Insights

### Overview

Update the AI prompt in the `generate-insights` edge function to instruct the model to return all text responses (summary, insights, recommendations) in Hebrew, while keeping category names in English.

### Changes Required

#### File: `supabase/functions/generate-insights/index.ts`

**1. Add Language Instruction to Prompt**

Add a clear language directive at the beginning of the prompt and update the example outputs to be in Hebrew.

```text
IMPORTANT: Write ALL text responses (summary, insights, recommendations) in HEBREW (עברית).
Category names should remain in ENGLISH for consistency.
Graph titles should be in HEBREW.
```

**2. Update Example Outputs**

Change the example outputs in each section to Hebrew equivalents:

**Summary Example (Hebrew):**
```text
"השבוע רשמת 42 שעות מעקב זמן ב-8 פעילויות שונות. משימות הקשורות לעבודה שלטו בלוח הזמנים שלך, והוות 60% מהזמן שלך, עם עלייה ניכרת בפגישות 'עבודה עמוקה' בהשוואה לשבוע שעבר. שמרת על איזון בריא עם אימונים קבועים וזמני מנוחה מספקים. סוף השבוע הראה מעבר לכיוון בידור ופעילויות חברתיות, מה שעולה בקנה אחד עם הדפוסים הרגילים שלך."
```

**Insights Example (Hebrew):**
```text
"**קטגוריות עם הכי הרבה זמן:**
- Work: 25.2 שעות (60%) - עלייה של 15% מהשבוע שעבר
- Self-improvement: 8.5 שעות (20%) - עקבי עם הממוצע
- Entertainment: 5.3 שעות (13%) - ירידה של 30% מהשבוע שעבר

**דפוסי פעילות חריגים:**
- היה לך מפגש 'עבודה עמוקה' של 4 שעות ביום שלישי - הבלוק הארוך ביותר שלך החודש
- לא נרשמו אימונים ביום רביעי, מה ששבר רצף של 6 שבועות

**שינויים מדפוסי העבר:**
- שעות העבודה עלו ב-5 שעות בהשוואה לממוצע של 4 שבועות
- זמן הקריאה ירד משמעותית - רק 30 דקות לעומת 3 שעות הרגילות שלך"
```

**Recommendations Example (Hebrew):**
```text
"**המלצות:**

1. **הגן על זמן העבודה העמוקה שלך** - המפגש של 4 שעות ביום שלישי היה פרודוקטיבי מאוד. שקול לחסום חלונות זמן דומים בימים אחרים.

2. **חזור לשגרת האימונים** - שברת רצף של 6 שבועות. לחזור למסלול מחר יהיה קל יותר מאשר לחכות לשבוע הבא.

3. **טפל בירידה בקריאה** - עברת מ-3 שעות ל-30 דקות. אפילו 15 דקות לפני השינה יכולות לעזור לבנות מחדש את ההרגל הזה."
```

**3. Update Tool Schema Descriptions**

Update the tool parameter descriptions to specify Hebrew output:

```typescript
summary: {
  type: "string",
  description: "A comprehensive summary paragraph in HEBREW of the week's activities (3-5 sentences)"
},
insights: {
  type: "string",
  description: "Detailed insights in HEBREW as formatted text with bullet points and bold headers using ** markdown"
},
recommendations: {
  type: "string",
  description: "Actionable recommendations in HEBREW as formatted text with bullet points and bold headers"
}
```

### Summary of Changes

| Location | Change |
|----------|--------|
| Prompt header | Add language instruction (Hebrew for text, English for categories) |
| Summary example | Replace with Hebrew example |
| Insights example | Replace with Hebrew example (category names stay English) |
| Recommendations example | Replace with Hebrew example |
| Tool schema descriptions | Add "in HEBREW" to summary, insights, recommendations descriptions |

### Files Modified

| File | Action |
|------|--------|
| `supabase/functions/generate-insights/index.ts` | Modify `buildPrompt()` function and tool schema |

