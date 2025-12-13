import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { initFaro } from './services/faro/FaroService';

// Initialize Grafana Faro for monitoring and observability
if (import.meta.env.VITE_FARO_URL) {
  try {
    initFaro({
      url: import.meta.env.VITE_FARO_URL,
      appName: import.meta.env.VITE_FARO_APP_NAME || 'WorkTime',
      appVersion: import.meta.env.VITE_FARO_APP_VERSION,
      environment: import.meta.env.VITE_FARO_ENVIRONMENT || import.meta.env.MODE,
    });
  } catch (error) {
    console.error('Failed to initialize Faro:', error);
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
