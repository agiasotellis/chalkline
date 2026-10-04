import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

// Spotlight tour. Each step points at elements marked data-tour="<target>".
// When several match (sidebar and bottom bar), only visible ones count; several visible ones are outlined together.
export const DASHBOARD_STEPS = [
  { title: 'Welcome to Chalkline', body: 'Here’s a one-minute look around your dashboard, so you know where everything is.', primary: 'Show me around' },
  { target: 'kpis', title: 'Your money at a glance', body: 'What’s waiting on customers, what’s booked, what you’re owed and what’s been paid. Tap any figure to see what’s behind it.' },
  { target: 'attention', title: 'Needs attention', body: 'Overdue invoices, change requests and jobs ready to bill land here first. Tap one to deal with it.' },
  { target: 'new-quote', title: 'Start with a quote', body: 'Add line items or pick from your price list, then send it. Your customer gets a private link and approves it with their name.' },
  { target: 'flow', title: 'Quotes, jobs, invoices', body: 'Approved quotes become jobs with a checklist. When the last task is ticked, turn the job into an invoice in one tap.' },
  { target: 'settings', title: 'Make it yours', body: 'Add your logo, VAT number and bank details in Settings. They appear on every quote and invoice you send.' },
  { title: 'You’re ready', body: 'Write your first quote now, or look around first. You can replay this tour any time from Settings.', primary: 'Write a quote', secondary: 'Finish' }
];

const PAD = 8;
const visible = el => {
  if (!el.getClientRects().length) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
};
function targetRect(name) {
  const els = [...document.querySelectorAll(`[data-tour="${name}"]`)].filter(visible);
  if (!els.length) return null;
  const rs = els.map(e => e.getBoundingClientRect());
  const top = Math.min(...rs.map(r => r.top)), left = Math.min(...rs.map(r => r.left));
  const right = Math.max(...rs.map(r => r.right)), bottom = Math.max(...rs.map(r => r.bottom));
  return { top: top - PAD, left: left - PAD, width: right - left + PAD * 2, height: bottom - top + PAD * 2, el: els[0], fixed: els.some(e => getComputedStyle(e).position === 'fixed' || e.closest('.bottom-nav,.topbar,.side')) };
}

export default function Tour({ steps, onFinish, onPrimaryEnd }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState(null);
  const [card, setCard] = useState({ top: 0, left: 0, placed: false });
  const cardRef = useRef(null);
  const step = steps[i];
  const last = i === steps.length - 1;
  const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const measure = useCallback(() => {
    if (!step.target) { setRect(null); return; }
    setRect(targetRect(step.target));
  }, [step]);

  // Bring the target into view, then measure.
  useEffect(() => {
    if (!step.target) { setRect(null); return; }
    const t = targetRect(step.target);
    if (t && !t.fixed) {
      const r = t.el.getBoundingClientRect();
      const vh = innerHeight;
      if (r.top < 80 || r.bottom > vh - 120) t.el.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
    }
    measure();
    const id = setTimeout(measure, reduce ? 0 : 420);
    return () => clearTimeout(id);
  }, [step, measure, reduce]);

  useEffect(() => {
    const on = () => measure();
    addEventListener('resize', on); addEventListener('scroll', on, { passive: true });
    return () => { removeEventListener('resize', on); removeEventListener('scroll', on); };
  }, [measure]);

  // Place the card beside the spotlight, inside the screen.
  useLayoutEffect(() => {
    const c = cardRef.current; if (!c) return;
    const vw = innerWidth, vh = innerHeight, cw = c.offsetWidth, ch = c.offsetHeight, m = 16;
    if (!rect) { setCard({ top: Math.max(m, (vh - ch) / 2), left: (vw - cw) / 2, placed: true }); return; }
    const below = vh - (rect.top + rect.height), above = rect.top;
    let top;
    if (below >= ch + m * 1.5) top = rect.top + rect.height + 12;
    else if (above >= ch + m * 1.5) top = rect.top - ch - 12;
    else top = vh - ch - m - (vw < 900 ? 72 : 0);
    let left = rect.left + rect.width / 2 - cw / 2;
    left = Math.min(Math.max(m, left), vw - cw - m);
    setCard({ top: Math.min(Math.max(m, top), vh - ch - m), left, placed: true });
  }, [rect, i]);

  const finish = useCallback(primary => { onFinish(); if (primary && onPrimaryEnd) onPrimaryEnd(); }, [onFinish, onPrimaryEnd]);
  const next = useCallback(() => (last ? finish(true) : setI(n => n + 1)), [last, finish]);
  const back = () => setI(n => Math.max(0, n - 1));

  useEffect(() => {
    const k = e => {
      if (e.key === 'Escape') finish(false);
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') setI(n => Math.max(0, n - 1));
    };
    addEventListener('keydown', k); return () => removeEventListener('keydown', k);
  }, [next, finish]);
  useEffect(() => { cardRef.current?.querySelector('.tour-primary')?.focus({ preventScroll: true }); }, [i]);

  return (
    <div className="tour" role="dialog" aria-modal="true" aria-labelledby="tour-title" aria-describedby="tour-body">
      <div className={`tour-dim${rect ? '' : ' full'}`} onClick={e => e.stopPropagation()} />
      {rect && <div className="tour-spot" style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }} />}
      <div ref={cardRef} className={`tour-card${card.placed ? ' in' : ''}`} style={{ top: card.top, left: card.left }} key={i}>
        {step.target && <span className="tour-count num">{i} of {steps.length - 2}</span>}
        <h3 id="tour-title">{step.title}</h3>
        <p id="tour-body">{step.body}</p>
        <div className="tour-dots" aria-hidden="true">{steps.map((_, k) => <i key={k} className={k === i ? 'on' : k < i ? 'done' : ''} />)}</div>
        <div className="tour-actions">
          {i === 0 ? <button type="button" className="btn btn-ghost btn-sm" onClick={() => finish(false)}>Skip tour</button>
            : last ? <button type="button" className="btn btn-ghost btn-sm" onClick={() => finish(false)}>{step.secondary || 'Finish'}</button>
            : <button type="button" className="btn btn-ghost btn-sm" onClick={back}>Back</button>}
          <button type="button" className="btn btn-chalk btn-sm tour-primary" onClick={next}>{step.primary || (i === steps.length - 2 ? 'Last step' : 'Next')}</button>
        </div>
        {i > 0 && !last && <button type="button" className="tour-x" aria-label="Close tour" onClick={() => finish(false)}>×</button>}
      </div>
    </div>
  );
}
