import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

const buildId = typeof __BUILD_ID__ === 'string' ? __BUILD_ID__ : 'dev';
console.info('[4B R&D Trial Portal] build', buildId);

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary buildId={buildId}>
    <App />
  </ErrorBoundary>
);
