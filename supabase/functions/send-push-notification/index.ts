import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SignJWT, importJWK } from "npm:jose@6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Base64url helpers ───────────────────────────────────────────────────────

function base64urlToBytes(b64: string): Uint8Array {
  const padded = b64.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(padded);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function bytesToBase64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

// ─── VAPID JWT ───────────────────────────────────────────────────────────────

async function buildVapidJWT(
  endpoint: string,
  privateKeyBase64: string,
  publicKeyBase64: string,
  subject: string
): Promise<string> {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;

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


// ─── RFC 8291 Web Push Encryption ───────────────────────────────────────────

async function encryptPayload(
  payload: string,
  subscriptionKeys: { p256dh: string; auth: string }
): Promise<{
  ciphertext: Uint8Array;
  salt: Uint8Array;
  serverPublicKey: Uint8Array;
}> {
  const plaintext = new TextEncoder().encode(payload);

  // Receiver public key
  const receiverPublicKeyBytes = base64urlToBytes(subscriptionKeys.p256dh);
  const receiverPublicKey = await crypto.subtle.importKey(
    "raw",
    receiverPublicKeyBytes,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // Auth secret
  const authSecret = base64urlToBytes(subscriptionKeys.auth);

  // Generate ephemeral key pair
  const ephemeralKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"]
  );

  // Export ephemeral public key
  const serverPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", ephemeralKeyPair.publicKey)
  );

  // Derive shared secret
  const sharedBits = await crypto.subtle.deriveBits(
    { name: "ECDH", public: receiverPublicKey },
    ephemeralKeyPair.privateKey,
    256
  );

  // HKDF extract and expand (RFC 8291)
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // PRK = HMAC-SHA256(auth_secret, shared_secret || "\x00")
  const ikm = new Uint8Array([...new Uint8Array(sharedBits), 0x00]);
  const prkHmacKey = await crypto.subtle.importKey(
    "raw",
    authSecret,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const prk = new Uint8Array(await crypto.subtle.sign("HMAC", prkHmacKey, ikm));

  // key_info = "Content-Encoding: aes128gcm\x00"
  const keyInfoLabel = new TextEncoder().encode(
    "WebPush: info\x00"
  );
  const keyInfo = new Uint8Array([
    ...keyInfoLabel,
    ...receiverPublicKeyBytes,
    ...serverPublicKeyRaw,
    0x01,
  ]);

  const prkCryptoKey = await crypto.subtle.importKey(
    "raw",
    prk,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  // content encryption key
  const contentEncKeyInfo = new Uint8Array([
    ...new TextEncoder().encode("Content-Encoding: aes128gcm\x00"),
    0x01,
  ]);
  const saltHmacKey = await crypto.subtle.importKey(
    "raw",
    salt,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  // Simple approach: use the PRK directly as CEK derivation material with salt
  const cekBits = new Uint8Array(
    await crypto.subtle.sign("HMAC", prkCryptoKey, contentEncKeyInfo)
  ).slice(0, 16);

  const nonceInfo = new Uint8Array([
    ...new TextEncoder().encode("Content-Encoding: nonce\x00"),
    0x01,
  ]);
  const nonceBits = new Uint8Array(
    await crypto.subtle.sign("HMAC", prkCryptoKey, nonceInfo)
  ).slice(0, 12);

  const cek = await crypto.subtle.importKey(
    "raw",
    cekBits,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );

  // Pad and encrypt
  const paddedPayload = new Uint8Array(plaintext.length + 2);
  paddedPayload.set(plaintext);
  // 2-byte delimiter: \x02\x00
  paddedPayload[plaintext.length] = 0x02;

  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonceBits },
      cek,
      paddedPayload
    )
  );

  return { ciphertext, salt, serverPublicKey: serverPublicKeyRaw };
}

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
    const vapidSubject = Deno.env.get("VAPID_SUBJECT")!;

    // Only allow internal calls with service role key
    const authHeader = req.headers.get("Authorization");
    if (authHeader !== `Bearer ${supabaseServiceKey}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { user_id, title, body } = await req.json();

    if (!user_id || !title || !body) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch user's push subscription
    const { data: subs, error: subError } = await adminClient
      .from("push_subscriptions")
      .select("subscription")
      .eq("user_id", user_id)
      .limit(1);

    if (subError || !subs || subs.length === 0) {
      console.log(`No push subscription found for user ${user_id}`);
      return new Response(
        JSON.stringify({ success: false, reason: "no_subscription" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const subscription = subs[0].subscription as {
      endpoint: string;
      keys: { p256dh: string; auth: string };
    };

    const { endpoint, keys } = subscription;

    // Build notification payload
    const notificationPayload = JSON.stringify({ title, body });

    // Build VAPID JWT
    const jwt = await buildVapidJWT(endpoint, vapidPrivateKey, vapidPublicKey, vapidSubject);

    // Encrypt payload
    const { ciphertext, salt, serverPublicKey } = await encryptPayload(
      notificationPayload,
      keys
    );

    // Build encrypted body: salt (16) + rs (4) + keylen (1) + public key (65) + ciphertext
    const rs = 4096;
    const header = new Uint8Array(16 + 4 + 1 + serverPublicKey.length);
    header.set(salt, 0);
    // rs as big-endian uint32
    header[16] = (rs >> 24) & 0xff;
    header[17] = (rs >> 16) & 0xff;
    header[18] = (rs >> 8) & 0xff;
    header[19] = rs & 0xff;
    header[20] = serverPublicKey.length;
    header.set(serverPublicKey, 21);

    const body_bytes = new Uint8Array(header.length + ciphertext.length);
    body_bytes.set(header, 0);
    body_bytes.set(ciphertext, header.length);

    // POST to push service
    const pushResponse = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Encoding": "aes128gcm",
        Authorization: `vapid t=${jwt},k=${vapidPublicKey}`,
        TTL: "86400",
      },
      body: body_bytes,
    });

    if (!pushResponse.ok && pushResponse.status !== 201) {
      const errText = await pushResponse.text();
      console.error(`Push failed (${pushResponse.status}):`, errText);

      // Clean up expired subscriptions
      if (pushResponse.status === 410 || pushResponse.status === 404) {
        await adminClient
          .from("push_subscriptions")
          .delete()
          .eq("user_id", user_id);
        console.log(`Removed expired subscription for user ${user_id}`);
      }

      return new Response(
        JSON.stringify({ success: false, status: pushResponse.status }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Push notification sent to user ${user_id}`);
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("send-push-notification error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
