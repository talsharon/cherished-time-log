

## אבחון ותיקון - אינסייטים שבועיים לא נשמרים

### מה גיליתי

הקרון רץ היום (שבת, 07:30 בבוקר) והחזיר **200 OK** עם `processed_users: 1`. אבל **לא נשמר אינסייט** לשבוע 28/2 - 6/3. זה אומר שהפונקציה `processUserInsights` נכשלה בשקט — כנראה שהקריאה ל-AI gateway עשתה timeout או החזירה שגיאה, אבל השגיאה נבלעה ב-`console.error` בלי להשפיע על הסטטוס.

### הבעיה

הפונקציה מחזירה `200 OK` גם כשהעיבוד נכשל, כי כל השגיאות ב-`processUserInsights` נתפסות ורק מתועדות. אין דרך לדעת מה בדיוק נכשל.

### תוכנית תיקון

1. **הוסיף לוגים מפורטים** ל-`processUserInsights` — לוג לפני ואחרי כל שלב קריטי (שליפת לוגים, קריאת AI, שמירה)
2. **החזרת סטטוס מ-processUserInsights** — הפונקציה תחזיר `true`/`false` כדי שה-handler ידע אם הצליח, ויוכל לדווח `processed` vs `failed` בתשובה
3. **הוספת timeout מפורש** לקריאת AI gateway (60 שניות) עם `AbortController`, כדי שה-Edge Function לא ייתקע עד ש-Supabase יהרוג אותו
4. **הרצת ניסוי מחדש** אחרי הפריסה כדי לוודא שזה עובד ולראות את הלוגים

### שינויים טכניים

**קובץ: `supabase/functions/generate-insights/index.ts`**

- `processUserInsights` יחזיר `boolean` במקום `void`
- הוספת `AbortController` עם timeout של 60 שניות לקריאת AI
- לוגים מפורטים: `"Fetching logs..."`, `"Calling AI gateway..."`, `"AI responded, saving..."`, `"Upsert complete"`
- ה-handler ידווח `{ success, processed, failed }` בתשובה

