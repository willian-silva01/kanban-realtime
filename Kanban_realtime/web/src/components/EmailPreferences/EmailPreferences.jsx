import { useEffect, useState } from 'react';
import './EmailPreferences.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const PREFS = [
  { key: 'emailMentions',    label: 'Menções em comentários',       desc: 'Quando alguém mencionar você com @' },
  { key: 'emailAssigned',    label: 'Atribuição a cartões',         desc: 'Quando você for adicionado a um cartão' },
  { key: 'emailDueDate',     label: 'Lembretes de prazo',           desc: 'Cartões vencendo em menos de 24h' },
  { key: 'emailBoardInvite', label: 'Convites para boards/workspaces', desc: 'Quando você for adicionado a um board ou workspace' },
];

export default function EmailPreferences({ onClose }) {
  const [prefs, setPrefs] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    fetch(`${API}/api/users/me/email-preferences`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((r) => r.success && setPrefs(r.data))
      .catch(() => setError('Erro ao carregar preferências.'));
  }, []);

  const toggle = async (key) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    setSaving(true);
    try {
      const token = localStorage.getItem('accessToken');
      await fetch(`${API}/api/users/me/email-preferences`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ [key]: next[key] }),
      });
    } catch {
      setError('Erro ao salvar.');
      setPrefs(prefs); // rollback
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ep-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ep-modal" role="dialog" aria-label="Preferências de e-mail">
        <div className="ep-header">
          <div>
            <h3 className="ep-title">Preferências de e-mail</h3>
            <p className="ep-subtitle">Escolha quais notificações receber por e-mail</p>
          </div>
          <button className="ep-close" onClick={onClose} aria-label="Fechar">✕</button>
        </div>

        {error && <p className="ep-error">{error}</p>}

        {!prefs ? (
          <div className="ep-loading">Carregando…</div>
        ) : (
          <ul className="ep-list">
            {PREFS.map(({ key, label, desc }) => (
              <li key={key} className="ep-item">
                <div className="ep-item-text">
                  <span className="ep-item-label">{label}</span>
                  <span className="ep-item-desc">{desc}</span>
                </div>
                <button
                  className={`ep-toggle ${prefs[key] ? 'ep-toggle--on' : ''}`}
                  onClick={() => toggle(key)}
                  disabled={saving}
                  aria-label={prefs[key] ? 'Desativar' : 'Ativar'}
                  role="switch"
                  aria-checked={prefs[key]}
                >
                  <span className="ep-toggle-thumb" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <p className="ep-note">
          Você também pode cancelar um tipo de e-mail pelo link de unsubscribe em qualquer mensagem recebida.
        </p>
      </div>
    </div>
  );
}
