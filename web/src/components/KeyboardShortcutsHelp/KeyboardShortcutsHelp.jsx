import React, { useEffect } from 'react';
import { X, Keyboard } from 'lucide-react';
import './KeyboardShortcutsHelp.css';

const SHORTCUTS = [
  { keys: ['Ctrl', 'F'], desc: 'Abrir busca global' },
  { keys: ['↑', '↓'], desc: 'Navegar entre cartões na coluna' },
  { keys: ['←', '→'], desc: 'Navegar entre colunas' },
  { keys: ['Enter'], desc: 'Abrir comentários do cartão focado' },
  { keys: ['N'], desc: 'Novo cartão na coluna focada' },
  { keys: ['Esc'], desc: 'Fechar painel / limpar busca / desfocalizar' },
  { keys: ['?'], desc: 'Exibir esta lista de atalhos' },
];

export default function KeyboardShortcutsHelp({ onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="shortcuts-overlay" onClick={onClose}>
      <div className="shortcuts-modal" onClick={(e) => e.stopPropagation()}>
        <div className="shortcuts-header">
          <Keyboard size={15} />
          <span>Atalhos de teclado</span>
          <button className="shortcuts-close" onClick={onClose} title="Fechar">
            <X size={13} />
          </button>
        </div>
        <ul className="shortcuts-list">
          {SHORTCUTS.map(({ keys, desc }) => (
            <li key={desc} className="shortcuts-item">
              <div className="shortcuts-keys">
                {keys.map((k, i) => (
                  <React.Fragment key={k}>
                    <kbd className="shortcuts-kbd">{k}</kbd>
                    {i < keys.length - 1 && <span className="shortcuts-plus">+</span>}
                  </React.Fragment>
                ))}
              </div>
              <span className="shortcuts-desc">{desc}</span>
            </li>
          ))}
        </ul>
        <div className="shortcuts-footer">Pressione <kbd className="shortcuts-kbd">?</kbd> para abrir/fechar</div>
      </div>
    </div>
  );
}
