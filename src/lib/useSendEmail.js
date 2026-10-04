import { useData } from './data.jsx';
import { useToast } from './toast.jsx';
import { tr } from './i18n-core.js';

// Sends an email and reports the outcome. `done` describes what already happened (e.g. "Quote Q-1045 sent").
export function useSendEmail() {
  const { sendEmail } = useData();
  const toast = useToast();
  return async (w, kind, done) => {
    try {
      const r = await sendEmail(w, kind);
      if (!r.ok) toast(tr('e.failed', { done, error: r.error }), 'bad');
      else if (r.demo) toast(tr('e.demo', { done, to: r.to }));
      else toast(tr('e.ok', { done, to: r.to }));
      return r;
    } catch (e) {
      toast(tr('e.failed', { done, error: e.message }), 'bad');
      return { ok: false, error: e.message };
    }
  };
}
