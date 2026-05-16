import React, { useEffect, useRef } from 'react';
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
import SkeletonBoard from '../SkeletonBoard/SkeletonBoard';
import { useBoardStore } from '../../stores/boardStore';
import './Board.css';

export default function Board({ socket, boardId, user }) {
  const {
    columns,
    cards,
    boardLabels,
    boardMembers,
    boardSynced,
    pendingCardIds,
    activeCard,
    activeLabelFilter,
    myCardsFilter,
    sortByDueDate,
    setBoardSync,
    setActiveCard,
    setCards,
    addPendingCard,
    moveCard,
    addLabelToCard,
    removeLabelFromCard,
    updateCardDueDate,
    addAssigneeToCard,
    removeAssigneeFromCard,
    updateCardDescription,
    addBoardLabel,
    updateBoardLabel,
    deleteBoardLabel,
    toggleLabelFilter,
    clearActiveLabelFilter,
    toggleMyCardsFilter,
    toggleSortByDueDate,
  } = useBoardStore();

  const offlineQueueRef = useRef([]);
  const lastEmitTime = useRef(0);
  const THROTTLE_MS = 50;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // ── Handlers de label/duedate/assignee para Card ───────────────────────────

  const handleCardLabelChange = (cardId, type, payload) => {
    if (type === 'add') addLabelToCard(cardId, payload);
    else removeLabelFromCard(cardId, payload);
  };

  const handleDueDateChange = (cardId, dueDate) => {
    updateCardDueDate(cardId, dueDate);
  };

  const handleAssigneeChange = (cardId, type, payload) => {
    if (type === 'add') addAssigneeToCard(cardId, payload);
    else removeAssigneeFromCard(cardId, payload);
  };

  const handleDescriptionChange = (cardId, description) => {
    updateCardDescription(cardId, description);
  };

  const handleBoardLabelChange = (type, payload) => {
    if (type === 'create') addBoardLabel(payload);
    else if (type === 'update') updateBoardLabel(payload);
    else deleteBoardLabel(payload); // payload = labelId
  };

  // ── WebSocket listeners ────────────────────────────────────────────────────

  useEffect(() => {
    if (!socket) return;

    const onBoardSync = (data) => {
      setBoardSync(data);
      const queue = offlineQueueRef.current.splice(0);
      queue.forEach(({ event, payload }) => socket.emit(event, payload));
    };

    const onCardMove = (payload) => moveCard(payload);

    const onCardLabelAdded = ({ cardId, label }) => addLabelToCard(cardId, label);
    const onCardLabelRemoved = ({ cardId, labelId }) => removeLabelFromCard(cardId, labelId);
    const onLabelCreated = ({ label }) => addBoardLabel(label);
    const onLabelUpdated = ({ label }) => updateBoardLabel(label);
    const onLabelDeleted = ({ labelId }) => deleteBoardLabel(labelId);
    const onCardDueDateUpdated = ({ cardId, dueDate }) => updateCardDueDate(cardId, dueDate);
    const onAssigneeAdded = ({ cardId, assignee }) => addAssigneeToCard(cardId, assignee);
    const onAssigneeRemoved = ({ cardId, userId: removedUserId }) =>
      removeAssigneeFromCard(cardId, removedUserId);
    const onDescriptionUpdated = ({ cardId, description }) =>
      updateCardDescription(cardId, description);

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
    socket.on('card:description:updated', onDescriptionUpdated);

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
      socket.off('card:description:updated', onDescriptionUpdated);
      offlineQueueRef.current = [];
    };
  }, [socket]); // eslint-disable-line react-hooks/exhaustive-deps

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
        addPendingCard(activeId);
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

  if (!boardSynced) {
    return <SkeletonBoard />;
  }

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
                onClick={() => toggleLabelFilter(label.id)}
                title={activeLabelFilter === label.id ? 'Remover filtro' : `Filtrar por "${label.name}"`}
              >
                <span className="label-filter-dot" style={{ background: label.color }} />
                {label.name}
              </button>
            ))}
            {activeLabelFilter && (
              <button
                className="label-filter-clear"
                onClick={clearActiveLabelFilter}
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
          onClick={toggleMyCardsFilter}
          title={myCardsFilter ? 'Mostrar todos os cartões' : 'Mostrar apenas meus cartões'}
        >
          <User size={11} />
          Meus cartões
        </button>
        <button
          className={`label-filter-chip ${sortByDueDate ? 'active' : ''}`}
          style={{ '--chip-color': '#6a38e3', borderColor: sortByDueDate ? '#6a38e3' : 'transparent' }}
          onClick={toggleSortByDueDate}
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
                pendingCardIds={pendingCardIds}
                onCardLabelChange={handleCardLabelChange}
                onBoardLabelChange={handleBoardLabelChange}
                onDueDateChange={handleDueDateChange}
                onAssigneeChange={handleAssigneeChange}
                onDescriptionChange={handleDescriptionChange}
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
