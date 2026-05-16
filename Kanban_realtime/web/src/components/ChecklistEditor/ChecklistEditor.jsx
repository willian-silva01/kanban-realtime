import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Trash2, CheckSquare } from 'lucide-react';
import api from '../../services/api';
import './ChecklistEditor.css';

function SortableItem({ item, checklistId, cardId, boardId, socket, onToggle, onDelete, onTextEdit }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(item.text);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const submitEdit = () => {
    if (text.trim() && text.trim() !== item.text) {
      onTextEdit(checklistId, item.id, text.trim());
    } else {
      setText(item.text);
    }
    setEditing(false);
  };

  return (
    <div ref={setNodeRef} style={style} className="cl-item">
      <span className="cl-item-grip" {...attributes} {...listeners}>
        <GripVertical size={12} />
      </span>
      <input
        type="checkbox"
        className="cl-item-check"
        checked={item.completed}
        onChange={() => onToggle(checklistId, item.id, !item.completed)}
      />
      {editing ? (
        <input
          className="cl-item-input"
          value={text}
          autoFocus
          onChange={(e) => setText(e.target.value)}
          onBlur={submitEdit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submitEdit();
            if (e.key === 'Escape') { setText(item.text); setEditing(false); }
          }}
        />
      ) : (
        <span
          className={`cl-item-text ${item.completed ? 'cl-item-text--done' : ''}`}
          onClick={() => setEditing(true)}
        >
          {item.text}
        </span>
      )}
      <button className="cl-item-del" onClick={() => onDelete(checklistId, item.id)} title="Remover item">
        <Trash2 size={11} />
      </button>
    </div>
  );
}

