import React, { useState, useEffect, useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { useBoardStore } from '../../stores/boardStore';
import { CSS } from '@dnd-kit/utilities';
import { Tag, Calendar, Users, RefreshCw, FileText, CheckSquare } from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import CommentsPanel from '../CommentsPanel/CommentsPanel';
import LabelPicker from '../LabelPicker/LabelPicker';
import AssigneePicker from '../AssigneePicker/AssigneePicker';
import MarkdownEditor from '../MarkdownEditor/MarkdownEditor';
import ChecklistEditor from '../ChecklistEditor/ChecklistEditor';
import api from '../../services/api';
import './Card.css';
import '../AssigneePicker/AssigneePicker.css';

marked.use({ breaks: true, gfm: true });

function getDueDateStatus(dueDate) {
  if (!dueDate) return null;
  const diff = new Date(dueDate) - Date.now();
  if (diff < 0) return 'overdue';
  if (diff < 86400000) return 'soon';
  return 'ok';
}

function formatDueDate(dueDate) {
  const d = new Date(dueDate);
  return (
    d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) +
    ' ' +
    d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  );
}

function toDatetimeLocal(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function getInitials(name) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

export default function Card({
  card,
  isOverlay,
  isPending = false,
  isDimmed = false,
  isFocused = false,
  socket,
  boardId,
  boardLabels = [],
  boardMembers = [],
  onCardLabelChange,
  onBoardLabelChange,
  onDueDateChange,
  onAssigneeChange,
  onDescriptionChange,
  onChecklistChange,
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [assigneePickerOpen, setAssigneePickerOpen] = useState(false);
  const [dueDatePickerOpen, setDueDatePickerOpen] = useState(false);
  const [descEditorOpen, setDescEditorOpen] = useState(false);
  const [dueDateInput, setDueDateInput] = useState('');
  const [checklistEditorOpen, setChecklistEditorOpen] = useState(false);
  const [savingDueDate, setSavingDueDate] = useState(false);
  const [savingDescription, setSavingDescription] = useState(false);

  const escapeSeq = useBoardStore((s) => s.escapeSeq);
  const openCommentsPanelSeq = useBoardStore((s) => s.openCommentsPanelSeq);
  const cardDomRef = useRef(null);
  const commentsToggleRef = useRef(null);

  // Fechar todos os painéis quando Esc é pressionado globalmente
  useEffect(() => {
    if (escapeSeq === 0) return;
    setPickerOpen(false);
    setAssigneePickerOpen(false);
    setDueDatePickerOpen(false);
    setDescEditorOpen(false);
    setChecklistEditorOpen(false);
  }, [escapeSeq]);

  // Abrir/fechar CommentsPanel via atalho Enter
  useEffect(() => {
    if (openCommentsPanelSeq.cardId === card.id && openCommentsPanelSeq.seq > 0) {
      commentsToggleRef.current?.();
    }
  }, [openCommentsPanelSeq]); // eslint-disable-line react-hooks/exhaustive-deps

  // Rolar para o card focado
  useEffect(() => {
    if (isFocused && cardDomRef.current) {
      cardDomRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [isFocused]);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: 'Card', card },
  });

  const mergedRef = (node) => {
    setNodeRef(node);
    cardDomRef.current = node;
  };

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  };

  const classNames = [
    'card',
    isOverlay ? 'card-ghost' : '',
    isDimmed ? 'card-dimmed' : '',
    isFocused ? 'card--focused' : '',
  ].filter(Boolean).join(' ');
  const cardLabels = card.labels ?? [];
  const cardAssignees = card.assignees ?? [];
  const cardChecklists = card.checklists ?? [];
  const dueDateStatus = getDueDateStatus(card.dueDate);

  const checklistTotalItems = cardChecklists.reduce((s, cl) => s + (cl.items?.length ?? 0), 0);
  const checklistDoneItems = cardChecklists.reduce(
    (s, cl) => s + (cl.items?.filter((i) => i.completed).length ?? 0),
    0
  );

  const togglePicker = (e) => {
    e.stopPropagation();
    setPickerOpen((v) => !v);
    if (!pickerOpen) setAssigneePickerOpen(false);
  };

  const toggleAssigneePicker = (e) => {
    e.stopPropagation();
    setAssigneePickerOpen((v) => !v);
    if (!assigneePickerOpen) setPickerOpen(false);
  };

  const openDueDatePicker = (e) => {
    e.stopPropagation();
    setDueDateInput(toDatetimeLocal(card.dueDate));
    setDueDatePickerOpen((v) => !v);
  };

  const handleDueDateSave = async (dueDate) => {
    setSavingDueDate(true);
    try {
      const res = await api.put(`/cards/${card.id}`, { dueDate });
      const updated = res.data.data;
      onDueDateChange?.(card.id, updated.dueDate ?? null);
      socket?.emit('card:duedate:updated', { boardId, cardId: card.id, dueDate: updated.dueDate ?? null });
      setDueDatePickerOpen(false);
    } catch (err) {
      console.error('Erro ao salvar prazo', err);
    } finally {
      setSavingDueDate(false);
    }
  };

  const handleDescriptionSave = async (description) => {
    setSavingDescription(true);
    try {
      await api.put(`/cards/${card.id}`, { description });
      onDescriptionChange?.(card.id, description);
      socket?.emit('card:description:updated', { boardId, cardId: card.id, description });
    } catch (err) {
      console.error('Erro ao salvar descrição', err);
    } finally {
      setSavingDescription(false);
    }
  };

  const toggleDescEditor = (e) => {
    e.stopPropagation();
    setDescEditorOpen((v) => !v);
    if (!descEditorOpen) {
      setPickerOpen(false);
      setAssigneePickerOpen(false);
    }
  };

  const toggleChecklistEditor = (e) => {
    e.stopPropagation();
    setChecklistEditorOpen((v) => !v);
  };

  return (
    <div ref={mergedRef} style={style} className={classNames} {...attributes} {...listeners}>
      {isPending && (
        <div className="card-pending-badge" title="Aguardando sincronização...">
          <RefreshCw size={10} className="card-pending-icon" />
        </div>
      )}
      {/* Label chips */}
      {cardLabels.length > 0 && (
        <div className="card-labels" onPointerDown={(e) => e.stopPropagation()}>
          {cardLabels.map((label) => (
            <span
              key={label.id}
              className="card-label-chip"
              style={{ background: label.color }}
              title={label.name}
            >
              {label.name}
            </span>
          ))}
        </div>
      )}

      <div className="card-title">{card.title}</div>
      {card.description && !descEditorOpen && (
        <div
          className="card-desc card-desc--md"
          dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize(marked.parse(card.description)),
          }}
        />
      )}

      {/* Due date badge */}
      {card.dueDate && (
        <div
          className={`card-duedate card-duedate--${dueDateStatus}`}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Calendar size={11} />
          {formatDueDate(card.dueDate)}
        </div>
      )}

      {/* Checklist progress badge */}
      {checklistTotalItems > 0 && (
        <div
          className={`card-checklist-badge ${checklistDoneItems === checklistTotalItems ? 'card-checklist-badge--done' : ''}`}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <CheckSquare size={11} />
          {checklistDoneItems}/{checklistTotalItems}
        </div>
      )}

      {/* Assignee avatars */}
      {cardAssignees.length > 0 && (
        <div className="card-assignees" onPointerDown={(e) => e.stopPropagation()}>
          {cardAssignees.map((a) => (
            <span
              key={a.id}
              className="assignee-avatar assignee-avatar--xs"
              title={`${a.name} (${a.email})`}
            >
              {getInitials(a.name)}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      {!isOverlay && (
        <div
          className="card-actions"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className={`card-label-btn ${pickerOpen ? 'active' : ''}`}
            onClick={togglePicker}
            title="Gerenciar labels"
          >
            <Tag size={12} />
          </button>
          <button
            className={`card-label-btn ${assigneePickerOpen ? 'active' : ''}`}
            onClick={toggleAssigneePicker}
            title="Atribuir membros"
          >
            <Users size={12} />
          </button>
          <button
            className={`card-label-btn ${dueDatePickerOpen ? 'active' : ''}`}
            onClick={openDueDatePicker}
            title="Definir prazo"
          >
            <Calendar size={12} />
          </button>
          <button
            className={`card-label-btn ${descEditorOpen ? 'active' : ''}`}
            onClick={toggleDescEditor}
            title="Editar descrição"
          >
            <FileText size={12} />
          </button>
          <button
            className={`card-label-btn ${checklistEditorOpen ? 'active' : ''}`}
            onClick={toggleChecklistEditor}
            title="Checklists"
          >
            <CheckSquare size={12} />
          </button>
        </div>
      )}

      {/* Inline assignee picker */}
      {assigneePickerOpen && !isOverlay && (
        <AssigneePicker
          cardId={card.id}
          boardId={boardId}
          boardMembers={boardMembers}
          cardAssignees={cardAssignees}
          socket={socket}
          onAssigneeChange={
            onAssigneeChange
              ? (type, payload) => onAssigneeChange(card.id, type, payload)
              : undefined
          }
          onClose={() => setAssigneePickerOpen(false)}
        />
      )}

      {/* Inline label picker */}
      {pickerOpen && !isOverlay && (
        <LabelPicker
          cardId={card.id}
          boardId={boardId}
          boardLabels={boardLabels}
          cardLabels={cardLabels}
          socket={socket}
          onCardLabelChange={
            onCardLabelChange
              ? (type, payload) => onCardLabelChange(card.id, type, payload)
              : undefined
          }
          onBoardLabelChange={onBoardLabelChange}
          onClose={() => setPickerOpen(false)}
        />
      )}

      {/* Inline due date picker */}
      {dueDatePickerOpen && !isOverlay && (
        <div
          className="duedate-picker"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="datetime-local"
            className="duedate-input"
            value={dueDateInput}
            onChange={(e) => setDueDateInput(e.target.value)}
          />
          <div className="duedate-actions">
            <button
              className="duedate-btn duedate-btn--save"
              onClick={() =>
                handleDueDateSave(dueDateInput ? new Date(dueDateInput).toISOString() : null)
              }
              disabled={savingDueDate || !dueDateInput}
            >
              {savingDueDate ? '...' : 'Salvar'}
            </button>
            {card.dueDate && (
              <button
                className="duedate-btn duedate-btn--clear"
                onClick={() => handleDueDateSave(null)}
                disabled={savingDueDate}
              >
                Limpar
              </button>
            )}
          </div>
        </div>
      )}

      {/* Inline markdown description editor */}
      {descEditorOpen && !isOverlay && (
        <MarkdownEditor
          initialValue={card.description ?? ''}
          onSave={handleDescriptionSave}
          saving={savingDescription}
        />
      )}

      {/* Inline checklist editor */}
      {checklistEditorOpen && !isOverlay && (
        <ChecklistEditor
          cardId={card.id}
          checklists={cardChecklists}
          boardId={boardId}
          socket={socket}
          onChecklistChange={onChecklistChange}
        />
      )}

      <CommentsPanel cardId={card.id} socket={socket} boardMembers={boardMembers} toggleRef={commentsToggleRef} />
    </div>
  );
}
