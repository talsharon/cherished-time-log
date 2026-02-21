

## Fix: VAPID JWT `BadJwtToken` Error

### Problem

The push service returns `403 BadJwtToken`, meaning the hand-rolled VAPID JWT signature is malformed. The manual ECDSA signing + base64url encoding has a subtle encoding bug that's hard to pinpoint.

### Solution

Replace the manual JWT construction with the `jose` library (works natively in Deno via `npm:jose`). This is a widely-used, well-tested library that handles ES256 JWT creation correctly across all runtimes including Deno.

### Changes

| File | Change |
|------|--------|
| `supabase/functions/send-push-notification/index.ts` | Replace manual `buildVapidJWT` with `jose`-based implementation |

### Technical Details

**File: `supabase/functions/send-push-notification/index.ts`**

1. Add import: `import { SignJWT, importJWK } from "npm:jose@6"` (Deno npm specifier)

2. Replace `buildVapidJWT()` with:

```typescript
async function buildVapidJWT(
  endpoint: string,
  privateKeyBase64: string,
  publicKeyBase64: string,
  subject: string
): Promise<string> {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;

  // Derive JWK parameters from raw keys
  const privateKeyBytes = base64urlToBytes(privateKeyBase64);
  const publicKeyBytes = base64urlToBytes(publicKeyBase64);

  const x = bytesToBase64url(publicKeyBytes.slice(1, 33));
  const y = bytesToBase64url(publicKeyBytes.slice(33, 65));
  const d = bytesToBase64url(privateKeyBytes);

  const jwk = { kty: "EC", crv: "P-256", x, y, d };
  const key = await importJWK(jwk, "ES256");

  return new SignJWT({ aud: audience, sub: subject })
    .setProtectedHeader({ typ: "JWT", alg: "ES256" })
    .setExpirationTime("12h")
    .sign(key);
}
```

This eliminates all manual base64url JWT encoding and ECDSA signature handling, delegating it to a proven library. The `jose` library is the most popular JS/TS JWT library (~100M downloads/week) and handles all edge cases correctly.

No other files need to change. The function will be redeployed automatically.

