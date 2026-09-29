// Mounts the React app into the <div id="root"> in index.html.

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

const container = document.getElementById('root');

// createRoot refuses null, and TypeScript makes us prove the element exists.
if (container === null) {
  throw new Error('index.html is missing <div id="root">');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
