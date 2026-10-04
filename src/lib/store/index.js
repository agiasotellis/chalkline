import { localStore } from './local.js';
import { supabase, supabaseStore } from './supabase.js';

// Live mode when Supabase keys are set, demo mode otherwise.
export const isDemo = import.meta.env.VITE_FORCE_DEMO === '1' || !supabase;
export const store = isDemo ? localStore : supabaseStore;
export { supabase };
