import React from 'react';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Card from '../Card/Card';
import { Plus } from 'lucide-react';
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
  onCardLabelChange,
  onBoardLabelChange,
  onDueDateChange,
  onAssigneeChange,
  onDescriptionChange,
  onChecklistChange,
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: column.id,
    data: { type: 'Column', column },
  });

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  };

  const trimmedQuery = searchQuery?.trim() ?? '';
  const visibleCount = trimmedQuery
    ? cards.filter((c) => cardMatchesSearch(c, trimmedQuery)).length
    : cards.length;

  return (
    <div ref={setNodeRef} style={style} className="column" {...attributes} {...listeners}>
      <div className="column-header">
        {column.name || column.title}
        <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>{visibleCount}</span>
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

      <button className="new-card-btn" onClick={() => alert('Adicionar card na API...')}>
        <Plus size={16} /> Add Card
      </button>
    </div>
  );
}
