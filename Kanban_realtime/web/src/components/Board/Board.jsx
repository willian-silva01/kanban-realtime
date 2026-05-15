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
import { X, ArrowUpDown, User } from 'lucide-react';

import Column from '../Column/Column';
import Card from '../Card/Card';
import CursorsLayer from './CursorsLayer';
import './Board.css';

export default function Board({ socket, boardId, user }) {
  const [columns, setColumns] = useState([]);
  const [cards, setCards] = useState([]);
  const [boardLabels, setBoardLabels] = useState([]);
  const [boardMembers, setBoardMembers] = useState([]);
  const [activeCard, setActiveCard] = useState(null);
  const [activeLabelFilter, setActiveLabelFilter] = useState(null);
  const [myCardsFilter, setMyCardsFilter] = useState(false);
  const [sortByDueDate, setSortByDueDate] = useState(false);

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

  const handleDueDateChange = useCallback((cardId, dueDate) => {
    setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, dueDate } : c)));
  }, []);

  const handleAssigneeChange = useCallback((cardId, type, payload) => {
    setCards((prev) =>
      prev.map((c) => {
        if (c.id !== cardId) return c;
        if (type === 'add') {
          const already = c.assignees?.some((a) => a.id === payload.id);
          return already ? c : { ...c, assignees: [...(c.assignees ?? []), payload] };
        }
        // type === 'remove', payload = userId string
        return { ...c, assignees: (c.assignees ?? []).filter((a) => a.id !== payload) };
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

    const onBoardSync = ({ columns: syncedColumns, cards: syncedCards, boardLabels: syncedLabels, boardMembers: syncedMembers }) => {
      setColumns(syncedColumns);
      setCards(syncedCards);
      setBoardLabels(syncedLabels ?? []);
      setBoardMembers(syncedMembers ?? []);
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

    const onCardDueDateUpdated = ({ cardId, dueDate }) => {
      setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, dueDate } : c)));
    };

    const onAssigneeAdded = ({ cardId, assignee }) => {
      setCards((prev) =>
        prev.map((c) => {
          if (c.id !== cardId) return c;
          const already = c.assignees?.some((a) => a.id === assignee.id);
          return already ? c : { ...c, assignees: [...(c.assignees ?? []), assignee] };
        })
      );
    };

    const onAssigneeRemoved = ({ cardId, userId: removedUserId }) => {
      setCards((prev) =>
        prev.map((c) =>
          c.id === cardId
            ? { ...c, assignees: (c.assignees ?? []).filter((a) => a.id !== removedUserId) }
            : c
        )
      );
    };

    socket.on('board:sync', onBoardSync);
    socket.on('card:move', onCardMove);
    socket.on('card:label:added', onCardLabelAdded);
    socket.on('card:label:removed', onCardLabelRemoved);
    socket.on('label:created', onLabelCreated);
    socket.on('label:updated', onLabelUpdated);
    socket.on('label:deleted', onLabelDeleted);
    socket.on('card:duedate:updated', onCardDueDateUpdated);
    socket.on('card:assignee:added', onAssigneeAdded);
    socket.on('card:assignee:removed', onAssigneeRemoved);

    return () => {
      socket.off('board:sync', onBoardSync);
      socket.off('card:move', onCardMove);
      socket.off('card:label:added', onCardLabelAdded);
      socket.off('card:label:removed', onCardLabelRemoved);
      socket.off('label:created', onLabelCreated);
      socket.off('label:updated', onLabelUpdated);
      socket.off('label:deleted', onLabelDeleted);
      socket.off('card:duedate:updated', onCardDueDateUpdated);
      socket.off('card:assignee:added', onAssigneeAdded);
      socket.off('card:assignee:removed', onAssigneeRemoved);
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

  const filterAndSortCards = (colCards) => {
    let result = colCards;
    if (myCardsFilter && user?.id) {
      result = result.filter((c) => c.assignees?.some((a) => a.id === user.id));
    }
    if (sortByDueDate) {
      result = [...result].sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      });
    }
    return result;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* ── Barra de Filtro por Label + Ordenação ───────────────────────── */}
      <div
          className="label-filter-bar"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {boardLabels.length > 0 && (
            <>
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
                  <span className="label-filter-dot" style={{ background: label.color }} />
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
            </>
          )}
          <button
            className={`label-filter-chip ${myCardsFilter ? 'active' : ''}`}
            style={{ '--chip-color': '#0ea5e9', borderColor: myCardsFilter ? '#0ea5e9' : 'transparent', marginLeft: 'auto' }}
            onClick={() => setMyCardsFilter((v) => !v)}
            title={myCardsFilter ? 'Mostrar todos os cartões' : 'Mostrar apenas meus cartões'}
          >
            <User size={11} />
            Meus cartões
          </button>
          <button
            className={`label-filter-chip ${sortByDueDate ? 'active' : ''}`}
            style={{ '--chip-color': '#6a38e3', borderColor: sortByDueDate ? '#6a38e3' : 'transparent' }}
            onClick={() => setSortByDueDate((v) => !v)}
            title={sortByDueDate ? 'Remover ordenação por prazo' : 'Ordenar por prazo'}
          >
            <ArrowUpDown size={11} />
            Prazo
          </button>
        </div>

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
                cards={filterAndSortCards(cards.filter((c) => c.columnId === col.id))}
                socket={socket}
                boardId={boardId}
                boardLabels={boardLabels}
                boardMembers={boardMembers}
                activeLabelFilter={activeLabelFilter}
                onCardLabelChange={handleCardLabelChange}
                onBoardLabelChange={handleBoardLabelChange}
                onDueDateChange={handleDueDateChange}
                onAssigneeChange={handleAssigneeChange}
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
