/**
 * Register.jsx — Tela de Cadastro (integrada ao AuthContext)
 *
 * Features:
 * - Validação completa no frontend (nome, email, senha, confirmação)
 * - Feedback de força da senha
 * - Loading state e tratamento de erros da API
 * - Redireciona para /dashboard após cadastro bem-sucedido
 * - Design glassmorphism consistente com o Login
 */

import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// ─── Utilitário: avaliar força da senha ──────────────────────────────────────
function passwordStrength(pwd) {
  if (!pwd) return { score: 0, label: '', color: 'transparent' };
  let score = 0;
  if (pwd.length >= 6) score++;
  if (pwd.length >= 10) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;

  const map = [
    { label: '', color: 'transparent' },
    { label: 'Muito fraca', color: '#E3384D' },
    { label: 'Fraca', color: '#F97316' },
    { label: 'Razoável', color: '#EAB308' },
    { label: 'Boa', color: '#22C55E' },
    { label: 'Excelente', color: '#10B981' },
  ];
  return { score, ...map[score] };
}

export default function Register() {
  const { register, isAuthenticated, authLoading } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pwStrength = passwordStrength(password);

  // Redireciona se já autenticado
  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, navigate]);

  // ─── Validação local ─────────────────────────────────────────────────────
  const validate = () => {
    if (!name.trim() || name.trim().length < 2)
      return 'Nome deve ter ao menos 2 caracteres.';
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email))
      return 'Informe um e-mail válido.';
    if (password.length < 6)
      return 'Senha deve ter ao menos 6 caracteres.';
    if (password !== confirmPassword)
      return 'As senhas não coincidem.';
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
    const result = await register({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
    });
    if (!result.success) {
      setError(result.message);
    }
    setIsSubmitting(false);
  };

  const isLoading = isSubmitting || authLoading;

  return (
    <div style={S.page}>
      <div style={S.bgGlow1} />
      <div style={S.bgGlow2} />

      <div style={S.card} role="main">
        {/* Header */}
        <div style={S.logoArea}>
          <div style={S.logoIcon}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="7" height="11" rx="2" fill="#6A38E3" />
              <rect x="14" y="3" width="7" height="7" rx="2" fill="#A881FC" />
              <rect x="14" y="14" width="7" height="7" rx="2" fill="#6A38E3" opacity="0.6" />
            </svg>
          </div>
          <h1 style={S.title}>Criar sua conta</h1>
          <p style={S.subtitle}>Comece a colaborar em Kanbans em tempo real</p>
        </div>

        {/* Erro */}
        {error && (
          <div style={S.errorBox} role="alert">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#ff7b72" style={{ flexShrink: 0 }}>
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleSubmit} style={S.form} noValidate>
          {/* Nome */}
          <div style={S.fieldGroup}>
            <label htmlFor="register-name" style={S.label}>Nome Completo</label>
            <div style={S.inputWrapper}>
              <svg style={S.inputIcon} width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v2h20v-2c0-3.3-6.7-5-10-5z"/>
              </svg>
              <input
                id="register-name"
                type="text"
                autoComplete="name"
                required
                minLength={2}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Maria Silva"
                style={{ ...S.input, paddingLeft: '42px' }}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Email */}
          <div style={S.fieldGroup}>
            <label htmlFor="register-email" style={S.label}>Email</label>
            <div style={S.inputWrapper}>
              <svg style={S.inputIcon} width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
              </svg>
              <input
                id="register-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                style={{ ...S.input, paddingLeft: '42px' }}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Senha */}
          <div style={S.fieldGroup}>
            <label htmlFor="register-password" style={S.label}>Senha</label>
            <div style={S.inputWrapper}>
              <svg style={S.inputIcon} width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 1C8.676 1 6 3.676 6 7v1H4v15h16V8h-2V7c0-3.324-2.676-6-6-6zm0 2c2.276 0 4 1.724 4 4v1H8V7c0-2.276 1.724-4 4-4zm0 9a2 2 0 1 1 0 4 2 2 0 0 1 0-4z"/>
              </svg>
              <input
                id="register-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                style={{ ...S.input, paddingLeft: '42px', paddingRight: '44px' }}
                disabled={isLoading}
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

            {/* Barra de força da senha */}
            {password && (
              <div style={S.strengthArea}>
                <div style={S.strengthBar}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      style={{
                        ...S.strengthSegment,
                        background: i <= pwStrength.score ? pwStrength.color : 'rgba(255,255,255,0.07)',
                        transition: 'background 0.3s',
                      }}
                    />
                  ))}
                </div>
                {pwStrength.label && (
                  <span style={{ ...S.strengthLabel, color: pwStrength.color }}>
                    {pwStrength.label}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Confirmar Senha */}
          <div style={S.fieldGroup}>
            <label htmlFor="register-confirm" style={S.label}>Confirmar Senha</label>
            <div style={S.inputWrapper}>
              <svg style={S.inputIcon} width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 1C8.676 1 6 3.676 6 7v1H4v15h16V8h-2V7c0-3.324-2.676-6-6-6zm0 2c2.276 0 4 1.724 4 4v1H8V7c0-2.276 1.724-4 4-4zm0 9a2 2 0 1 1 0 4 2 2 0 0 1 0-4z"/>
              </svg>
              <input
                id="register-confirm"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a senha"
                style={{
                  ...S.input,
                  paddingLeft: '42px',
                  borderColor:
                    confirmPassword && confirmPassword !== password
                      ? 'rgba(227, 56, 77, 0.5)'
                      : confirmPassword && confirmPassword === password
                      ? 'rgba(34, 197, 94, 0.5)'
                      : undefined,
                }}
                disabled={isLoading}
              />
              {confirmPassword && (
                <span style={S.confirmIcon}>
                  {confirmPassword === password ? '✅' : '❌'}
                </span>
              )}
            </div>
          </div>

          {/* Termos */}
          <p style={S.terms}>
            Ao criar sua conta, você concorda com os{' '}
            <span style={S.termLink}>Termos de Uso</span> e{' '}
            <span style={S.termLink}>Política de Privacidade</span>.
          </p>

          {/* Botão */}
          <button
            id="register-submit-btn"
            type="submit"
            disabled={isLoading}
            style={isLoading ? { ...S.submitBtn, ...S.submitBtnDisabled } : S.submitBtn}
          >
            {isLoading ? (
              <span style={S.loadingRow}>
                <span style={S.btnSpinner} />
                Criando conta...
              </span>
            ) : (
              '🚀 Criar Conta Grátis'
            )}
          </button>
        </form>

        {/* Rodapé */}
        <p style={S.footer}>
          Já tem uma conta?{' '}
          <Link to="/login" style={S.link} id="go-to-login-link">
            Faça login
          </Link>
        </p>
      </div>
    </div>
  );
}

