import { createContext, useCallback, useContext, useState } from 'react';

const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const toast = useCallback((msg, tone = 'ink') => {
    const id = Math.random();
    setItems(t => [...t, { id, msg, tone }]);
    setTimeout(() => setItems(t => t.map(x => (x.id === id ? { ...x, out: true } : x))), 2800);
    setTimeout(() => setItems(t => t.filter(x => x.id !== id)), 3150);
  }, []);
  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="toasts" aria-live="polite">
        {items.map(t => <div key={t.id} className={`toast ${t.tone === 'bad' ? 'toast-bad' : ''} ${t.out ? 'out' : ''}`}>{t.msg}</div>)}
      </div>
    </ToastCtx.Provider>
  );
}
