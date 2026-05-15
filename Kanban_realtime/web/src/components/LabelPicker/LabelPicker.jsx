import React, { useState } from 'react';
import { X, Plus, Check, Tag } from 'lucide-react';
import api from '../../services/api';
import './LabelPicker.css';

const PRESET_COLORS = [
  '#EF4444', '#F97316', '#EAB308', '#22C55E', '#14B8A6',
  '#3B82F6', '#8B5CF6', '#EC4899', '#6B7280', '#1E293B',
];

export default function LabelPicker({
  cardId,
  boardId,
  boardLabels,
  cardLabels,
  socket,
  onCardLabelChange,
  onBoardLabelChange,
  onClose,
}) {
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [customColor, setCustomColor] = useState('');
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(null); // labelId being toggled

  const cardLabelIds = new Set(cardLabels.map((l) => l.id));

  const handleToggle = async (label) => {
    if (loading) return;
    setLoading(label.id);
    const assigned = cardLabelIds.has(label.id);
    try {
      if (assigned) {
        await api.delete(`/cards/${cardId}/labels/${label.id}`);
        onCardLabelChange('remove', label.id);
        socket?.emit('card:label:removed', { boardId, cardId, labelId: label.id });
      } else {
        await api.post(`/cards/${cardId}/labels/${label.id}`);
        onCardLabelChange('add', label);
        socket?.emit('card:label:added', { boardId, cardId, label });
      }
    } catch (err) {
      console.error('[LabelPicker] toggle error', err);
    } finally {
      setLoading(null);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const name = newName.trim();
    const color = customColor.match(/^#[0-9A-Fa-f]{6}$/) ? customColor : newColor;
    if (!name) return;
    setCreating(true);
    try {
      const res = await api.post(`/boards/${boardId}/labels`, { name, color });
      const label = res.data.data;
      onBoardLabelChange('create', label);
      socket?.emit('label:created', { boardId, label });
      setNewName('');
      setCustomColor('');
    } catch (err) {
      console.error('[LabelPicker] create error', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteBoardLabel = async (label) => {
    try {
      await api.delete(`/boards/${boardId}/labels/${label.id}`);
      onBoardLabelChange('delete', label.id);
      socket?.emit('label:deleted', { boardId, labelId: label.id });
    } catch (err) {
      console.error('[LabelPicker] delete error', err);
    }
  };

  return (
    <div
      className="label-picker"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="label-picker-header">
        <Tag size={14} />
        <span>Labels</span>
        <button className="label-picker-close" onClick={onClose} title="Fechar">
          <X size={14} />
        </button>
      </div>

      <div className="label-picker-list">
        {boardLabels.length === 0 && (
          <p className="label-picker-empty">Nenhuma label criada para este board.</p>
        )}
        {boardLabels.map((label) => {
          const assigned = cardLabelIds.has(label.id);
          const isLoading = loading === label.id;
          return (
            <div key={label.id} className="label-picker-item">
              <button
                className={`label-picker-toggle ${assigned ? 'assigned' : ''}`}
                onClick={() => handleToggle(label)}
                disabled={isLoading}
              >
                <span
                  className="label-picker-swatch"
                  style={{ background: label.color }}
                />
                <span className="label-picker-name">{label.name}</span>
                {assigned && <Check size={12} className="label-picker-check" />}
              </button>
              <button
                className="label-picker-delete"
                onClick={() => handleDeleteBoardLabel(label)}
                title="Remover label do board"
              >
                <X size={11} />
              </button>
            </div>
          );
        })}
      </div>

      <form className="label-picker-create" onSubmit={handleCreate}>
        <div className="label-picker-create-title">
          <Plus size={12} /> Nova label
        </div>
        <input
          className="label-picker-input"
          placeholder="Nome da label"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          maxLength={50}
        />
        <div className="label-picker-colors">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={`color-swatch ${newColor === c && !customColor ? 'selected' : ''}`}
              style={{ background: c }}
              onClick={() => { setNewColor(c); setCustomColor(''); }}
              title={c}
            />
          ))}
          <input
            type="color"
            className="color-custom"
            value={customColor || newColor}
            onChange={(e) => setCustomColor(e.target.value)}
            title="Cor personalizada"
          />
        </div>
        <button
          type="submit"
          className="label-picker-submit"
          disabled={!newName.trim() || creating}
        >
          {creating ? 'Criando...' : 'Criar label'}
        </button>
      </form>
    </div>
  );
}
