import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { isDemo, supabase } from './store/index.js';
import { getLang, tr } from './i18n-core.js';

// Billing: a 14-day free trial, then a Paddle subscription (Solo or Trade; Crew is coming soon).
// The database (supabase/billing.sql) is the source of truth; this mirrors it for the screens.
const DAY = 864e5;
export const PLANS = ['solo', 'trade', 'crew'];
export const SOON = ['crew'];
// Monthly and yearly (two months free) prices, in the visitor's currency.
export const PRICE = { solo: { month: 15, year: 150 }, trade: { month: 22, year: 220 }, crew: { month: 30, year: 300 } };
// Features that need the trial or the Trade plan.
const TRADE_ONLY = ['email', 'logo', 'prices'];

const OPEN = { enforced: false, plan: 'trial', status: 'none', canWrite: true, prices: {} };
const DEMO = () => ({ ...OPEN, demo: true, trialEndsAt: new Date(Date.now() + 14 * DAY).toISOString() });

const Ctx = createContext(null);
export const useBilling = () => useContext(Ctx);

async function invoke(body) {
  const { data, error } = await supabase.functions.invoke('paddle-billing', { body });
  if (error) {
    let msg = error.message;
    try { msg = (await error.context.json()).error || msg; } catch { /* not JSON */ }
    throw new Error(msg);
  }
  return data;
}

// Paddle.js loads once, on first use.
let paddleReady = null;
const listeners = new Set();
function paddle(a) {
  if (!paddleReady) {
    paddleReady = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
      s.onload = () => resolve(window.Paddle);
      s.onerror = () => { paddleReady = null; reject(new Error(tr('bi.loadErr'))); };
      document.head.appendChild(s);
    }).then(P => {
      if (a.environment !== 'production') P.Environment.set('sandbox');
      P.Initialize({ token: a.clientToken, eventCallback: e => listeners.forEach(fn => fn(e)) });
      return P;
    });
  }
  return paddleReady;
}

export function BillingProvider({ user, children }) {
  const [access, setAccess] = useState(isDemo ? DEMO() : null);
  const [waiting, setWaiting] = useState(false); // after checkout, until the webhook lands
  const accessRef = useRef(access);
  accessRef.current = access;

  const load = useCallback(async () => {
    if (isDemo) { const a = DEMO(); setAccess(a); return a; }
    const { data, error } = await supabase.rpc('account_access');
    // Before supabase/billing.sql has been run, everything stays open.
    const a = error || !data ? { ...OPEN, missing: true } : data;
    setAccess(a);
    return a;
  }, []);
  useEffect(() => { if (user) load(); }, [load, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll until the subscription shows up (Paddle → webhook → database usually takes a few seconds).
  const waitFor = useCallback(async test => {
    setWaiting(true);
    try {
      for (let i = 0; i < 20; i++) {
        const a = await load();
        if (test(a)) return true;
        await new Promise(r => setTimeout(r, i < 5 ? 1500 : 3000));
      }
      return false;
    } finally { setWaiting(false); }
  }, [load]);

  useEffect(() => {
    const on = e => {
      if (e?.name === 'checkout.completed') waitFor(a => ['active', 'trialing'].includes(a.status)).then(ok => {
        if (ok) window.Paddle?.Checkout.close();
      });
    };
    listeners.add(on);
    return () => listeners.delete(on);
  }, [waitFor]);

  const value = useMemo(() => {
    const a = access || OPEN;
    const daysLeft = a.trialEndsAt ? Math.max(0, Math.ceil((new Date(a.trialEndsAt) - Date.now()) / DAY)) : 0;
    const can = f => !a.enforced || (a.canWrite && (['trial', 'trade', 'crew'].includes(a.plan) || !TRADE_ONLY.includes(f)));
    const priceId = (plan, interval) => a.prices?.[plan]?.[interval] || '';
    return {
      access: a, loaded: !!access, waiting, daysLeft, reload: load, can, priceId,
      canWrite: !a.enforced || a.canWrite,
      ready: !isDemo && !!a.clientToken && !!priceId('solo', 'month'),
      // Open Paddle's checkout for a plan.
      async checkout(plan, interval) {
        const cur = accessRef.current;
        const id = priceId(plan, interval);
        if (!id) throw new Error(tr('bi.notReady'));
        const P = await paddle(cur);
        P.Checkout.open({
          items: [{ priceId: id, quantity: 1 }],
          customer: { email: user.email },
          customData: { user_id: user.id },
          settings: {
            displayMode: 'overlay',
            theme: document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
            allowLogout: false,
            ...(getLang() === 'en' ? { locale: 'en' } : {})
          }
        });
      },
      // Switch plan or billing period on an existing subscription.
      async change(plan, interval) {
        const id = priceId(plan, interval);
        await invoke({ action: 'change', priceId: id });
        await waitFor(x => x.priceId === id);
      },
      // Paddle's page for card details, receipts and cancelling. Opened in a new tab.
      async portal() {
        const tab = window.open('', '_blank');
        try {
          const { url } = await invoke({ action: 'portal' });
          if (tab) tab.location.href = url; else location.href = url;
        } catch (e) { tab?.close(); throw e; }
      }
    };
  }, [access, waiting, load, waitFor, user]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
