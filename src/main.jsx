import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

// Light by default; dark only when the person picks it.
let theme = 'light';
try { theme = localStorage.getItem('chalkline.theme') === 'dark' ? 'dark' : 'light'; } catch { /* ignore */ }
document.documentElement.dataset.theme = theme;

// Scroll to top on every page change.
addEventListener('hashchange', () => window.scrollTo({ top: 0 }));

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>);
