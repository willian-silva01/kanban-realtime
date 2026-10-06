import React, { useState, useRef, useEffect } from 'react';
import { Plus, Check, X } from 'lucide-react';
import api from '../../services/api';
import './AddColumnButton.css';

export default function AddColumnButton({ boardId, socket, onColumnCreated }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const reset = () => {
    setEditing(false);
    setName('');
    setError('');
  };

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Nome não pode ser vazio');
      return;
    }
    if (trimmed.length > 50) {
      setError('Nome deve ter no máximo 50 caracteres');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await api.post(`/boards/${boardId}/columns`, { name: trimmed });
      const column = res.data.data;
      socket?.emit('column:create', { boardId, column });
      onColumnCreated?.(column);
      reset();
    } catch (err) {
      const msg = err.response?.data?.message || 'Erro ao criar coluna';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      reset();
    }
  };

  if (!editing) {
    return (
      <button className="add-column-btn" onClick={() => setEditing(true)}>
        <Plus size={16} />
        Adicionar coluna
      </button>
    );
  }

  return (
    <div className="add-column-form">
      <input
        ref={inputRef}
        className={`add-column-input${error ? ' add-column-input--error' : ''}`}
        placeholder="Nome da coluna"
        value={name}
        onChange={(e) => { setName(e.target.value); setError(''); }}
        onKeyDown={handleKeyDown}
        disabled={loading}
        maxLength={51}
      />
      {error && <p className="add-column-error">{error}</p>}
      <div className="add-column-actions">
        <button
          className="add-column-confirm"
          onClick={handleSubmit}
          disabled={loading}
          title="Confirmar"
        >
          <Check size={14} />
          {loading ? '...' : 'Criar'}
        </button>
        <button
          className="add-column-cancel"
          onClick={reset}
          disabled={loading}
          title="Cancelar (Esc)"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
