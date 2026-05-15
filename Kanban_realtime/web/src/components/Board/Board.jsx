import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { X } from 'lucide-react';

import Column from '../Column/Column';
import Card from '../Card/Card';
import CursorsLayer from './CursorsLayer';
import './Board.css';

export default function Board({ socket, boardId, user }) {
  const [columns, setColumns] = useState([]);
  const [cards, setCards] = useState([]);
  const [boardLabels, setBoardLabels] = useState([]);
  const [activeCard, setActiveCard] = useState(null);
  const [activeLabelFilter, setActiveLabelFilter] = useState(null);

  const offlineQueueRef = useRef([]);
  const lastEmitTime = useRef(0);
  const THROTTLE_MS = 50;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // ── Handlers de label para Card ────────────────────────────────────────────

  const handleCardLabelChange = useCallback((cardId, type, payload) => {
    setCards((prev) =>
      prev.map((c) => {
        if (c.id !== cardId) return c;
        if (type === 'add') {
          const already = c.labels?.some((l) => l.id === payload.id);
          return already ? c : { ...c, labels: [...(c.labels ?? []), payload] };
        }
        // type === 'remove', payload = labelId string
        return { ...c, labels: (c.labels ?? []).filter((l) => l.id !== payload) };
      })
    );
  }, []);

  const handleBoardLabelChange = useCallback((type, payload) => {
    setBoardLabels((prev) => {
      if (type === 'create') return [...prev, payload];
      if (type === 'update') return prev.map((l) => (l.id === payload.id ? payload : l));
      // type === 'delete', payload = labelId string
      // Also strip deleted label from all cards
      setCards((prevCards) =>
        prevCards.map((c) => ({
          ...c,
          labels: (c.labels ?? []).filter((l) => l.id !== payload),
        }))
      );
      return prev.filter((l) => l.id !== payload);
    });
  }, []);

  // ── WebSocket listeners ────────────────────────────────────────────────────

  useEffect(() => {
    if (!socket) return;

    const onBoardSync = ({ columns: syncedColumns, cards: syncedCards, boardLabels: syncedLabels }) => {
      setColumns(syncedColumns);
      setCards(syncedCards);
      setBoardLabels(syncedLabels ?? []);
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

    const onCardLabelAdded = ({ cardId, label }) => {
      setCards((prev) =>
        prev.map((c) => {
          if (c.id !== cardId) return c;
          const already = c.labels?.some((l) => l.id === label.id);
          return already ? c : { ...c, labels: [...(c.labels ?? []), label] };
        })
      );
    };

    const onCardLabelRemoved = ({ cardId, labelId }) => {
      setCards((prev) =>
        prev.map((c) =>
          c.id === cardId
            ? { ...c, labels: (c.labels ?? []).filter((l) => l.id !== labelId) }
            : c
        )
      );
    };

    const onLabelCreated = ({ label }) => setBoardLabels((prev) => [...prev, label]);

    const onLabelUpdated = ({ label }) =>
      setBoardLabels((prev) => prev.map((l) => (l.id === label.id ? label : l)));

    const onLabelDeleted = ({ labelId }) => {
      setBoardLabels((prev) => prev.filter((l) => l.id !== labelId));
      setCards((prev) =>
        prev.map((c) => ({
          ...c,
          labels: (c.labels ?? []).filter((l) => l.id !== labelId),
        }))
      );
      setActiveLabelFilter((f) => (f === labelId ? null : f));
    };

    socket.on('board:sync', onBoardSync);
    socket.on('card:move', onCardMove);
    socket.on('card:label:added', onCardLabelAdded);
    socket.on('card:label:removed', onCardLabelRemoved);
    socket.on('label:created', onLabelCreated);
    socket.on('label:updated', onLabelUpdated);
    socket.on('label:deleted', onLabelDeleted);

    return () => {
      socket.off('board:sync', onBoardSync);
      socket.off('card:move', onCardMove);
      socket.off('card:label:added', onCardLabelAdded);
      socket.off('card:label:removed', onCardLabelRemoved);
      socket.off('label:created', onLabelCreated);
      socket.off('label:updated', onLabelUpdated);
      socket.off('label:deleted', onLabelDeleted);
      offlineQueueRef.current = [];
    };
  }, [socket]);

  // ── Mouse tracking ─────────────────────────────────────────────────────────

  const handlePointerMove = (e) => {
    if (!socket) return;
    const now = Date.now();
    if (now - lastEmitTime.current > THROTTLE_MS) {
      lastEmitTime.current = now;
      socket.emit('cursor:move', {
        boardId,
        x: e.pageX,
        y: e.pageY,
        name: user?.name || 'Usuário',
      });
    }
  };

  // ── DnD Handlers ──────────────────────────────────────────────────────────

  const handleDragStart = (event) => {
    const card = cards.find((c) => c.id === event.active.id);
    setActiveCard(card);
  };

  const handleDragOver = (event) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;
    const isActiveCard = active.data.current?.type === 'Card';
    const isOverCard = over.data.current?.type === 'Card';
    const isOverColumn = over.data.current?.type === 'Column';

    if (!isActiveCard) return;

    if (isActiveCard && isOverCard) {
      setCards((prev) => {
        const activeIndex = prev.findIndex((c) => c.id === activeId);
        const overIndex = prev.findIndex((c) => c.id === overId);
        if (prev[activeIndex].columnId !== prev[overIndex].columnId) {
          const mod = [...prev];
          mod[activeIndex].columnId = mod[overIndex].columnId;
          return arrayMove(mod, activeIndex, overIndex);
        }
        return arrayMove(prev, activeIndex, overIndex);
      });
    }

    if (isActiveCard && isOverColumn) {
      setCards((prev) => {
        const activeIndex = prev.findIndex((c) => c.id === activeId);
        if (prev[activeIndex].columnId !== overId) {
          const mod = [...prev];
          mod[activeIndex].columnId = overId;
          return arrayMove(mod, activeIndex, prev.length - 1);
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
    const activeCardData = cards.find((c) => c.id === activeId);
    const colCards = cards.filter((c) => c.columnId === activeCardData.columnId);
    const newPositionIndex = colCards.findIndex((c) => c.id === activeId);

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
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* ── Barra de Filtro por Label ────────────────────────────────────── */}
      {boardLabels.length > 0 && (
        <div
          className="label-filter-bar"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <span className="label-filter-title">Filtrar:</span>
          {boardLabels.map((label) => (
            <button
              key={label.id}
              className={`label-filter-chip ${activeLabelFilter === label.id ? 'active' : ''}`}
              style={{
                '--chip-color': label.color,
                borderColor: activeLabelFilter === label.id ? label.color : 'transparent',
              }}
              onClick={() =>
                setActiveLabelFilter((f) => (f === label.id ? null : label.id))
              }
              title={activeLabelFilter === label.id ? 'Remover filtro' : `Filtrar por "${label.name}"`}
            >
              <span
                className="label-filter-dot"
                style={{ background: label.color }}
              />
              {label.name}
            </button>
          ))}
          {activeLabelFilter && (
            <button
              className="label-filter-clear"
              onClick={() => setActiveLabelFilter(null)}
              title="Limpar filtro"
            >
              <X size={12} /> Limpar
            </button>
          )}
        </div>
      )}

      {/* ── Colunas + DnD ────────────────────────────────────────────────── */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="board-container" onPointerMove={handlePointerMove}>
          <CursorsLayer socket={socket} />

          <SortableContext
            items={columns.map((c) => c.id)}
            strategy={horizontalListSortingStrategy}
          >
            {columns.map((col) => (
              <Column
                key={col.id}
                column={col}
                cards={cards.filter((c) => c.columnId === col.id)}
                socket={socket}
                boardId={boardId}
                boardLabels={boardLabels}
                activeLabelFilter={activeLabelFilter}
                onCardLabelChange={handleCardLabelChange}
                onBoardLabelChange={handleBoardLabelChange}
              />
            ))}
          </SortableContext>

          <DragOverlay>
            {activeCard ? <Card card={activeCard} isOverlay socket={socket} /> : null}
          </DragOverlay>
        </div>
      </DndContext>
    </div>
  );
}
