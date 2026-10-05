import { Link } from 'react-router-dom';
import { useBilling } from '../lib/billing.jsx';
import { useT } from '../lib/i18n.jsx';
import { useToast } from '../lib/toast.jsx';
import { fmtDate } from '../lib/format.js';

// A slim bar at the top of the app: trial days left, trial ended, failed payment, or plan ending.
export function BillingBanner() {
  const b = useBilling();
  const { t } = useT();
  const toast = useToast();
  if (!b?.loaded) return null;
  const a = b.access;
  if (a.demo || !a.enforced) return null;
  const portal = () => b.portal().catch(e => toast(e.message, 'bad'));
  let tone = '', text = '', action = null;
  if (a.status === 'past_due') { tone = 'bad'; text = t('bi.b.pastDue'); action = <button type="button" onClick={portal}>{t('bi.b.update')}</button>; }
  else if (!a.canWrite) { tone = 'bad'; text = t('bi.b.ended'); action = <Link to="/plan">{t('bi.b.choose')}</Link>; }
  else if (a.plan === 'trial') { tone = b.daysLeft <= 3 ? 'warn' : ''; text = t('bi.b.trial', { n: b.daysLeft }); action = <Link to="/plan">{t('bi.b.choose')}</Link>; }
  else if (a.scheduledChange === 'cancel') { tone = 'warn'; text = t('bi.b.ending', { date: fmtDate(a.scheduledChangeAt || a.periodEnd) }); action = <button type="button" onClick={portal}>{t('bi.b.manage')}</button>; }
  else if (a.status === 'active' && a.periodEnd && new Date(a.periodEnd) - Date.now() < (a.interval === 'year' ? 7 : 3) * 864e5) {
    text = t('bi.b.renews', { plan: { solo: 'Solo', trade: 'Trade', crew: 'Crew' }[a.paidPlan] || '', date: fmtDate(a.periodEnd) });
    action = <Link to="/plan">{t('bi.b.manage')}</Link>;
  }
  else return null;
  return <div className={`bill-banner${tone ? ` bb-${tone}` : ''}`} role="status"><span>{text}</span>{action}</div>;
}

// Shown in place of a Trade feature on the Solo plan.
export function Upsell({ feature }) {
  const { t } = useT();
  return (
    <div className="upsell">
      <span>{t(`bi.up.${feature}`)}</span>
      <Link className="btn btn-sm btn-chalk" to="/plan">{t('bi.up.cta')}</Link>
    </div>
  );
}
