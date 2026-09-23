import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles.css';

const basePath = (import.meta.env.VITE_BASE_PATH || '/hospital-site').replace(/\/$/, '') || '/';
createRoot(document.getElementById('root')!).render(<StrictMode><BrowserRouter basename={basePath}><App /></BrowserRouter></StrictMode>);
