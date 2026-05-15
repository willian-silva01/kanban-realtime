import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import CommentsPanel from '../CommentsPanel/CommentsPanel';
import './Card.css';

export default function Card({ card, isOverlay, socket }) {
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

  // Se estiver copiando (Dragging Overlay) adicionar visual
  const classNames = `card ${isOverlay ? 'card-ghost' : ''}`;

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={classNames} 
      {...attributes} 
      {...listeners}
    >
      <div className="card-title">{card.title}</div>
      {card.description && <div className="card-desc">{card.description}</div>}
      
      {/* Badges falsos pro visual premium */}
      <div style={{ display: 'flex', gap: '6px', marginTop: '12px' }}>
        <div style={{ width: '24px', height: '4px', borderRadius: '2px', background: 'var(--brand)' }}></div>
      </div>
      
      {/* Componente Modular da Etapa 9! */}
      <CommentsPanel cardId={card.id} socket={socket} />
    </div>
  );
}
