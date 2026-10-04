export const DAY = 864e5;
const money = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' });
export const eur = n => money.format(Number(n) || 0);
export const fmtDate = t => (t ? new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
export const fmtShort = t => (t ? new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—');
export const ago = t => {
  if (!t) return '';
  const d = Math.round((Date.now() - new Date(t)) / DAY);
  if (d <= 0) return 'today';
  if (d === 1) return 'yesterday';
  if (d < 30) return `${d} days ago`;
  return fmtDate(t);
};
export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));