// ─── Estilos ─────────────────────────────────────────────────────────────────
const S = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'radial-gradient(circle at 10% 20%, var(--body-bg-start) 0%, var(--body-bg-end) 90%)',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    padding: '20px',
    position: 'relative',
    overflow: 'hidden',
  },
  bgGlow1: {
    position: 'fixed',
    top: '-200px',
    right: '-200px',
    width: '500px',
    height: '500px',
    background: 'radial-gradient(circle, rgba(168,129,252,0.12) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  bgGlow2: {
    position: 'fixed',
    bottom: '-150px',
    left: '-150px',
    width: '400px',
    height: '400px',
    background: 'radial-gradient(circle, rgba(106,56,227,0.1) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  card: {
    position: 'relative',
    zIndex: 1,
    background: 'var(--surface-1)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid var(--card-border)',
    borderRadius: '20px',
    padding: '48px 40px',
    width: '100%',
    maxWidth: '460px',
    boxShadow: '0 32px 64px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(106,56,227,0.1)',
  },
  logoArea: { textAlign: 'center', marginBottom: '32px' },
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
    color: 'var(--text-primary)',
    fontSize: '26px',
    fontWeight: '700',
    margin: '0 0 8px 0',
    letterSpacing: '-0.5px',
  },
  subtitle: { color: 'var(--text-secondary)', fontSize: '14px', margin: 0, lineHeight: 1.5 },
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
  },
  form: { display: 'flex', flexDirection: 'column', gap: '18px' },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: {
    color: 'var(--text-primary)',
    fontSize: '13px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  inputWrapper: { position: 'relative', display: 'flex', alignItems: 'center' },
  inputIcon: { position: 'absolute', left: '14px', color: 'var(--text-secondary)', pointerEvents: 'none' },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '13px 16px',
    borderRadius: '10px',
    border: '1px solid var(--card-border)',
    background: 'var(--input-bg)',
    color: 'var(--input-color)',
    fontSize: '15px',
    outline: 'none',
    transition: 'border-color 0.2s',
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
    color: 'var(--text-secondary)',
  },
  confirmIcon: {
    position: 'absolute',
    right: '12px',
    fontSize: '14px',
    pointerEvents: 'none',
  },
  strengthArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginTop: '6px',
  },
  strengthBar: {
    display: 'flex',
    gap: '4px',
    flex: 1,
  },
  strengthSegment: {
    flex: 1,
    height: '4px',
    borderRadius: '2px',
  },
  strengthLabel: {
    fontSize: '12px',
    fontWeight: '600',
    whiteSpace: 'nowrap',
  },
  terms: {
    color: 'var(--text-secondary)',
    fontSize: '12px',
    margin: '0',
    lineHeight: 1.5,
  },
  termLink: {
    color: '#A881FC',
    cursor: 'pointer',
    textDecoration: 'underline',
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
    transition: 'transform 0.15s, opacity 0.2s',
    boxShadow: '0 4px 20px rgba(106, 56, 227, 0.4)',
    letterSpacing: '0.2px',
  },
  submitBtnDisabled: { opacity: 0.65, cursor: 'not-allowed' },
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
  footer: { color: 'var(--text-secondary)', textAlign: 'center', marginTop: '28px', fontSize: '14px' },
  link: { color: '#A881FC', textDecoration: 'none', fontWeight: '600' },
};
