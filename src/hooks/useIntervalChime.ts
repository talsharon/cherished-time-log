import { useCallback, useEffect, useRef, useState } from 'react';
import { playChime, unlockAudio } from '@/lib/chime';

const STORAGE_KEY = 'timetracker.chime';

export const CHIME_MIN_MINUTES = 1;
export const CHIME_MAX_MINUTES = 120;
export const CHIME_DEFAULT_MINUTES = 1;

type ChimeSettings = {
  enabled: boolean;
  intervalMinutes: number;
};

const DEFAULT_SETTINGS: ChimeSettings = {
  enabled: false,
  intervalMinutes: CHIME_DEFAULT_MINUTES,
};

export function clampChimeMinutes(value: number): number {
  if (!Number.isFinite(value)) return CHIME_DEFAULT_MINUTES;
  return Math.min(CHIME_MAX_MINUTES, Math.max(CHIME_MIN_MINUTES, Math.round(value)));
}

function readSettings(): ChimeSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<ChimeSettings>;
    return {
      enabled: Boolean(parsed.enabled),
      intervalMinutes: clampChimeMinutes(Number(parsed.intervalMinutes)),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function useIntervalChime() {
  const [settings, setSettings] = useState<ChimeSettings>(readSettings);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const nextFireAtRef = useRef<number | null>(null);

  // Persist settings to localStorage.
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* ignore */
    }
  }, [settings]);

  // Arm / disarm the next fire time when enabled or interval changes.
  useEffect(() => {
    if (!settings.enabled) {
      nextFireAtRef.current = null;
      setSecondsRemaining(0);
      return;
    }
    nextFireAtRef.current = Date.now() + settings.intervalMinutes * 60_000;
    setSecondsRemaining(settings.intervalMinutes * 60);
  }, [settings.enabled, settings.intervalMinutes]);

  // Single 1-second ticker: drives the countdown and fires the chime.
  useEffect(() => {
    if (!settings.enabled) return;
    const id = window.setInterval(() => {
      const next = nextFireAtRef.current;
      if (next == null) return;
      const now = Date.now();
      if (now >= next) {
        playChime();
        nextFireAtRef.current = Date.now() + settings.intervalMinutes * 60_000;
        setSecondsRemaining(settings.intervalMinutes * 60);
      } else {
        setSecondsRemaining(Math.max(0, Math.round((next - now) / 1000)));
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [settings.enabled, settings.intervalMinutes]);

  const setEnabled = useCallback((enabled: boolean) => {
    if (enabled) {
      // Turning on happens from a user gesture — unlock audio and confirm audibly.
      void unlockAudio().then(() => playChime());
    }
    setSettings((prev) => ({ ...prev, enabled }));
  }, []);

  const setIntervalMinutes = useCallback((minutes: number) => {
    setSettings((prev) => ({ ...prev, intervalMinutes: clampChimeMinutes(minutes) }));
  }, []);

  const test = useCallback(() => {
    void unlockAudio().then(() => playChime());
  }, []);

  return {
    enabled: settings.enabled,
    intervalMinutes: settings.intervalMinutes,
    secondsRemaining,
    setEnabled,
    setIntervalMinutes,
    playChime: test,
  };
}
