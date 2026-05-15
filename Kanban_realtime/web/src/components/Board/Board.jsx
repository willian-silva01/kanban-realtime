import React, { useState, useEffect, useRef } from 'react';
import { 
  DndContext, 
  DragOverlay, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors 
} from '@dnd-kit/core';
import { SortableContext, arrayMove, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';

import Column from '../Column/Column';
import Card from '../Card/Card';
import CursorsLayer from './CursorsLayer';
import './Board.css';

export default function Board({ socket, boardId, user }) {
  const [columns, setColumns] = useState([]);
  const [cards, setCards] = useState([]);
  const [activeCard, setActiveCard] = useState(null);

  // Fila de ações emitidas enquanto o socket estava desconectado.
  // Drenada automaticamente após board:sync (que chega a cada reconexão).
  const offlineQueueRef = useRef([]);

  // Throttle Emission do Ponteiro Local
  const lastEmitTime = useRef(0);
  const THROTTLE_MS = 50;

  // Sensores Dnd-Kit (Evitar arrastar com clique simples)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Escutar eventos WebSocket para atualizar a UI reativamente
  useEffect(() => {
    if (!socket) return;

    const onBoardSync = ({ columns: syncedColumns, cards: syncedCards }) => {
      setColumns(syncedColumns);
      setCards(syncedCards);
      // Drena a fila offline após o estado do servidor ser aplicado
      const queue = offlineQueueRef.current.splice(0);
      queue.forEach(({ event, payload }) => socket.emit(event, payload));
    };

    const onCardMove = (payload) => {
      const { card, fromColumnId, toColumnId } = payload;
      setCards((prev) => {
        const filtered = prev.filter((c) => c.id !== card.id);
        const cardToInsert = { ...card, columnId: toColumnId };
        filtered.splice(card.position, 0, cardToInsert);
        return filtered.map((c, idx) =>
          c.columnId === toColumnId ? { ...c, position: idx } : c
        );
      });
    };

    socket.on('board:sync', onBoardSync);
    socket.on('card:move', onCardMove);

    return () => {
      socket.off('board:sync', onBoardSync);
      socket.off('card:move', onCardMove);
      offlineQueueRef.current = [];
    };
  }, [socket]);

  // Tracking de Mouse (Emitir para Server)
  const handlePointerMove = (e) => {
    if (!socket) return;
    const now = Date.now();
    if (now - lastEmitTime.current > THROTTLE_MS) {
      lastEmitTime.current = now;
      socket.emit('cursor:move', {
        boardId,
        x: e.pageX,
        y: e.pageY,
        name: user?.name || 'Usuário'
      });
    }
  };

  // Handlers DND
  const handleDragStart = (event) => {
    const { active } = event;
    const card = cards.find((c) => c.id === active.id);
    setActiveCard(card);
  };

  const handleDragOver = (event) => {
    const { active, over } = event;
    if (!over) return;
    
    // Mover optimista enquanto plana
    const activeId = active.id;
    const overId = over.id;

    // Se está mexendo num card sobre algo
    const isActiveCard = active.data.current?.type === 'Card';
    const isOverCard = over.data.current?.type === 'Card';
    const isOverColumn = over.data.current?.type === 'Column';

    if (!isActiveCard) return;

    if (isActiveCard && isOverCard) {
      setCards((prev) => {
        const activeIndex = prev.findIndex((c) => c.id === activeId);
        const overIndex = prev.findIndex((c) => c.id === overId);
        
        if (prev[activeIndex].columnId !== prev[overIndex].columnId) {
          const modCards = [...prev];
          modCards[activeIndex].columnId = modCards[overIndex].columnId;
          return arrayMove(modCards, activeIndex, overIndex);
        }
        return arrayMove(prev, activeIndex, overIndex);
      });
    }

    if (isActiveCard && isOverColumn) {
      setCards((prev) => {
        const activeIndex = prev.findIndex((c) => c.id === activeId);
        if (prev[activeIndex].columnId !== overId) {
          const modCards = [...prev];
          modCards[activeIndex].columnId = overId;
          return arrayMove(modCards, activeIndex, prev.length - 1);
        }
        return prev;
      });
    }
  };

  const handleDragEnd = (event) => {
    setActiveCard(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const activeCardData = cards.find(c => c.id === activeId);
    
    // Agora que largou o mouse: Identificou Nova Position na current state list
    const colCards = cards.filter(c => c.columnId === activeCardData.columnId);
    const newPositionIndex = colCards.findIndex(c => c.id === activeId);

    if (socket) {
      const payload = {
        boardId,
        cardId: activeId,
        toColumnId: activeCardData.columnId,
        newPosition: newPositionIndex,
      };
      if (socket.connected) {
        socket.emit('card:move', payload);
      } else {
        offlineQueueRef.current.push({ event: 'card:move', payload });
      }
    }
  };

  return (
    <DndContext 
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="board-container" onPointerMove={handlePointerMove}>

        {/* Overlay Nativo GPU-bound que renderiza sem causar updates no React Context */}
        <CursorsLayer socket={socket} />


        <SortableContext items={columns.map(c => c.id)} strategy={horizontalListSortingStrategy}>
          {columns.map(col => (
            <Column 
              key={col.id} 
              column={col} 
              cards={cards.filter(c => c.columnId === col.id)}
              socket={socket}
            />
          ))}
        </SortableContext>
        
        {/* Overlay enquanto carrega */}
        <DragOverlay>
          {activeCard ? <Card card={activeCard} isOverlay socket={socket} /> : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}
