import { useCallback, useEffect, useState } from 'react';
import { createCrew, CrewData, ensureSignedIn, friendlyError, joinCrew, leaveCrew, loadCrew } from './cloud';
import { Profile } from './storage';
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

export function useCrew(profile: Profile | null): CrewState {
  const [me, setMe] = useState<string | null>(null);
  const [crew, setCrew] = useState<CrewData | null>(null);
  const [loading, setLoading] = useState(!!supabase);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!supabase || !profile) return;
    try {
      const id = me ?? (await ensureSignedIn(profile));
      if (!id) return;
      setMe(id);
      setCrew(await loadCrew(id));
      setError('');
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }, [me, profile]);

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
