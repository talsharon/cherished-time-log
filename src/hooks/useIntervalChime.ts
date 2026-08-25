import { useCallback, useSyncExternalStore } from 'react';
import { playChime, unlockAudio } from '@/lib/chime';

const STORAGE_KEY = 'timetracker.chime';

export const CHIME_MIN_MINUTES = 1;
export const CHIME_MAX_MINUTES = 120;
export const CHIME_DEFAULT_MINUTES = 1;

type ChimeSettings = {
  enabled: boolean;
  intervalMinutes: number;
};

type ChimeState = ChimeSettings & { secondsRemaining: number };

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

/* ---------------------------------------------------------------------------
 * Module-level singleton store: one source of truth + one ticker for the whole
 * app, so every component that uses the hook stays perfectly in sync.
 * ------------------------------------------------------------------------ */

const initialSettings = readSettings();

let state: ChimeState = {
  ...initialSettings,
  secondsRemaining: 0,
};

const listeners = new Set<() => void>();
let nextFireAt: number | null = null;
let tickerId: number | null = null;

function emit() {
  listeners.forEach((l) => l());
}

function setState(patch: Partial<ChimeState>) {
  state = { ...state, ...patch };
  emit();
}

function persist() {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ enabled: state.enabled, intervalMinutes: state.intervalMinutes })
    );
  } catch {
    /* ignore */
  }
}

function stopTicker() {
  if (tickerId != null) {
    window.clearInterval(tickerId);
    tickerId = null;
  }
}

function tick() {
  if (nextFireAt == null) return;
  const now = Date.now();
  if (now >= nextFireAt) {
    playChime();
    nextFireAt = now + state.intervalMinutes * 60_000;
    setState({ secondsRemaining: state.intervalMinutes * 60 });
  } else {
    setState({ secondsRemaining: Math.max(0, Math.round((nextFireAt - now) / 1000)) });
  }
}

/** Arms or disarms the single shared ticker based on the current settings. */
function sync() {
  if (typeof window === 'undefined') return;

  if (!state.enabled) {
    nextFireAt = null;
    stopTicker();
    setState({ secondsRemaining: 0 });
    return;
  }

  nextFireAt = Date.now() + state.intervalMinutes * 60_000;
  setState({ secondsRemaining: state.intervalMinutes * 60 });

  stopTicker();
  tickerId = window.setInterval(tick, 1000);
}

// Arm on module load if the persisted settings say the chime is active.
sync();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): ChimeState {
  return state;
}

function setEnabledInternal(enabled: boolean) {
  if (state.enabled === enabled) return;
  if (enabled) {
    // Turning on happens from a user gesture — unlock audio and confirm audibly.
    void unlockAudio().then(() => playChime());
  }
  state = { ...state, enabled };
  persist();
  sync();
}

function setIntervalMinutesInternal(minutes: number) {
  const next = clampChimeMinutes(minutes);
  if (state.intervalMinutes === next) return;
  state = { ...state, intervalMinutes: next };
  persist();
  sync();
}

export function useIntervalChime() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const setEnabled = useCallback((enabled: boolean) => setEnabledInternal(enabled), []);
  const setIntervalMinutes = useCallback((minutes: number) => setIntervalMinutesInternal(minutes), []);
  const test = useCallback(() => {
    void unlockAudio().then(() => playChime());
  }, []);

  return {
    enabled: snapshot.enabled,
    intervalMinutes: snapshot.intervalMinutes,
    secondsRemaining: snapshot.secondsRemaining,
    setEnabled,
    setIntervalMinutes,
    playChime: test,
  };
}
