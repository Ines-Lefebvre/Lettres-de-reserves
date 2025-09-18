import React, { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const s = !!data.session;
      setOk(s);
      setReady(true);
      if (!s) window.location.href = '/login';
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setOk(!!session);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!ready) return <div>Chargement…</div>;
  if (!ok) return null;
  return <>{children}</>;
}