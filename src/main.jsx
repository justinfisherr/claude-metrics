import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { Chart } from 'chart.js';
import App from './App';
import './styles/theme.css';
import './styles/panels.css';
import './styles/nav.css';
import './styles/components.css';
import './styles/wrapped.css';

Chart.defaults.font.family = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
Chart.defaults.font.size = 11;
Chart.defaults.color = '#9db4cf';
Chart.defaults.borderColor = 'rgba(93, 155, 224, 0.12)';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);