export default function ChecklistEditor({ cardId, checklists = [], boardId, socket, onChecklistChange }) {
  const [newTitle, setNewTitle] = useState('');
  const [addingNew, setAddingNew] = useState(false);
  const [newItemTexts, setNewItemTexts] = useState({});
  const [addingItem, setAddingItem] = useState({});

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // ── Checklist CRUD ──────────────────────────────────────────────────────

  const handleCreateChecklist = async () => {
    const title = newTitle.trim();
    if (!title) return;
    try {
      const res = await api.post(`/cards/${cardId}/checklists`, { title });
      const checklist = res.data.data;
      onChecklistChange(cardId, 'add_checklist', checklist);
      socket?.emit('checklist:created', { boardId, cardId, checklist });
      setNewTitle('');
      setAddingNew(false);
    } catch (err) {
      console.error('Erro ao criar checklist', err);
    }
  };

  const handleDeleteChecklist = async (checklistId) => {
    try {
      await api.delete(`/checklists/${checklistId}`);
      onChecklistChange(cardId, 'delete_checklist', checklistId);
      socket?.emit('checklist:deleted', { boardId, cardId, checklistId });
    } catch (err) {
      console.error('Erro ao deletar checklist', err);
    }
  };

  // ── Item CRUD ───────────────────────────────────────────────────────────

  const handleAddItem = async (checklistId) => {
    const text = (newItemTexts[checklistId] ?? '').trim();
    if (!text) return;
    try {
      const res = await api.post(`/checklists/${checklistId}/items`, { text });
      const item = res.data.data;
      onChecklistChange(cardId, 'add_item', { checklistId, item });
      socket?.emit('checklist:item:added', { boardId, cardId, checklistId, item });
      setNewItemTexts((prev) => ({ ...prev, [checklistId]: '' }));
      setAddingItem((prev) => ({ ...prev, [checklistId]: false }));
    } catch (err) {
      console.error('Erro ao adicionar item', err);
    }
  };

  const handleToggleItem = async (checklistId, itemId, completed) => {
    try {
      await api.patch(`/checklists/${checklistId}/items/${itemId}`, { completed });
      onChecklistChange(cardId, 'toggle_item', { checklistId, itemId, updates: { completed } });
      socket?.emit('checklist:item:toggled', { boardId, cardId, checklistId, itemId, completed });
    } catch (err) {
      console.error('Erro ao toggle item', err);
    }
  };

  const handleTextEdit = async (checklistId, itemId, text) => {
    try {
      await api.patch(`/checklists/${checklistId}/items/${itemId}`, { text });
      onChecklistChange(cardId, 'toggle_item', { checklistId, itemId, updates: { text } });
      socket?.emit('checklist:item:updated', { boardId, cardId, checklistId, itemId, text });
    } catch (err) {
      console.error('Erro ao editar item', err);
    }
  };

  const handleDeleteItem = async (checklistId, itemId) => {
    try {
      await api.delete(`/checklists/${checklistId}/items/${itemId}`);
      onChecklistChange(cardId, 'delete_item', { checklistId, itemId });
      socket?.emit('checklist:item:deleted', { boardId, cardId, checklistId, itemId });
    } catch (err) {
      console.error('Erro ao deletar item', err);
    }
  };

  const handleDragEnd = async (event, checklistId, items) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);

    onChecklistChange(cardId, 'reorder_items', { checklistId, items: reordered });

    try {
      await api.patch(`/checklists/${checklistId}/items`, {
        itemIds: reordered.map((i) => i.id),
      });
      socket?.emit('checklist:items:reordered', { boardId, cardId, checklistId, items: reordered });
    } catch (err) {
      console.error('Erro ao reordenar itens', err);
      onChecklistChange(cardId, 'reorder_items', { checklistId, items });
    }
  };

  return (
    <div
      className="cl-editor"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="cl-editor-header">
        <CheckSquare size={13} />
        <span>Checklists</span>
      </div>

      {checklists.map((cl) => {
        const total = cl.items?.length ?? 0;
        const done = cl.items?.filter((i) => i.completed).length ?? 0;
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;

        return (
          <div key={cl.id} className="cl-block">
            <div className="cl-block-header">
              <span className="cl-block-title">{cl.title}</span>
              <span className="cl-progress-label">{done}/{total}</span>
              <button
                className="cl-block-del"
                onClick={() => handleDeleteChecklist(cl.id)}
                title="Deletar checklist"
              >
                <Trash2 size={11} />
              </button>
            </div>

            {total > 0 && (
              <div className="cl-progress-bar">
                <div className="cl-progress-fill" style={{ width: `${pct}%` }} />
              </div>
            )}

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(e) => handleDragEnd(e, cl.id, cl.items ?? [])}
            >
              <SortableContext
                items={(cl.items ?? []).map((i) => i.id)}
                strategy={verticalListSortingStrategy}
              >
                {(cl.items ?? []).map((item) => (
                  <SortableItem
                    key={item.id}
                    item={item}
                    checklistId={cl.id}
                    cardId={cardId}
                    boardId={boardId}
                    socket={socket}
                    onToggle={handleToggleItem}
                    onDelete={handleDeleteItem}
                    onTextEdit={handleTextEdit}
                  />
                ))}
              </SortableContext>
            </DndContext>

            {addingItem[cl.id] ? (
              <div className="cl-new-item-row">
                <input
                  className="cl-new-item-input"
                  placeholder="Texto do item..."
                  autoFocus
                  value={newItemTexts[cl.id] ?? ''}
                  onChange={(e) =>
                    setNewItemTexts((prev) => ({ ...prev, [cl.id]: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddItem(cl.id);
                    if (e.key === 'Escape')
                      setAddingItem((prev) => ({ ...prev, [cl.id]: false }));
                  }}
                />
                <button className="cl-btn cl-btn--primary" onClick={() => handleAddItem(cl.id)}>
                  Adicionar
                </button>
                <button
                  className="cl-btn"
                  onClick={() => setAddingItem((prev) => ({ ...prev, [cl.id]: false }))}
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                className="cl-add-item-btn"
                onClick={() => setAddingItem((prev) => ({ ...prev, [cl.id]: true }))}
              >
                <Plus size={11} /> Adicionar item
              </button>
            )}
          </div>
        );
      })}

      {addingNew ? (
        <div className="cl-new-row">
          <input
            className="cl-new-input"
            placeholder="Nome da checklist..."
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateChecklist();
              if (e.key === 'Escape') { setNewTitle(''); setAddingNew(false); }
            }}
          />
          <button className="cl-btn cl-btn--primary" onClick={handleCreateChecklist}>
            Criar
          </button>
          <button className="cl-btn" onClick={() => { setNewTitle(''); setAddingNew(false); }}>
            Cancelar
          </button>
        </div>
      ) : (
        <button className="cl-add-checklist-btn" onClick={() => setAddingNew(true)}>
          <Plus size={11} /> Nova checklist
        </button>
      )}
    </div>
  );
}
