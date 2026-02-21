

## Fix: Replace Hand-Rolled Encryption with `web-push` Library

### Problem

The VAPID signing now works (push service returns 201), but the browser silently drops the notification because the RFC 8291 payload encryption is incorrectly implemented. The hand-rolled HKDF key derivation has several bugs:

- Incorrect IKM construction (appends `0x00` byte to shared secret)
- Missing two-stage HKDF (should extract with auth secret, then with random salt)
- Wrong info strings for CEK and nonce derivation

### Solution

Replace the entire hand-rolled encryption AND push delivery logic with the `web-push` npm package, which correctly implements RFC 8291, RFC 8188, and VAPID. This eliminates ~150 lines of error-prone crypto code.

### Changes

| File | Change |
|------|--------|
| `supabase/functions/send-push-notification/index.ts` | Replace hand-rolled crypto with `npm:web-push` library |

### Technical Details

**File: `supabase/functions/send-push-notification/index.ts`**

The entire file will be simplified to roughly:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3";

// CORS headers (unchanged)

serve(async (req) => {
  // OPTIONS handler (unchanged)
  // Auth check (unchanged)
  // Parse request body (unchanged)
  // Fetch subscription from DB (unchanged)

  // NEW: Use web-push library for delivery
  webpush.setVapidDetails(
    vapidSubject,
    vapidPublicKey,
    vapidPrivateKey
  );

  const payload = JSON.stringify({ title, body });

  await webpush.sendNotification(subscription, payload);

  // Return success (unchanged)
});
```

This removes:
- `buildVapidJWT()` function (~25 lines)
- `encryptPayload()` function (~110 lines)
- `base64urlToBytes()` and `bytesToBase64url()` helpers (~12 lines)
- Manual aes128gcm header construction (~15 lines)
- The `jose` import (web-push handles JWT internally)

The `web-push` library is the standard Node.js/Deno library for Web Push (~4M downloads/week) and correctly handles all the cryptographic details.

