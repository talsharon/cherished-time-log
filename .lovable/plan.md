

## Fix: Push Notification `InvalidEncoding` Error

### Problem

The `send-push-notification` function is now being called (the config fix worked), but it crashes at `buildVapidJWT` with:

```
Error: InvalidEncoding
    at async SubtleCrypto.sign
    at async buildVapidJWT
```

The hand-crafted `toPkcs8()` function that wraps the raw 32-byte VAPID private key into PKCS8 DER format has incorrect byte lengths in its ASN.1 header. Deno's `crypto.subtle.importKey("pkcs8", ...)` rejects it.

### Fix

Replace the fragile raw-to-PKCS8 conversion with **JWK import**, which is natively supported by Web Crypto and doesn't require manual DER encoding. The VAPID private key (base64url-encoded 32 bytes) maps directly to the `d` parameter of a JWK, and the public key maps to `x` and `y`.

### Changes

| File | Change |
|------|--------|
| `supabase/functions/send-push-notification/index.ts` | Replace `toPkcs8()` and raw PKCS8 import with JWK-based key import; derive `x`/`y` from the VAPID public key |

### Technical Details

**Remove** the `toPkcs8()` function entirely.

**Replace** the key import in `buildVapidJWT()` with:

```typescript
async function buildVapidJWT(
  endpoint: string,
  privateKeyBase64: string,
  publicKeyBase64: string,
  subject: string
): Promise<string> {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;

  const header = { typ: "JWT", alg: "ES256" };
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: subject,
  };

  const headerB64 = bytesToBase64url(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = bytesToBase64url(new TextEncoder().encode(JSON.stringify(payload)));
  const signingInput = `${headerB64}.${payloadB64}`;

  // Import private key via JWK (reliable, no manual DER encoding)
  const privateKeyBytes = base64urlToBytes(privateKeyBase64);
  const publicKeyBytes = base64urlToBytes(publicKeyBase64);

  // P-256 uncompressed public key: 0x04 || x (32 bytes) || y (32 bytes)
  const x = bytesToBase64url(publicKeyBytes.slice(1, 33));
  const y = bytesToBase64url(publicKeyBytes.slice(33, 65));
  const d = bytesToBase64url(privateKeyBytes);

  const jwk = { kty: "EC", crv: "P-256", x, y, d };

  const cryptoKey = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  return `${signingInput}.${bytesToBase64url(new Uint8Array(signature))}`;
}
```

**Update the call site** to pass the public key as well:

```typescript
const jwt = await buildVapidJWT(endpoint, vapidPrivateKey, vapidPublicKey, vapidSubject);
```

**Delete** the `toPkcs8()` function (no longer needed).

This approach is standard, works reliably in Deno's Web Crypto, and avoids any manual ASN.1/DER encoding.

