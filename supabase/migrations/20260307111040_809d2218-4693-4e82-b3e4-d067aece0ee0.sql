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