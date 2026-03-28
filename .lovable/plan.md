

## Problem
הטקסט בטאב Insights מיושר שמאלה (LTR), אבל מכיוון שהתוכן בעברית הוא צריך להיות מיושר ימינה (RTL).

## High-level solution
הוספת `dir="rtl"` ו-`text-right` לקומפוננטות הטקסט ב-`InsightCard` וב-`EmptyInsights`. הגרפים יישארו LTR כי זה סטנדרטי לגרפים.

## Rationale
שינוי פרונטאלי בלבד, ממוקד בקומפוננטה אחת. לא צריך שינוי מערכתי כי רק טאב אחד מכיל תוכן בעברית.

### Layout change

```text
BEFORE:                          AFTER:
┌──────────────────┐             ┌──────────────────┐
│ Mar 1 - Mar 7    │             │    Mar 1 - Mar 7 │
│ Summary          │             │           סיכום  │
│ Text aligned left│             │יישור טקסט ימינה  │
│ Insights         │             │         תובנות   │
│ - bullet left    │             │   נקודה ימינה -  │
└──────────────────┘             └──────────────────┘
```

### שינויים טכניים (Frontend)

**קובץ: `src/components/InsightsTab.tsx`**

1. **`InsightCard`** — הוספת `dir="rtl"` ל-`CardContent` כדי שכל הטקסט ייושר ימינה אוטומטית
2. **`renderMarkdown`** — הוספת `text-right` לכל אלמנט טקסט (`p`, `li`)
3. **`EmptyInsights`** — הוספת `dir="rtl"` לקונטיינר הטקסט
4. **כותרות משנה** (Summary, Insights, Recommendations) — הוספת `text-right`

### Post-change
שינוי פרונטאלי בלבד — לא צריך `npx cap sync` או publish. השינוי ייראה מיד בפריוויו.

