
-- Store the service role key in vault for cron job use
SELECT vault.create_secret(
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpwamx0ampxemtxd3B1ZnhjZXFxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTg3NDcxMywiZXhwIjoyMDg1NDUwNzEzfQ.wuFrkHVnKjp5kA3yfkwEnlAhSk7MOzZkVpFpvJf63Z4',
  'service_role_key',
  'Service role key for cron jobs'
) WHERE NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'service_role_key');
