import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { store } from './store/index.js';
import { transitions } from './workflow.js';

const DataCtx = createContext(null);
export const useData = () => useContext(DataCtx);

export function DataProvider({ children }) {
  const [state, setState] = useState({ loading: true, error: null, work: [], customers: [], prices: [], settings: null });

  const load = useCallback(async () => {
    try {
      const [work, customers, prices, settings] = await Promise.all([store.listWork(), store.listCustomers(), store.listPrices(), store.getSettings()]);
      setState({ loading: false, error: null, work, customers, prices, settings });
    } catch (e) {
      setState(s => ({ ...s, loading: false, error: e.message }));
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const replace = (list, item) => (list.some(x => x.id === item.id) ? list.map(x => (x.id === item.id ? item : x)) : [item, ...list]);

  const actions = useMemo(() => ({
    reload: load,
    async reset() { await store.reset?.(); await load(); },
    async saveWork(data) {
      const w = data.id ? await store.updateWork(data.id, data) : await store.createWork(data);
      setState(s => ({ ...s, work: replace(s.work, w) }));
      return w;
    },
    async patchWork(id, patch) {
      // Optimistic: show the change at once, roll back if saving fails.
      let before;
      setState(s => { before = s.work; return { ...s, work: s.work.map(w => (w.id === id ? { ...w, ...patch } : w)) }; });
      try {
        const w = await store.updateWork(id, patch);
        setState(s => ({ ...s, work: replace(s.work, w) }));
        return w;
      } catch (e) {
        setState(s => ({ ...s, work: before }));
        throw e;
      }
    },
    async move(w, action, arg) {
      const patch = action === 'toJob' ? transitions.toJob(w) : transitions[action](arg);
      return actions.patchWork(w.id, patch);
    },
    async deleteWork(id) { await store.deleteWork(id); setState(s => ({ ...s, work: s.work.filter(w => w.id !== id) })); },
    async saveCustomer(c) { const n = await store.saveCustomer(c); setState(s => ({ ...s, customers: replace(s.customers, n) })); return n; },
    async deleteCustomer(id) { await store.deleteCustomer(id); setState(s => ({ ...s, customers: s.customers.filter(c => c.id !== id) })); },
    async savePrice(p) { const n = await store.savePrice(p); setState(s => ({ ...s, prices: replace(s.prices, n) })); return n; },
    async deletePrice(id) { await store.deletePrice(id); setState(s => ({ ...s, prices: s.prices.filter(p => p.id !== id) })); },
    async saveSettings(v) { const n = await store.saveSettings(v); setState(s => ({ ...s, settings: n })); return n; }
  }), [load]);

  const customerById = useMemo(() => Object.fromEntries(state.customers.map(c => [c.id, c])), [state.customers]);
  return <DataCtx.Provider value={{ ...state, ...actions, customerById }}>{children}</DataCtx.Provider>;
}
