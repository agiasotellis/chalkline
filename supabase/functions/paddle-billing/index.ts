// Ergo → Paddle, for a signed-in user:
//   { action: 'portal' }            → link to Paddle's page to update the card, see receipts or cancel
//   { action: 'change', priceId }    → switch plan or billing period (prorated)
// Secrets: PADDLE_API_KEY (Paddle → Developer tools → Authentication → API keys).
import { createClient } from 'npm:@supabase/supabase-js@2';

const URL_ = Deno.env.get('SUPABASE_URL')!;
const admin = createClient(URL_, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  // Who is asking?
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: { user } } = await admin.auth.getUser(token);
  if (!user) return json({ error: 'Please sign in again.' }, 401);

  const key = Deno.env.get('PADDLE_API_KEY');
  if (!key) return json({ error: 'Payments are not set up yet.' }, 503);
  const { data: cfg } = await admin.from('billing').select('environment, prices').eq('id', 1).single();
  const api = cfg?.environment === 'production' ? 'https://api.paddle.com' : 'https://sandbox-api.paddle.com';
  const paddle = async (path: string, method: string, body?: unknown) => {
    const r = await fetch(api + path, { method, headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const out = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(out?.error?.detail ?? `Paddle error ${r.status}`);
    return out.data;
  };

  const { data: sub } = await admin.from('subscriptions').select('*').eq('owner_id', user.id).maybeSingle();
  const { action, priceId } = await req.json().catch(() => ({}));

  try {
    if (action === 'portal') {
      if (!sub?.paddle_customer_id) return json({ error: 'No subscription yet.' }, 404);
      const s = await paddle(`/customers/${sub.paddle_customer_id}/portal-sessions`, 'POST',
        sub.paddle_subscription_id ? { subscription_ids: [sub.paddle_subscription_id] } : {});
      return json({ url: s?.urls?.general?.overview });
    }
    if (action === 'change') {
      const allowed = Object.values((cfg?.prices ?? {}) as Record<string, Record<string, string>>).flatMap(o => Object.values(o ?? {}));
      if (!priceId || !allowed.includes(priceId)) return json({ error: 'Unknown plan.' }, 400);
      if (!sub?.paddle_subscription_id || sub.status === 'canceled') return json({ error: 'No active subscription.' }, 404);
      const s = await paddle(`/subscriptions/${sub.paddle_subscription_id}`, 'PATCH', {
        items: [{ price_id: priceId, quantity: 1 }],
        proration_billing_mode: 'prorated_immediately'
      });
      return json({ ok: true, status: s?.status });
    }
    return json({ error: 'Unknown action.' }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 502);
  }
});
