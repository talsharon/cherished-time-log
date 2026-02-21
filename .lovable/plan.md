

## Debug: VAPID JWT Rejection by Apple Push Service

### Problem

The `jose`-based JWT is being generated successfully but Apple's push service still returns `403 BadJwtToken`. Since the JWT library itself is well-tested, the issue is likely in one of:

1. **Mismatched key pair** -- the VAPID_PRIVATE_KEY and VAPID_PUBLIC_KEY secrets may not be a matching P-256 key pair
2. **Invalid `sub` claim** -- VAPID_SUBJECT must be a valid `mailto:` or `https:` URI
3. **Key format issue** -- the raw bytes derived from the env vars may not produce correct JWK `x`/`y`/`d` parameters
4. **`k=` parameter mismatch** -- the public key in the Authorization header must exactly match the key that signed the JWT

### Plan

Add comprehensive diagnostic logging to `send-push-notification` so the next test reveals the exact cause. The logs will show:

- The `aud` and `sub` claims being used
- Whether the public key starts with `0x04` (uncompressed point prefix)
- Whether the private key is 32 bytes (correct for P-256)
- The first few characters of the `k=` parameter vs the frontend key
- The decoded JWT header and payload (non-sensitive parts)

### Changes

| File | Change |
|------|--------|
| `supabase/functions/send-push-notification/index.ts` | Add debug logging before the push fetch call |

### Technical Details

**File: `supabase/functions/send-push-notification/index.ts`**

Add logging after JWT generation (around line 245) and before the push fetch (line 270):

```typescript
// After building JWT
const jwt = await buildVapidJWT(endpoint, vapidPrivateKey, vapidPublicKey, vapidSubject);

// Debug logging
const pubKeyBytes = base64urlToBytes(vapidPublicKey);
const privKeyBytes = base64urlToBytes(vapidPrivateKey);
console.log("VAPID Debug:", JSON.stringify({
  endpoint_origin: new URL(endpoint).origin,
  subject: vapidSubject,
  pub_key_length: pubKeyBytes.length,
  pub_key_first_byte: pubKeyBytes[0],
  priv_key_length: privKeyBytes.length,
  k_param_preview: vapidPublicKey.substring(0, 10),
  frontend_key_preview: "BApU5xo2mM",
  jwt_parts: jwt.split(".").length,
}));

// Decode JWT payload to verify claims
try {
  const payloadPart = jwt.split(".")[1];
  const decoded = JSON.parse(atob(payloadPart.replace(/-/g, "+").replace(/_/g, "/")));
  console.log("JWT claims:", JSON.stringify(decoded));
} catch (e) {
  console.error("Failed to decode JWT:", e);
}
```

This will reveal:
- If `pub_key_length` is not 65 or `pub_key_first_byte` is not 4: the public key format is wrong
- If `priv_key_length` is not 32: the private key format is wrong
- If `k_param_preview` does not match `frontend_key_preview`: the keys are mismatched
- If `subject` is not a `mailto:` or `https:` URL: Apple will reject the JWT
- The actual JWT claims so we can verify `aud` and `exp` are correct

After running one test with this logging, we'll have the information needed to apply the correct fix.

