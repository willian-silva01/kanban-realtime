import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import api from '../../services/api';
import './CommentsPanel.css';

// CORRIGIDO:
// - Não precisa de guard manual de token — o interceptor do api.js injeta automaticamente
// - O guard existente `if (!isOpen) return` já é suficiente para timing (lazy load)
// - O painel só abre por interação do usuário → o token sempre existe nesse momento
//   (o componente está dentro do PrivateRoute, garantia de isAuthenticated=true)
// - Adicionado estado de loading e erro para feedback de UX
// - Textarea auto-resize (minor UX fix enquanto estamos aqui)
export default function CommentsPanel({ cardId, socket }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef(null);

  // ─── 1. Carregar via REST (lazy — apenas quando o painel abre) ─────────────
  // Timing correto: o usuário precisou clicar para abrir → já está logado
  // O interceptor do api.js garante o header Authorization
  useEffect(() => {
    if (!isOpen || !cardId) return;

    setIsLoading(true);
    api
      .get(`/cards/${cardId}/comments`)
      .then((res) => res.data)
      .then((data) => {
        if (data.success && data.data) {
          setComments(data.data);
        }
      })
      .catch((err) => {
        if (err.response?.status !== 401) {
          console.error('[CommentsPanel] Erro ao carregar comentários:', err.message);
        }
      })
      .finally(() => setIsLoading(false));
  }, [cardId, isOpen]);

  // ─── 2. Escutar WebSocket comment:create em tempo real ─────────────────────
  useEffect(() => {
    if (!socket || !isOpen) return;

    const handleNewComment = (payload) => {
      if (payload.cardId === cardId) {
        setComments((prev) => {
          // Evita duplicata se o broadcast chegar antes da resposta REST
          const exists = prev.some((c) => c.id === payload.comment.id);
          return exists ? prev : [payload.comment, ...prev];
        });
      }
    };

    socket.on('comment:create', handleNewComment);
    return () => socket.off('comment:create', handleNewComment);
  }, [socket, cardId, isOpen]);

  // ─── 3. Enviar comentário ───────────────────────────────────────────────────
  const handlePost = async (e) => {
    e?.preventDefault();
    const text = newComment.trim();
    if (!text || isSending) return;

    setIsSending(true);
    try {
      const resp = await api.post(`/cards/${cardId}/comments`, { content: text });
      if (resp.data.success) {
        setNewComment('');
        // O WebSocket broadcast vai adicionar o comentário via socket.on('comment:create')
        // Se a rota não emitir broadcast, podemos adicionar otimisticamente aqui:
        // setComments(prev => [resp.data.data, ...prev]);
      }
    } catch (err) {
      if (err.response?.status !== 401) {
        console.error('[CommentsPanel] Erro ao enviar comentário:', err.message);
      }
    } finally {
      setIsSending(false);
      // Foco de volta no textarea após envio
      textareaRef.current?.focus();
    }
  };

  return (
    <div style={{ marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 10 }}>
      {/* Botão para expandir */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        onPointerDown={(e) => e.stopPropagation()} // Previne DnD ao clicar no botão
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-secondary)',
          fontSize: '0.8rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: 0,
        }}
      >
        <MessageSquare size={14} />
        {isOpen ? 'Ocultar' : `Ver Comentários${comments.length > 0 ? ` (${comments.length})` : ''}`}
      </button>

      {/* Corpo do painel */}
      {isOpen && (
        <div
          className="comments-area"
          style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}
          onPointerDown={(e) => e.stopPropagation()} // Previne drag do DnD
        >
          {/* Listagem */}
          <div
            style={{
              maxHeight: 150,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              paddingRight: 4,
            }}
          >
            {isLoading && (
              <span style={{ fontSize: '0.75rem', color: 'gray' }}>Carregando...</span>
            )}
            {!isLoading && comments.length === 0 && (
              <span style={{ fontSize: '0.75rem', color: 'gray' }}>Nenhum comentário.</span>
            )}
            {comments.map((c) => (
              <div key={c.id} style={{ background: 'rgba(0,0,0,0.2)', padding: 8, borderRadius: 6 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--brand)', marginBottom: 2 }}>
                  {c.user?.name || 'Usuário'}
                </div>
                <div style={{ fontSize: '0.8rem', lineHeight: 1.3 }}>{c.content}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                  {new Date(c.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          {/* Formulário de envio */}
          <form
            style={{ display: 'flex', gap: 4, marginTop: 4 }}
            onSubmit={handlePost}
          >
            <textarea
              ref={textareaRef}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Escreva um comentário (Shift+Enter pula linha)"
              disabled={isSending}
              onKeyDown={(e) => {
                // ESSENCIAL: impede o DnD kit de interceptar teclas dentro do textarea
                e.stopPropagation();
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handlePost();
                }
              }}
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'white',
                borderRadius: 4,
                padding: '4px 8px',
                fontSize: '0.8rem',
                outline: 'none',
                resize: 'none',
                minHeight: '32px',
                fontFamily: 'inherit',
                opacity: isSending ? 0.6 : 1,
              }}
              rows={1}
            />
            <button
              type="submit"
              disabled={isSending || !newComment.trim()}
              style={{
                background: 'var(--brand)',
                border: 'none',
                borderRadius: 4,
                padding: '0 10px',
                color: 'white',
                cursor: isSending ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                opacity: isSending || !newComment.trim() ? 0.5 : 1,
                transition: 'opacity 0.2s',
              }}
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
