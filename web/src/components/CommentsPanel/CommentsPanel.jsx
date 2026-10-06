import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import api from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import './CommentsPanel.css';

const PRESET_EMOJIS = ['👍', '❤️', '🎉', '😄', '🤔', '😕'];

// Renderiza @[uuid] como chips clicáveis com o nome do membro
function renderContent(content, boardMembers) {
  if (!content) return null;
  const parts = content.split(/(@\[[0-9a-f-]{36}\])/gi);
  return parts.map((part, i) => {
    const match = part.match(/^@\[([0-9a-f-]{36})\]$/i);
    if (match) {
      const member = boardMembers.find((m) => m.id === match[1]);
      const name = member?.name ?? 'alguém';
      return (
        <span key={i} className="mention-chip" title={member?.email}>
          @{name}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export default function CommentsPanel({ cardId, socket, boardMembers = [], toggleRef }) {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // Expõe a função de toggle para o card pai (atalho Enter)
  useEffect(() => {
    if (toggleRef) toggleRef.current = () => setIsOpen((v) => !v);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Mention dropdown state
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStart, setMentionStart] = useState(-1);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownIndex, setDropdownIndex] = useState(0);

  const textareaRef = useRef(null);

  // ─── 1. Carregar via REST ──────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || !cardId) return;
    setIsLoading(true);
    api
      .get(`/cards/${cardId}/comments`)
      .then((res) => res.data)
      .then((data) => { if (data.success && data.data) setComments(data.data); })
      .catch((err) => { if (err.response?.status !== 401) console.error('[CommentsPanel]', err.message); })
      .finally(() => setIsLoading(false));
  }, [cardId, isOpen]);

  // ─── 2. WebSocket comment:create ──────────────────────────────────
  useEffect(() => {
    if (!socket || !isOpen) return;
    const handle = (payload) => {
      if (payload.cardId === cardId) {
        setComments((prev) => {
          const exists = prev.some((c) => c.id === payload.comment.id);
          return exists ? prev : [{ ...payload.comment, reactions: [] }, ...prev];
        });
      }
    };
    socket.on('comment:create', handle);
    return () => socket.off('comment:create', handle);
  }, [socket, cardId, isOpen]);

  // ─── 3. WebSocket comment:reaction:updated ────────────────────────
  useEffect(() => {
    if (!socket || !isOpen) return;
    const handle = ({ cardId: eventCardId, commentId, reactions }) => {
      if (eventCardId !== cardId) return;
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, reactions } : c))
      );
    };
    socket.on('comment:reaction:updated', handle);
    return () => socket.off('comment:reaction:updated', handle);
  }, [socket, cardId, isOpen]);

  // ─── 4. Toggle reação ─────────────────────────────────────────────
  const handleReaction = useCallback(async (commentId, emoji) => {
    try {
      const resp = await api.post(`/cards/${cardId}/comments/${commentId}/reactions`, { emoji });
      if (resp.data.success) {
        setComments((prev) =>
          prev.map((c) => (c.id === commentId ? { ...c, reactions: resp.data.data } : c))
        );
      }
    } catch (err) {
      if (err.response?.status !== 401) console.error('[CommentsPanel] Reação:', err.message);
    }
  }, [cardId]);

  // ─── 5. Filtrar membros pelo query da menção ───────────────────────
  const filteredMembers = dropdownOpen
    ? boardMembers.filter((m) =>
        m.name.toLowerCase().includes(mentionQuery.toLowerCase()) ||
        m.email.toLowerCase().includes(mentionQuery.toLowerCase())
      ).slice(0, 6)
    : [];

  // ─── 6. Detectar @ no textarea ────────────────────────────────────
  const handleTextareaChange = useCallback((e) => {
    const value = e.target.value;
    const cursor = e.target.selectionStart;
    setNewComment(value);

    const textBeforeCursor = value.slice(0, cursor);
    const atIndex = textBeforeCursor.lastIndexOf('@');

    if (atIndex !== -1) {
      const fragment = textBeforeCursor.slice(atIndex + 1);
      if (!fragment.includes(' ')) {
        setMentionStart(atIndex);
        setMentionQuery(fragment);
        setDropdownOpen(true);
        setDropdownIndex(0);
        return;
      }
    }
    setDropdownOpen(false);
    setMentionStart(-1);
    setMentionQuery('');
  }, []);

  // ─── 7. Inserir menção no texto ────────────────────────────────────
  const insertMention = useCallback((member) => {
    if (!textareaRef.current) return;
    const cursor = textareaRef.current.selectionStart;
    const before = newComment.slice(0, mentionStart);
    const after = newComment.slice(cursor);
    const inserted = `@[${member.id}] `;
    const next = before + inserted + after;
    setNewComment(next);
    setDropdownOpen(false);
    setMentionStart(-1);
    setMentionQuery('');
    requestAnimationFrame(() => {
      const pos = before.length + inserted.length;
      textareaRef.current?.setSelectionRange(pos, pos);
      textareaRef.current?.focus();
    });
  }, [newComment, mentionStart]);

  // ─── 8. Enviar comentário ─────────────────────────────────────────
  const handlePost = useCallback(async (e) => {
    e?.preventDefault();
    const text = newComment.trim();
    if (!text || isSending) return;
    setIsSending(true);
    try {
      const resp = await api.post(`/cards/${cardId}/comments`, { content: text });
      if (resp.data.success) setNewComment('');
    } catch (err) {
      if (err.response?.status !== 401) console.error('[CommentsPanel] Erro ao enviar:', err.message);
    } finally {
      setIsSending(false);
      textareaRef.current?.focus();
    }
  }, [newComment, isSending, cardId]);

  // ─── 9. Teclado no textarea ───────────────────────────────────────
  const handleKeyDown = useCallback((e) => {
    e.stopPropagation();

    if (dropdownOpen && filteredMembers.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setDropdownIndex((i) => Math.min(i + 1, filteredMembers.length - 1)); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setDropdownIndex((i) => Math.max(i - 1, 0)); return; }
      if (e.key === 'Tab' || (e.key === 'Enter' && dropdownOpen)) {
        e.preventDefault();
        insertMention(filteredMembers[dropdownIndex]);
        return;
      }
      if (e.key === 'Escape') { setDropdownOpen(false); return; }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handlePost();
    }
  }, [dropdownOpen, filteredMembers, dropdownIndex, insertMention, handlePost]);

  const toggleLabel = isOpen
    ? 'Ocultar'
    : `Ver Comentários${comments.length > 0 ? ` (${comments.length})` : ''}`;

  return (
    <div style={{ marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 10 }}>
      <button
        onClick={() => setIsOpen((v) => !v)}
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          background: 'none', border: 'none', color: 'var(--text-secondary)',
          fontSize: '0.8rem', cursor: 'pointer', display: 'flex',
          alignItems: 'center', gap: 6, padding: 0,
        }}
      >
        <MessageSquare size={14} />
        {toggleLabel}
      </button>

      {isOpen && (
        <div
          className="comments-area"
          style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {/* Lista de comentários */}
          <div style={{ maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, paddingRight: 4 }}>
            {isLoading && <span style={{ fontSize: '0.75rem', color: 'gray' }}>Carregando...</span>}
            {!isLoading && comments.length === 0 && (
              <span style={{ fontSize: '0.75rem', color: 'gray' }}>Nenhum comentário.</span>
            )}
            {comments.map((c) => (
              <div key={c.id} style={{ background: 'rgba(0,0,0,0.2)', padding: 8, borderRadius: 6 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--brand)', marginBottom: 2 }}>
                  {c.user?.name || 'Usuário'}
                </div>
                <div style={{ fontSize: '0.8rem', lineHeight: 1.3, wordBreak: 'break-word' }}>
                  {renderContent(c.content, boardMembers)}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                  {new Date(c.createdAt).toLocaleString()}
                </div>

                {/* ── Barra de reações ──────────────────────── */}
                <div className="reaction-bar">
                  {PRESET_EMOJIS.map((emoji) => {
                    const group = c.reactions?.find((r) => r.emoji === emoji);
                    const reacted = group?.users?.includes(currentUserId) ?? false;
                    return (
                      <button
                        key={emoji}
                        className={`reaction-btn${reacted ? ' reaction-btn--active' : ''}`}
                        onClick={() => handleReaction(c.id, emoji)}
                        title={emoji}
                      >
                        <span className="reaction-emoji">{emoji}</span>
                        {group && group.count > 0 && (
                          <span className="reaction-count">{group.count}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Formulário de envio com dropdown de menção */}
          <div style={{ position: 'relative' }}>
            {dropdownOpen && filteredMembers.length > 0 && (
              <div className="mention-dropdown">
                {filteredMembers.map((m, i) => (
                  <div
                    key={m.id}
                    className={`mention-dropdown-item${i === dropdownIndex ? ' mention-dropdown-item--active' : ''}`}
                    onMouseDown={(e) => { e.preventDefault(); insertMention(m); }}
                    onMouseEnter={() => setDropdownIndex(i)}
                  >
                    <span className="mention-dropdown-avatar">{m.name[0]?.toUpperCase()}</span>
                    <span className="mention-dropdown-name">{m.name}</span>
                    <span className="mention-dropdown-email">{m.email}</span>
                  </div>
                ))}
              </div>
            )}

            <form style={{ display: 'flex', gap: 4 }} onSubmit={handlePost}>
              <textarea
                ref={textareaRef}
                value={newComment}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                placeholder="Escreva um comentário — @ para mencionar"
                disabled={isSending}
                style={{
                  flex: 1, background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)', color: 'white',
                  borderRadius: 4, padding: '4px 8px', fontSize: '0.8rem',
                  outline: 'none', resize: 'none', minHeight: '32px',
                  fontFamily: 'inherit', opacity: isSending ? 0.6 : 1,
                }}
                rows={1}
              />
              <button
                type="submit"
                disabled={isSending || !newComment.trim()}
                style={{
                  background: 'var(--brand)', border: 'none', borderRadius: 4,
                  padding: '0 10px', color: 'white',
                  cursor: isSending ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center',
                  opacity: isSending || !newComment.trim() ? 0.5 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
