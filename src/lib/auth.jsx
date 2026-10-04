import { createContext, useContext, useEffect, useState } from 'react';
import { isDemo, supabase } from './store/index.js';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(isDemo ? { id: 'demo', email: 'demo@chalkline.app' } : undefined);

  useEffect(() => {
    if (isDemo) return;
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const api = {
    user, // undefined = still checking, null = signed out
    async signIn(email, password) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message === 'Invalid login credentials' ? 'That email and password don’t match. Check them and try again.' : error.message);
    },
    async signUp(email, password) {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + location.pathname } });
      if (error) throw new Error(error.message);
      return { needsConfirm: !data.session };
    },
    async resetPassword(email) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
      if (error) throw new Error(error.message);
    },
    async signOut() { if (!isDemo) await supabase.auth.signOut(); }
  };
  return <AuthCtx.Provider value={api}>{children}</AuthCtx.Provider>;
}
