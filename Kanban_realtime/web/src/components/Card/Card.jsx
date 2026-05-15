import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Tag } from 'lucide-react';
import CommentsPanel from '../CommentsPanel/CommentsPanel';
import LabelPicker from '../LabelPicker/LabelPicker';
import './Card.css';

export default function Card({
  card,
  isOverlay,
  socket,
  boardId,
  boardLabels = [],
  onCardLabelChange,
  onBoardLabelChange,
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: { type: 'Card', card },
  });

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  };

  const classNames = `card ${isOverlay ? 'card-ghost' : ''}`;
  const cardLabels = card.labels ?? [];

  const togglePicker = (e) => {
    e.stopPropagation();
    setPickerOpen((v) => !v);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={classNames}
      {...attributes}
      {...listeners}
    >
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
      {card.description && <div className="card-desc">{card.description}</div>}

      {/* Label picker trigger */}
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
        </div>
      )}

      {/* Inline label picker */}
      {pickerOpen && !isOverlay && (
        <LabelPicker
          cardId={card.id}
          boardId={boardId}
          boardLabels={boardLabels}
          cardLabels={cardLabels}
          socket={socket}
          onCardLabelChange={onCardLabelChange
            ? (type, payload) => onCardLabelChange(card.id, type, payload)
            : undefined}
          onBoardLabelChange={onBoardLabelChange}
          onClose={() => setPickerOpen(false)}
        />
      )}

      <CommentsPanel cardId={card.id} socket={socket} />
    </div>
  );
}
