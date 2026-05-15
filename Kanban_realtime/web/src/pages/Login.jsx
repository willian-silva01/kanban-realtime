/**
 * Login.jsx — Tela de Login (versão integrada ao AuthContext)
 * 
 * Features:
 * - Validação básica no frontend
 * - Feedback visual de loading e erro
 * - Redirecionamento automático para a rota protegida de origem
 * - Design glassmorphism consistente com o sistema
 * - Integração com AuthContext (usa login() centralizado)
 */

import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { login, isAuthenticated, authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Se já autenticado, redireciona direto para o board
  useEffect(() => {
    if (isAuthenticated) {
      const destination = location.state?.from?.pathname || '/board';
      navigate(destination, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  // ─── Validação local ─────────────────────────────────────────────────────
  const validate = () => {
    if (!email.trim()) return 'Email é obrigatório.';
    if (!/\S+@\S+\.\S+/.test(email)) return 'Email inválido.';
    if (!password) return 'Senha é obrigatória.';
    if (password.length < 6) return 'Senha deve ter ao menos 6 caracteres.';
    return null;
  };

  // ─── Submit ──────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    const result = await login({ email: email.trim().toLowerCase(), password });
    if (!result.success) {
      setError(result.message);
    }
    setIsSubmitting(false);
  };

  const isLoading = isSubmitting || authLoading;

  return (
    <div style={S.page}>
      {/* Fundo animado */}
      <div style={S.bgGlow1} />
      <div style={S.bgGlow2} />

      <div style={S.card} role="main">
        {/* Logo / Header */}
        <div style={S.logoArea}>
          <div style={S.logoIcon}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="7" height="11" rx="2" fill="#6A38E3" />
              <rect x="14" y="3" width="7" height="7" rx="2" fill="#A881FC" />
              <rect x="14" y="14" width="7" height="7" rx="2" fill="#6A38E3" opacity="0.6" />
            </svg>
          </div>
          <h1 style={S.title}>Bem-vindo de volta</h1>
          <p style={S.subtitle}>Entre na sua conta para acessar o Kanban</p>
        </div>

        {/* Alerta de erro */}
        {error && (
          <div style={S.errorBox} role="alert" aria-live="polite">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#ff7b72" style={{ flexShrink: 0 }}>
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleSubmit} style={S.form} noValidate>
          {/* Campo: Email */}
          <div style={S.fieldGroup}>
            <label htmlFor="login-email" style={S.label}>
              Email
            </label>
            <div style={S.inputWrapper}>
              <svg style={S.inputIcon} width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
              </svg>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                style={{ ...S.input, paddingLeft: '42px' }}
                disabled={isLoading}
                aria-label="Email"
              />
            </div>
          </div>

          {/* Campo: Senha */}
          <div style={S.fieldGroup}>
            <label htmlFor="login-password" style={S.label}>
              Senha
            </label>
            <div style={S.inputWrapper}>
              <svg style={S.inputIcon} width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 1C8.676 1 6 3.676 6 7v1H4v15h16V8h-2V7c0-3.324-2.676-6-6-6zm0 2c2.276 0 4 1.724 4 4v1H8V7c0-2.276 1.724-4 4-4zm0 9a2 2 0 1 1 0 4 2 2 0 0 1 0-4z"/>
              </svg>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{ ...S.input, paddingLeft: '42px', paddingRight: '44px' }}
                disabled={isLoading}
                aria-label="Senha"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={S.eyeBtn}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                tabIndex={-1}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Botão Submit */}
          <button
            id="login-submit-btn"
            type="submit"
            disabled={isLoading}
            style={isLoading ? { ...S.submitBtn, ...S.submitBtnDisabled } : S.submitBtn}
          >
            {isLoading ? (
              <span style={S.loadingRow}>
                <span style={S.btnSpinner} />
                Entrando...
              </span>
            ) : (
              'Entrar na Plataforma'
            )}
          </button>
        </form>

        {/* Rodapé */}
        <p style={S.footer}>
          Não tem uma conta?{' '}
          <Link to="/register" style={S.link} id="go-to-register-link">
            Cadastre-se grátis
          </Link>
        </p>
      </div>
    </div>
  );
}

// ─── Estilos ────────────────────────────────────────────────────────────────
const S = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'radial-gradient(circle at 10% 20%, #171822 0%, #0d0f14 90%)',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    padding: '20px',
    position: 'relative',
    overflow: 'hidden',
  },
  bgGlow1: {
    position: 'fixed',
    top: '-200px',
    left: '-200px',
    width: '500px',
    height: '500px',
    background: 'radial-gradient(circle, rgba(106,56,227,0.15) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  bgGlow2: {
    position: 'fixed',
    bottom: '-200px',
    right: '-200px',
    width: '500px',
    height: '500px',
    background: 'radial-gradient(circle, rgba(168,129,252,0.1) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  card: {
    position: 'relative',
    zIndex: 1,
    background: 'rgba(22, 25, 33, 0.85)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '20px',
    padding: '48px 40px',
    width: '100%',
    maxWidth: '440px',
    boxShadow: '0 32px 64px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(106,56,227,0.1)',
  },
  logoArea: {
    textAlign: 'center',
    marginBottom: '36px',
  },
  logoIcon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '56px',
    height: '56px',
    background: 'rgba(106, 56, 227, 0.15)',
    borderRadius: '16px',
    marginBottom: '16px',
    border: '1px solid rgba(106, 56, 227, 0.3)',
  },
  title: {
    color: '#F0F2F5',
    fontSize: '26px',
    fontWeight: '700',
    margin: '0 0 8px 0',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    color: '#8E9BAE',
    fontSize: '14px',
    margin: 0,
    lineHeight: 1.5,
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: 'rgba(248, 81, 73, 0.08)',
    color: '#ff7b72',
    padding: '12px 16px',
    borderRadius: '10px',
    border: '1px solid rgba(248, 81, 73, 0.25)',
    marginBottom: '24px',
    fontSize: '14px',
    lineHeight: 1.4,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    color: '#C9D1D9',
    fontSize: '13px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '14px',
    color: '#8E9BAE',
    pointerEvents: 'none',
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '13px 16px',
    borderRadius: '10px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    background: 'rgba(255, 255, 255, 0.04)',
    color: '#F0F2F5',
    fontSize: '15px',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    fontFamily: 'inherit',
  },
  eyeBtn: {
    position: 'absolute',
    right: '12px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    lineHeight: 1,
    padding: '4px',
    color: '#8E9BAE',
    display: 'flex',
    alignItems: 'center',
  },
  submitBtn: {
    background: 'linear-gradient(135deg, #6A38E3 0%, #8A5CF7 100%)',
    color: '#ffffff',
    padding: '14px',
    borderRadius: '10px',
    border: 'none',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '4px',
    transition: 'transform 0.15s, opacity 0.2s, box-shadow 0.2s',
    boxShadow: '0 4px 20px rgba(106, 56, 227, 0.4)',
    letterSpacing: '0.2px',
  },
  submitBtnDisabled: {
    opacity: 0.65,
    cursor: 'not-allowed',
    transform: 'none',
  },
  loadingRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
  },
  btnSpinner: {
    display: 'inline-block',
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTop: '2px solid #fff',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  },
  footer: {
    color: '#8E9BAE',
    textAlign: 'center',
    marginTop: '28px',
    fontSize: '14px',
  },
  link: {
    color: '#A881FC',
    textDecoration: 'none',
    fontWeight: '600',
    transition: 'color 0.2s',
  },
};
