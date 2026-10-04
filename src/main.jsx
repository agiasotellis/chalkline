import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

try { const t = localStorage.getItem('chalkline.theme'); if (t) document.documentElement.dataset.theme = t; } catch { /* ignore */ }

// Scroll to top on every page change.
addEventListener('hashchange', () => window.scrollTo({ top: 0 }));

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>);
