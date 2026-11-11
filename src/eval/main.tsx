import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { EvalPage } from './EvalPage';
import '../ui/app.css';
import './eval.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');
createRoot(root).render(
  <StrictMode>
    <EvalPage />
  </StrictMode>,
);
