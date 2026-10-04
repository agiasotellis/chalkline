import { useData } from './data.jsx';
import { useToast } from './toast.jsx';

// Sends an email and reports the outcome. `done` describes what already happened (e.g. "Quote Q-1045 sent").
export function useSendEmail() {
  const { sendEmail } = useData();
  const toast = useToast();
  return async (w, kind, done) => {
    try {
      const r = await sendEmail(w, kind);
      if (!r.ok) toast(`${done ? `${done}, but the` : 'The'} email didn’t go out: ${r.error}`, 'bad');
      else if (r.demo) toast(`${done ? `${done}. ` : ''}Demo mode: no real email was sent to ${r.to}`);
      else toast(`${done ? `${done} and emailed` : 'Emailed'} to ${r.to}`);
      return r;
    } catch (e) {
      toast(`${done ? `${done}, but the` : 'The'} email didn’t go out: ${e.message}`, 'bad');
      return { ok: false, error: e.message };
    }
  };
}
