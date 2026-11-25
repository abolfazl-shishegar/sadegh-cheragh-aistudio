import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { Admin } from './components/Admin';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {location.pathname.replace(/\/$/, '') === '/admin' ? <Admin /> : <App />}
  </StrictMode>,
);
