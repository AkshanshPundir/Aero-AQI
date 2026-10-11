import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import AeroAqi from './aero-aqi/AeroAqi';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AeroAqi />
  </StrictMode>,
);
