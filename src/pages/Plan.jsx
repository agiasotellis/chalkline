import { useEffect, useRef, useState } from 'react';
import { PLANS, PRICE, SOON, useBilling } from '../lib/billing.jsx';
import { useT } from '../lib/i18n.jsx';
import { useToast } from '../lib/toast.jsx';
import { fmtDate, moneyShort } from '../lib/format.js';
import { Confirm } from '../components/ui.jsx';

const NAME = { solo: 'Solo', trade: 'Trade', crew: 'Crew' };
const Check = () => <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5 6.5 12 13 4.5" /></svg>;

export default function Plan() {
  const b = useBilling();
  const { t } = useT();
  const toast = useToast();
  const a = b.access;
  const paid = ['active', 'trialing', 'past_due', 'paused'].includes(a.status) && a.hasSubscription;
  const [period, setPeriod] = useState(a.interval === 'year' ? 'year' : 'month');
  const [busy, setBusy] = useState('');
  const [ask, setAsk] = useState(null);
  useEffect(() => { b.reload(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Say thanks when a new subscription lands; explain if the confirmation is slow.
  const was = useRef({ paid, waiting: b.waiting });
  useEffect(() => {
    if (!was.current.paid && paid) toast(t('bi.welcome', { plan: NAME[a.paidPlan] || '' }));
    else if (was.current.waiting && !b.waiting && !paid) toast(t('bi.slow'));
    was.current = { paid, waiting: b.waiting };
  }, [paid, b.waiting]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = async (key, fn, done) => {
    setBusy(key);
    try { await fn(); if (done) toast(done); } catch (e) { toast(e.message, 'bad'); } finally { setBusy(''); }
  };
  const choose = plan => {
    if (a.demo) return toast(t('bi.demo'));
    if (!b.ready) return toast(t('bi.notReady'));
    if (paid) return setAsk(plan);
    run(plan, () => b.checkout(plan, period));
  };

  // What the status card says.
  let head, body, tone = '';
  if (paid) {
    head = t('bi.current', { plan: NAME[a.paidPlan] || a.paidPlan });
    body = a.status === 'past_due' ? t('bi.pastDue')
      : a.status === 'paused' ? t('bi.paused')
      : a.scheduledChange === 'cancel' ? t('bi.ends', { date: fmtDate(a.scheduledChangeAt || a.periodEnd) })
      : `${a.interval === 'year' ? t('bi.yearlyL') : t('bi.monthlyL')} · ${t('bi.renews', { date: fmtDate(a.periodEnd) })}`;
    tone = a.status === 'past_due' ? 'bad' : 'ok';
  } else if (!a.enforced && !a.demo) {
    head = t('bi.trial'); body = t('bi.openNote');
  } else if (a.canWrite) {
    head = t('bi.trialLeft', { n: b.daysLeft }); body = t('bi.trialNote'); tone = b.daysLeft <= 3 ? 'warn' : '';
  } else {
    head = t('bi.trialEnded'); body = t('bi.endedNote'); tone = 'bad';
  }

  return (
    <div className="page">
      <div className="page-head"><div><h1>{t('bi.title')}</h1><p>{t('bi.sub')}</p></div></div>

      <section className={`panel plan-status${tone ? ` ps-${tone}` : ''}`}>
        <div>
          <h2>{head}</h2>
          <p className="note">{body}</p>
          {b.waiting && <p className="note" role="status"><span className="spin spin-sm" aria-hidden="true" /> {t('bi.waiting')}</p>}
        </div>
        {paid && (
          <button className="btn btn-ghost" type="button" disabled={busy === 'portal'} onClick={() => run('portal', b.portal)}>
            {t('bi.manage')}
          </button>
        )}
      </section>

      <div className="plan-period" role="group" aria-label={t('bi.monthly') + ' / ' + t('bi.yearly')}>
        <button type="button" aria-pressed={period === 'month'} onClick={() => setPeriod('month')}>{t('bi.monthly')}</button>
        <button type="button" aria-pressed={period === 'year'} onClick={() => setPeriod('year')}>{t('bi.yearly')} <span className="pill t-chalk">{t('bi.save')}</span></button>
      </div>

      <div className="plan-grid">
        {PLANS.map(p => {
          const soon = SOON.includes(p);
          const current = paid && a.paidPlan === p && a.interval === period;
          const samePlanOtherPeriod = paid && a.paidPlan === p && a.interval !== period;
          const amount = PRICE[p][period];
          const label = soon ? t('bi.soon')
            : current ? t('bi.thisPlan')
            : samePlanOtherPeriod ? t('bi.switchPeriod', { period: period === 'year' ? t('bi.yearly') : t('bi.monthly') })
            : paid ? t('bi.switch', { plan: NAME[p] }) : t('bi.choose', { plan: NAME[p] });
          return (
            <section key={p} className={`panel plan-card${p === 'trade' ? ' hot' : ''}${current ? ' current' : ''}${soon ? ' soon' : ''}`}>
              <div className="pc-top">
                <h2>{NAME[p]}</h2>
                {p === 'trade' && <span className="pill t-chalk">{t('bi.popular')}</span>}
                {soon && <span className="pill t-muted">{t('bi.soon')}</span>}
              </div>
              <p className="note">{t(`bi.who.${p}`)}</p>
              <div className="pc-price">
                <b className="num">{moneyShort(period === 'year' ? amount / 12 : amount)}</b><span>{t('bi.perMonth')}</span>
              </div>
              <p className="note">{period === 'year' ? t('bi.billedYear', { amt: moneyShort(amount) }) : t('bi.billedMonth')}</p>
              <ul className="pc-feat">{t(`bi.f.${p}`).map(f => <li key={f}><Check />{f}</li>)}</ul>
              <button
                type="button"
                className={`btn ${p === 'trade' && !current ? 'btn-chalk' : 'btn-ghost'}`}
                disabled={soon || current || !!busy || b.waiting}
                onClick={() => choose(p)}
              >{busy === p ? '…' : label}</button>
            </section>
          );
        })}
      </div>

      <p className="note plan-foot">
        {a.demo ? t('bi.demo') + ' ' : ''}{t('bi.mor')}{' '}
        <a href="legal.html#terms" target="_blank" rel="noopener">{t('bi.terms')}</a> ·{' '}
        <a href="legal.html#refunds" target="_blank" rel="noopener">{t('bi.refunds')}</a> ·{' '}
        <a href="legal.html#privacy" target="_blank" rel="noopener">{t('bi.privacy')}</a>
      </p>

      <Confirm
        open={!!ask}
        title={ask ? t('bi.confirmT', { plan: NAME[ask] }) : ''}
        body={t('bi.confirmB')}
        confirmLabel={t('bi.confirmGo')}
        onConfirm={() => run(ask, () => b.change(ask, period), t('bi.switched'))}
        onClose={() => setAsk(null)}
      />
    </div>
  );
}
