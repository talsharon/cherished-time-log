import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const VAPID_PUBLIC_KEY =
  "BApU5xo2mMuYFAqTWGNbE5hHBwCY_ON0V4pujGuWD4FSoNWGa1qjxKqSx3vOAxnbKPzyXsUIVEW4prO_YgMJc_M";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = window.atob(base64);
  const arr = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    arr[i] = rawData.charCodeAt(i);
  }
  return arr;
}

export function usePushNotifications() {
  const [permission, setPermission] =
    useState<NotificationPermission>("default");
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    const supported =
      "Notification" in window &&
      "serviceWorker" in navigator &&
      "PushManager" in window;
    setIsSupported(supported);
    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  const saveSubscription = useCallback(async () => {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subJson = subscription.toJSON() as any;
    await supabase.from("push_subscriptions").upsert(
      { user_id: user.id, subscription: subJson },
      { onConflict: "user_id" }
    );
  }, []);

  // Auto-renew subscription if permission was already granted
  useEffect(() => {
    if (isSupported && Notification.permission === "granted") {
      saveSubscription().catch(console.error);
    }
  }, [isSupported, saveSubscription]);

  const subscribe = useCallback(async () => {
    if (!isSupported) return;
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === "granted") {
      await saveSubscription();
    }
  }, [isSupported, saveSubscription]);

  return { permission, isSupported, subscribe };
}
