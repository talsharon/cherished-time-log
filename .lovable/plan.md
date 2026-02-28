

## Investigation Results

The cron job **did run** today at 06:30 UTC — but it got a **401 Unauthorized** response.

**Root cause:** The HTTP request to the edge function is missing the `apikey` header. The gateway requires this header even when `verify_jwt = false`.

**Current cron command sends:**
```
headers: { "Content-Type", "Authorization": "Bearer <service_role_key>" }
```

**Missing:** `"apikey"` header (required by the gateway).

---

## Fix

Update the cron job to include the `apikey` header. The vault has `service_role_key` but no `anon_key`, so we'll use the service role key for both (which works since it has higher privileges).

**SQL to run (drop and recreate the cron job):**

```sql
SELECT cron.unschedule('weekly-insights-saturday');

SELECT cron.schedule(
  'weekly-insights-saturday',
  '30 6 * * 6',
  $$
  SELECT net.http_post(
    url := 'https://zpjltjjqzkqwpufxceqq.supabase.co/functions/v1/generate-insights',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key'),
      'apikey', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{"system_call": true}'::jsonb,
    timeout_milliseconds := 120000
  ) AS request_id;
  $$
);
```

This adds the `apikey` header using the service role key from vault, which the gateway needs to route the request.

