import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { getDb } from '@/db/database';
import { claimLocalData, wipeUserData } from '@/db/local';
import { sync } from '@/sync';

import { supabase } from './supabase';

export type AuthState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'signedIn'; userId: string; email: string | null; devOffline: boolean };

type AuthApi = {
  state: AuthState;
  /** Clears the local database and the session. */
  signOut: () => Promise<void>;
  /** Development only: use the app without an account (no sync, no AI). */
  continueOffline: () => Promise<void>;
};

const DEV_OFFLINE_KEY = 'plate.devOffline';
export const DEV_USER_ID = '00000000-0000-4000-8000-000000000001';

const AuthContext = createContext<AuthApi | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    let active = true;

    // The session lives in AsyncStorage, so this works offline after the first sign-in.
    const apply = async (session: Session | null) => {
      if (session) {
        await claimLocalData(getDb(), session.user.id);
        if (active) setState({ status: 'signedIn', userId: session.user.id, email: session.user.email ?? null, devOffline: false });
      } else if (active) {
        setState({ status: 'signedOut' });
      }
    };

    (async () => {
      if (__DEV__ && (await AsyncStorage.getItem(DEV_OFFLINE_KEY))) {
        await claimLocalData(getDb(), DEV_USER_ID);
        if (active) setState({ status: 'signedIn', userId: DEV_USER_ID, email: null, devOffline: true });
        return;
      }
      if (!supabase) return active && setState({ status: 'signedOut' });
      const { data } = await supabase.auth.getSession();
      await apply(data.session);
    })().catch(() => active && setState({ status: 'signedOut' }));

    const subscription = supabase?.auth.onAuthStateChange((event, session) => {
      // INITIAL_SESSION is handled by getSession above; token refreshes don't change who is signed in.
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') void apply(session);
    }).data.subscription;

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    await AsyncStorage.removeItem(DEV_OFFLINE_KEY);
    await sync.stop(); // a pull still in flight must not write into the wiped database
    await wipeUserData(getDb());
    // signOut also clears the stored session when offline; the server-side token then simply expires.
    await supabase?.auth.signOut({ scope: 'local' }).catch(() => undefined);
    setState({ status: 'signedOut' });
  }, []);

  const continueOffline = useCallback(async () => {
    if (!__DEV__) return;
    await AsyncStorage.setItem(DEV_OFFLINE_KEY, '1');
    await claimLocalData(getDb(), DEV_USER_ID);
    setState({ status: 'signedIn', userId: DEV_USER_ID, email: null, devOffline: true });
  }, []);

  const value = useMemo(() => ({ state, signOut, continueOffline }), [state, signOut, continueOffline]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthApi {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

/** For screens that only render when signed in. */
export function useUserId(): string {
  const { state } = useAuth();
  if (state.status !== 'signedIn') throw new Error('Not signed in');
  return state.userId;
}
