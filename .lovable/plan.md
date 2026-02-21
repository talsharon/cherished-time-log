

## Fix: Push Notifications Not Firing

### Root Cause

The `send-push-notification` edge function has **never executed** -- zero logs ever recorded. This is because:

1. The function is NOT listed in `supabase/config.toml` with `verify_jwt = false`
2. Supabase's default behavior (`verify_jwt = true`) rejects the incoming request at the infrastructure level, **before the function code runs**
3. The `generate-insights` function calls `send-push-notification` with a service role key, but the JWT verification at the gateway level blocks it
4. The error is silently caught in the `try/catch` block (lines 276-291 of generate-insights), so insights save successfully but notifications never send

### Fix

Add both edge functions to `supabase/config.toml` with `verify_jwt = false`. Both functions already implement their own authorization checks in code:

- `generate-insights`: checks for auth header and validates user token or service role key
- `send-push-notification`: checks that auth header matches the service role key exactly

### Files to Modify

| File | Change |
|------|--------|
| `supabase/config.toml` | Add `verify_jwt = false` for both `generate-insights` and `send-push-notification` |

### Technical Details

**`supabase/config.toml`** -- add:

```toml
[functions.generate-insights]
verify_jwt = false

[functions.send-push-notification]
verify_jwt = false
```

After this change, both functions will be redeployed automatically. The push notification flow will then work:

1. `generate-insights` saves the insight
2. Calls `send-push-notification` with the service role key
3. The request reaches the function code (no longer blocked by gateway)
4. The function validates the service role key, fetches the user's push subscription, encrypts the payload, and sends it to Apple's push service

No code changes needed -- only the config file update.

