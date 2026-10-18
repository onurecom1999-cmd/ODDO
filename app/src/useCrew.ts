import { useCallback, useEffect, useRef, useState } from 'react';
import { createCrew, CrewData, ensureSignedIn, friendlyError, joinCrew, leaveCrew, loadCrew, syncMissing } from './cloud';
import { AppState, Profile } from './storage';
import { supabase } from './supabase';

export type CrewState = {
  online: boolean;
  loading: boolean;
  error: string;
  crew: CrewData | null;
  refresh: () => Promise<void>;
  create: (name: string) => Promise<boolean>;
  join: (code: string) => Promise<boolean>;
  leave: () => Promise<void>;
};

export function useCrew(profile: Profile | null, local: Pick<AppState, 'sessions' | 'rescues'> | null): CrewState {
  const [me, setMe] = useState<string | null>(null);
  const [crew, setCrew] = useState<CrewData | null>(null);
  const [loading, setLoading] = useState(!!supabase);
  const [error, setError] = useState('');
  const busy = useRef(false);

  const refresh = useCallback(async () => {
    if (!supabase || !profile || busy.current) return;
    // One sync at a time, so a session is never uploaded twice.
    busy.current = true;
    try {
      const id = me ?? (await ensureSignedIn(profile));
      if (!id) return;
      setMe(id);
      let data = await loadCrew(id);
      if (data && local) {
        const mine = data.members.find(m => m.id === id)?.sessions ?? [];
        const all = [...local.sessions, ...local.rescues.map(date => ({ date, workout: 'A' as const, sets: {}, rescue: true }))];
        if (await syncMissing(id, mine, all)) data = await loadCrew(id);
      }
      setCrew(data);
      setError('');
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, [me, profile, local]);

  useEffect(() => {
    refresh();
    // Keep the crew's "today" fresh while the app is open.
    const t = setInterval(refresh, 30000);
    return () => clearInterval(t);
  }, [refresh]);

  async function run(action: () => Promise<void>) {
    setError('');
    try {
      if (!me && profile) setMe(await ensureSignedIn(profile));
      await action();
      while (busy.current) await new Promise(r => setTimeout(r, 100));
      await refresh();
      return true;
    } catch (e) {
      setError(friendlyError(e));
      return false;
    }
  }

  return {
    online: !!supabase,
    loading,
    error,
    crew,
    refresh,
    create: name => run(() => createCrew(name)),
    join: code => run(() => joinCrew(code)),
    leave: async () => { await run(leaveCrew); setCrew(null); },
  };
}
