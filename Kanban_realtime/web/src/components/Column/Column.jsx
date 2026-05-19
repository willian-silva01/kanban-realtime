import React, { useState, useRef, useEffect } from 'react';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Card from '../Card/Card';
import { Plus, Check, X } from 'lucide-react';
import api from '../../services/api';
import { useBoardStore } from '../../stores/boardStore';
import './Column.css';

function cardMatchesSearch(card, query) {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    card.title?.toLowerCase().includes(q) ||
    card.description?.toLowerCase().includes(q) ||
    card.labels?.some((l) => l.name?.toLowerCase().includes(q)) ||
    card.assignees?.some(
      (a) => a.name?.toLowerCase().includes(q) || a.email?.toLowerCase().includes(q)
    ) ||
    card.checklists?.some(
      (cl) =>
        cl.title?.toLowerCase().includes(q) ||
        cl.items?.some((item) => item.text?.toLowerCase().includes(q))
    )
  );
}

export default function Column({
  column,
  cards,
  socket,
  boardId,
  boardLabels,
  boardMembers,
  searchQuery,
  pendingCardIds,
  focusedCardId,
  onCardLabelChange,
  onBoardLabelChange,
  onDueDateChange,
  onAssigneeChange,
  onDescriptionChange,
  onChecklistChange,
}) {
  const { updateColumn } = useBoardStore();

  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [renameError, setRenameError] = useState('');
  const [renameLoading, setRenameLoading] = useState(false);
  const renameInputRef = useRef(null);

  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: column.id,
    data: { type: 'Column', column },
  });

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  };

  useEffect(() => {
    if (isRenaming) renameInputRef.current?.focus();
  }, [isRenaming]);

  const trimmedQuery = searchQuery?.trim() ?? '';
  const visibleCount = trimmedQuery
    ? cards.filter((c) => cardMatchesSearch(c, trimmedQuery)).length
    : cards.length;

  const startRename = () => {
    setRenameValue(column.name || column.title || '');
    setRenameError('');
    setIsRenaming(true);
  };

  const cancelRename = () => {
    setIsRenaming(false);
    setRenameError('');
  };

  const submitRename = async () => {
    const trimmed = renameValue.trim();
    if (!trimmed) {
      setRenameError('Nome não pode ser vazio');
      return;
    }
    if (trimmed.length > 50) {
      setRenameError('Nome deve ter no máximo 50 caracteres');
      return;
    }
    if (trimmed === (column.name || column.title)) {
      setIsRenaming(false);
      return;
    }

    setRenameLoading(true);
    setRenameError('');
    try {
      const res = await api.put(`/boards/${boardId}/columns/${column.id}`, { name: trimmed });
      const updated = res.data.data;
      updateColumn(updated);
      socket?.emit('column:update', { boardId, column: updated });
      setIsRenaming(false);
    } catch (err) {
      setRenameError(err.response?.data?.message || 'Erro ao renomear coluna');
    } finally {
      setRenameLoading(false);
    }
  };

  const handleRenameKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitRename();
    } else if (e.key === 'Escape') {
      cancelRename();
    }
  };

  return (
    <div ref={setNodeRef} style={style} className="column" {...attributes} {...listeners}>
      <div className="column-header">
        {isRenaming ? (
          <div className="column-rename-form" onPointerDown={(e) => e.stopPropagation()}>
            <input
              ref={renameInputRef}
              className={`column-rename-input${renameError ? ' column-rename-input--error' : ''}`}
              value={renameValue}
              onChange={(e) => {
                setRenameValue(e.target.value);
                setRenameError('');
              }}
              onKeyDown={handleRenameKeyDown}
              disabled={renameLoading}
              maxLength={51}
              data-testid="column-rename-input"
            />
            {renameError && <p className="column-rename-error">{renameError}</p>}
            <div className="column-rename-actions">
              <button
                className="column-rename-confirm"
                onClick={submitRename}
                disabled={renameLoading}
                title="Confirmar (Enter)"
              >
                <Check size={12} />
              </button>
              <button
                className="column-rename-cancel"
                onClick={cancelRename}
                disabled={renameLoading}
                title="Cancelar (Esc)"
              >
                <X size={12} />
              </button>
            </div>
          </div>
        ) : (
          <span
            className="column-title"
            onDoubleClick={startRename}
            title="Duplo clique para renomear"
            data-testid="column-title"
          >
            {column.name || column.title}
          </span>
        )}
        <span className="column-count">{visibleCount}</span>
      </div>

      <div className="column-content animate-slide">
        <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <Card
              key={card.id}
              card={card}
              socket={socket}
              boardId={boardId}
              boardLabels={boardLabels}
              boardMembers={boardMembers}
              isPending={pendingCardIds?.has(card.id) ?? false}
              isDimmed={trimmedQuery ? !cardMatchesSearch(card, trimmedQuery) : false}
              isFocused={focusedCardId === card.id}
              onCardLabelChange={onCardLabelChange}
              onBoardLabelChange={onBoardLabelChange}
              onDueDateChange={onDueDateChange}
              onAssigneeChange={onAssigneeChange}
              onDescriptionChange={onDescriptionChange}
              onChecklistChange={onChecklistChange}
            />
          ))}
        </SortableContext>
      </div>

      <button
        className="new-card-btn"
        data-add-card-col={column.id}
        onClick={() => alert('Adicionar card na API...')}
      >
        <Plus size={16} /> Add Card
      </button>
    </div>
  );
}
