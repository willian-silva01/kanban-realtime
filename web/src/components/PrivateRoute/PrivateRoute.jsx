/**
 * PrivateRoute — Guard de Rota
 *
 * Verifica se o usuário está autenticado.
 * Se não estiver, redireciona para /login.
 * Se estiver, renderiza o conteúdo filho normalmente.
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function PrivateRoute({ children }) {
  const { isAuthenticated, authLoading } = useAuth();
  const location = useLocation();

  // Enquanto verifica autenticação inicial, mostra loading
  if (authLoading) {
    return (
      <div style={loadingStyles.container}>
        <div style={loadingStyles.spinner} />
        <p style={loadingStyles.text}>Verificando autenticação...</p>
      </div>
    );
  }

  // Não autenticado → redireciona para login, preservando a rota original
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Autenticado → renderiza o componente protegido
  return children;
}

// ─── Estilos do loading state ────────────────────────────────────────────────
const loadingStyles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'radial-gradient(circle at 10% 20%, #171822 0%, #0d0f14 90%)',
    gap: '16px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid rgba(106, 56, 227, 0.2)',
    borderTop: '3px solid #6A38E3',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  text: {
    color: '#8E9BAE',
    fontSize: '0.9rem',
    margin: 0,
  },
};

// Injeta a animação de spin globalmente (apenas uma vez)
if (!document.getElementById('private-route-spin')) {
  const style = document.createElement('style');
  style.id = 'private-route-spin';
  style.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
  document.head.appendChild(style);
}
