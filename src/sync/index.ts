import NetInfo from '@react-native-community/netinfo';
import { useEffect, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { getDb } from '@/db/database';
import { onTablesChanged } from '@/db/events';
import { supabase } from '@/lib/supabase';

import { syncAll } from './engine';
import { supabaseRemote } from './supabaseRemote';

// When to sync: on sign-in/app start, when the app returns to the foreground, a few seconds after
// local edits, when the connection comes back, and once a minute while the app is open.
// The UI never waits for it (except the very first pull after signing in on a new device).

export type SyncStatus = {
  state: 'idle' | 'syncing' | 'offline' | 'error' | 'disabled';
  lastSyncedAt: string | null;
  error: string | null;
};

let status: SyncStatus = { state: 'disabled', lastSyncedAt: null, error: null };
let userId: string | null = null;
let running: Promise<boolean> | null = null;
let again = false;
let timer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

function setStatus(patch: Partial<SyncStatus>) {
  status = { ...status, ...patch };
  for (const l of listeners) l();
}

async function run(): Promise<boolean> {
  if (!userId || !supabase) return false;
  const net = await NetInfo.fetch();
  if (net.isConnected === false) {
    setStatus({ state: 'offline' });
    return false;
  }
  setStatus({ state: 'syncing' });
  try {
    await syncAll(getDb(), supabaseRemote(supabase), userId);
    setStatus({ state: 'idle', lastSyncedAt: new Date().toISOString(), error: null });
    return true;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const offline = /network|fetch|timed? ?out/i.test(message);
    setStatus({ state: offline ? 'offline' : 'error', error: offline ? null : message });
    return false;
  }
}

export const sync = {
  /** Enables syncing for a signed-in user (null disables it, e.g. after sign-out or in dev offline mode). */
  setUser(id: string | null) {
    userId = id;
    if (!id) {
      if (timer) clearTimeout(timer);
      setStatus({ state: 'disabled', lastSyncedAt: null, error: null });
    }
  },
  /** Syncs now (joins a sync already in flight). Resolves true on success. */
  now(): Promise<boolean> {
    if (timer) clearTimeout(timer);
    if (running) {
      // Edits made during a sync must not wait for the next trigger: run once more afterwards.
      again = true;
      return running;
    }
    running = run().finally(() => {
      running = null;
      if (again) {
        again = false;
        void sync.now();
      }
    });
    return running;
  },
  /** Like now(), but gives up waiting after `ms` (the sync itself continues in the background). */
  nowWithin(ms: number): Promise<boolean> {
    return Promise.race([sync.now(), new Promise<boolean>((resolve) => setTimeout(() => resolve(false), ms))]);
  },
  /** Disables syncing and waits for a sync in flight to finish (call before wiping local data). */
  async stop(): Promise<void> {
    sync.setUser(null);
    again = false;
    await running?.catch(() => undefined);
  },
  /** Debounced sync, used after local edits. */
  request(delayMs = 3000) {
    if (!userId) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void sync.now(), delayMs);
  },
};

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => status,
  );
}

/** Mount once while signed in: wires all the sync triggers. */
export function useSyncTriggers(enabledUserId: string | null) {
  useEffect(() => {
    sync.setUser(enabledUserId);
    if (!enabledUserId) return;
    void sync.now();
    const offTables = onTablesChanged(() => sync.request());
    const appState = AppState.addEventListener('change', (s) => s === 'active' && void sync.now());
    let wasConnected = true;
    const offNet = NetInfo.addEventListener((s) => {
      const connected = s.isConnected !== false;
      if (connected && !wasConnected) void sync.now();
      wasConnected = connected;
    });
    const interval = setInterval(() => AppState.currentState === 'active' && void sync.now(), 60_000);
    return () => {
      offTables();
      appState.remove();
      offNet();
      clearInterval(interval);
      sync.setUser(null);
    };
  }, [enabledUserId]);
}
