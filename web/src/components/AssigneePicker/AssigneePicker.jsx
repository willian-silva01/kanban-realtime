import React, { useState } from 'react';
import api from '../../services/api';
import './AssigneePicker.css';

function getInitials(name) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

export default function AssigneePicker({
  cardId,
  boardId,
  boardMembers = [],
  cardAssignees = [],
  socket,
  onAssigneeChange,
  onClose,
}) {
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(null);

  const filtered = boardMembers.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase())
  );

  const isAssigned = (userId) => cardAssignees.some((a) => a.id === userId);

  const toggle = async (member) => {
    if (loading) return;
    setLoading(member.id);
    try {
      if (isAssigned(member.id)) {
        await api.delete(`/cards/${cardId}/assignees/${member.id}`);
        onAssigneeChange?.('remove', member.id);
        socket?.emit('card:assignee:removed', { boardId, cardId, userId: member.id });
      } else {
        await api.post(`/cards/${cardId}/assignees`, { userId: member.id });
        onAssigneeChange?.('add', member);
        socket?.emit('card:assignee:added', { boardId, cardId, assignee: member });
      }
    } catch (err) {
      console.error('Erro ao atualizar atribuição', err);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div
      className="assignee-picker"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="assignee-picker-header">
        <span className="assignee-picker-title">Atribuir membros</span>
        <button className="assignee-picker-close" onClick={onClose}>✕</button>
      </div>

      <input
        className="assignee-picker-search"
        type="text"
        placeholder="Buscar por nome ou e-mail..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        autoFocus
      />

      <div className="assignee-picker-list">
        {filtered.length === 0 && (
          <div className="assignee-picker-empty">Nenhum membro encontrado</div>
        )}
        {filtered.map((member) => {
          const assigned = isAssigned(member.id);
          const busy = loading === member.id;
          return (
            <button
              key={member.id}
              className={`assignee-picker-item ${assigned ? 'assigned' : ''}`}
              onClick={() => toggle(member)}
              disabled={busy}
            >
              <span className="assignee-avatar assignee-avatar--sm">
                {getInitials(member.name)}
              </span>
              <span className="assignee-info">
                <span className="assignee-name">{member.name}</span>
                <span className="assignee-email">{member.email}</span>
              </span>
              {assigned && <span className="assignee-check">✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
