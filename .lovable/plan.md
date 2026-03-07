

## הרצת ניסוי חד פעמי של generate-insights

נריץ את אותה בקשת `net.http_post` שעבדה קודם, ונבדוק את הלוגים המפורטים החדשים (Steps 1-5) ואת התגובה ב-`net._http_response`.

### שלבים

1. **שליחת בקשה** — `net.http_post` עם headers מה-Vault (Authorization + apikey)
2. **המתנה ~45 שניות** לעיבוד AI
3. **בדיקת תוצאות** — לוגי Edge Function + סטטוס ב-`net._http_response` + בדיקה שנשמר רשומה ב-`weekly_insights`

