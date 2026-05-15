import React from 'react';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Card from '../Card/Card';
import { Plus } from 'lucide-react';
import './Column.css';

export default function Column({
  column,
  cards,
  socket,
  boardId,
  boardLabels,
  activeLabelFilter,
  onCardLabelChange,
  onBoardLabelChange,
  onDueDateChange,
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: column.id,
    data: { type: 'Column', column },
  });

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  };

  const visibleCards = activeLabelFilter
    ? cards.filter((c) => c.labels?.some((l) => l.id === activeLabelFilter))
    : cards;

  return (
    <div ref={setNodeRef} style={style} className="column" {...attributes} {...listeners}>
      <div className="column-header">
        {column.name || column.title}
        <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>{visibleCards.length}</span>
      </div>

      <div className="column-content animate-slide">
        <SortableContext items={visibleCards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {visibleCards.map((card) => (
            <Card
              key={card.id}
              card={card}
              socket={socket}
              boardId={boardId}
              boardLabels={boardLabels}
              onCardLabelChange={onCardLabelChange}
              onBoardLabelChange={onBoardLabelChange}
              onDueDateChange={onDueDateChange}
            />
          ))}
        </SortableContext>
      </div>

      <button className="new-card-btn" onClick={() => alert('Adicionar card na API...')}>
        <Plus size={16} /> Add Card
      </button>
    </div>
  );
}
