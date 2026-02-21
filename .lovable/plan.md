

## Fix: Invalid VAPID_SUBJECT Format

### Problem

The `VAPID_SUBJECT` secret is set to `mailto: <talsharonts@gmail.com>` (with a space and angle brackets). Apple's push service requires the `sub` claim to be a strictly formatted `mailto:` URI with no extra characters. This is why it returns `403 BadJwtToken`.

### Solution

Two changes to guarantee this works:

1. **Update the `VAPID_SUBJECT` secret** to the correct value: `mailto:talsharonts@gmail.com`
2. **Add a sanitization step** in the edge function so even if the secret has extra whitespace or brackets, it gets cleaned up automatically.

### Changes

| File | Change |
|------|--------|
| Secret: `VAPID_SUBJECT` | Update value to `mailto:talsharonts@gmail.com` |
| `supabase/functions/send-push-notification/index.ts` | Add `vapidSubject` sanitization (strip spaces and angle brackets) as a safety net; remove debug logging |

### Technical Details

**Edge function sanitization (safety net):**

```typescript
// Clean up VAPID_SUBJECT in case it has extra whitespace or angle brackets
let vapidSubject = Deno.env.get("VAPID_SUBJECT")!;
vapidSubject = vapidSubject.replace(/[<>]/g, "").replace(/\s+/g, "");
```

This ensures that even if the secret is stored as `mailto: <email>`, the JWT will contain the correct `mailto:email` format.

