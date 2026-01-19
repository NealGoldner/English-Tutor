
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (rootElement) {
  // 移除加载动画节点（如果有）
  const loader = document.getElementById('loading-status');
  if (loader) loader.style.display = 'none';

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  
  (window as any).APP_LOADED = true;
}
