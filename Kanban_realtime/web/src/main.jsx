/**
 * main.jsx — Entry point da aplicação React
 *
 * Hierarquia de Providers:
 *   BrowserRouter
 *     └── AuthProvider (contexto de autenticação + socket)
 *           └── App (roteamento)
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import App from './App.jsx';
import './stores/themeStore'; // initialize data-theme before first render
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
