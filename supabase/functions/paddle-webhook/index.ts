// Paddle → Ergo. Paddle calls this whenever a subscription starts, changes, renews or ends,
// and we record it in public.subscriptions. Deploy with JWT verification OFF (Paddle can't sign in).
// Secrets: PADDLE_WEBHOOK_SECRET (Paddle → Developer tools → Notifications → your destination → secret key).
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase automatically.
import { createClient } from 'npm:@supabase/supabase-js@2';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const enc = new TextEncoder();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function hmacHex(secret: string, msg: string) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(msg));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
// Paddle-Signature: ts=1671552777;h1=eb4d0dc8…  The signed text is "<ts>:<raw body>".
async function verified(header: string | null, raw: string) {
  const secret = Deno.env.get('PADDLE_WEBHOOK_SECRET');
  if (!secret || !header) return false;
  const parts = header.split(';').map(p => p.split('='));
  const ts = parts.find(([k]) => k === 'ts')?.[1];
  const sigs = parts.filter(([k]) => k === 'h1').map(([, v]) => v);
  if (!ts || !sigs.length) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false; // older than 5 minutes: replay
  const want = await hmacHex(secret, `${ts}:${raw}`);
  return sigs.some(s => safeEqual(s, want));
}

// Which plan and billing period a Paddle price belongs to, from public.billing.prices.
async function planFor(priceId: string | undefined, price: any) {
  const { data } = await db.from('billing').select('prices').eq('id', 1).maybeSingle();
  for (const [plan, byInterval] of Object.entries((data?.prices ?? {}) as Record<string, Record<string, string>>)) {
    for (const [interval, id] of Object.entries(byInterval ?? {})) if (id === priceId) return { plan, interval };
  }
  return { plan: price?.custom_data?.plan ?? null, interval: price?.billing_cycle?.interval ?? null };
}

Deno.serve(async req => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const raw = await req.text();
  if (!(await verified(req.headers.get('paddle-signature'), raw))) return new Response('Invalid signature', { status: 401 });

  let event: any;
  try { event = JSON.parse(raw); } catch { return new Response('Bad JSON', { status: 400 }); }
  const type: string = event?.event_type ?? '';
  if (!type.startsWith('subscription.')) return new Response('ignored');

  const s = event.data ?? {};
  const item = s.items?.[0];
  const { plan, interval } = await planFor(item?.price?.id, item?.price);

  // Whose subscription is this? Checkout passes the Ergo user id as custom data.
  let owner: string | null = UUID.test(s.custom_data?.user_id ?? '') ? s.custom_data.user_id : null;
  const { data: existing } = await db.from('subscriptions').select('owner_id, paddle_subscription_id, paddle_updated_at')
    .or(`paddle_subscription_id.eq.${s.id},paddle_customer_id.eq.${s.customer_id}`).limit(1).maybeSingle();
  if (!owner) owner = existing?.owner_id ?? null;
  if (!owner) { console.error('No Ergo user for subscription', s.id); return new Response('no user'); }

  // Events can arrive out of order: ignore anything older than what we already have.
  if (existing && existing.paddle_subscription_id === s.id && existing.paddle_updated_at && s.updated_at
      && new Date(existing.paddle_updated_at) > new Date(s.updated_at)) return new Response('stale');

  const row = {
    owner_id: owner,
    status: s.status ?? 'none',
    plan,
    billing_interval: interval,
    paddle_customer_id: s.customer_id ?? null,
    paddle_subscription_id: s.id ?? null,
    price_id: item?.price?.id ?? null,
    current_period_end: s.current_billing_period?.ends_at ?? null,
    scheduled_change: s.scheduled_change?.action ?? null,
    scheduled_change_at: s.scheduled_change?.effective_at ?? null,
    paddle_updated_at: s.updated_at ?? new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  const { error } = await db.from('subscriptions').upsert(row, { onConflict: 'owner_id' });
  if (error) { console.error(error); return new Response('db error', { status: 500 }); } // Paddle retries
  return new Response('ok');
});
