import React, { useEffect, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { X, ArrowUpDown, User, Search, Download, FileText, FileSpreadsheet, Keyboard, Archive, RotateCcw } from 'lucide-react';

import Column from '../Column/Column';
import Card from '../Card/Card';
import CursorsLayer from './CursorsLayer';
import SkeletonBoard from '../SkeletonBoard/SkeletonBoard';
import KeyboardShortcutsHelp from '../KeyboardShortcutsHelp/KeyboardShortcutsHelp';
import AddColumnButton from '../AddColumnButton/AddColumnButton';
import { useBoardStore } from '../../stores/boardStore';
import { exportToCSV, exportToPDF } from '../../utils/exportBoard';
import api from '../../services/api';
import './Board.css';

export default function Board({ socket, boardId, user }) {
  const {
    boardName,
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
    addChecklist,
    updateChecklist,
    deleteChecklist,
    addChecklistItem,
    updateChecklistItem,
    deleteChecklistItem,
    reorderChecklistItems,
    toggleLabelFilter,
    toggleMyCardsFilter,
    toggleSortByDueDate,
    searchQuery,
    setSearchQuery,
    clearAllFilters,
    focusedCardId,
    setFocusedCard,
    incrementEscapeSeq,
    triggerCommentsPanel,
    archiveCard,
    unarchiveCard,
    addColumn,
    updateColumn,
    removeColumn,
    reorderColumns,
    addCard,
    removeCard,
    updateCard,
  } = useBoardStore();

  const offlineQueueRef = useRef([]);
  const lastEmitTime = useRef(0);
  const searchInputRef = useRef(null);
  const boardContainerRef = useRef(null);
  const THROTTLE_MS = 50;

  const [activeColIndex, setActiveColIndex] = useState(0);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [showArchivedPanel, setShowArchivedPanel] = useState(false);
  const [archivedCards, setArchivedCards] = useState([]);
  const [loadingArchived, setLoadingArchived] = useState(false);
  const [restoringCardId, setRestoringCardId] = useState(null);
  const exportMenuRef = useRef(null);

  // Refs so the keyboard handler reads current state without re-registering
  const showShortcutsHelpRef = useRef(false);
  showShortcutsHelpRef.current = showShortcutsHelp;
  const kbStateRef = useRef({ searchQuery, focusedCardId, columns, cards });
  kbStateRef.current = { searchQuery, focusedCardId, columns, cards };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // ── Navegação mobile por colunas ─────────────────────────────────────────

  const scrollToCol = (idx) => {
    const el = boardContainerRef.current;
    if (!el) return;
    const colWidth = el.clientWidth - 24; // 12px padding em cada lado
    el.scrollTo({ left: idx * colWidth, behavior: 'smooth' });
    setActiveColIndex(idx);
  };

  const handleColScroll = () => {
    const el = boardContainerRef.current;
    if (!el) return;
    const colWidth = el.clientWidth - 24;
    if (colWidth <= 0) return;
    const idx = Math.round(el.scrollLeft / colWidth);
    setActiveColIndex(Math.min(Math.max(0, idx), columns.length - 1));
  };

  // ── Atalhos de teclado globais ────────────────────────────────────────────

  useEffect(() => {
    const onKeyDown = (e) => {
      const { searchQuery, focusedCardId, columns, cards } = kbStateRef.current;
      const tag = document.activeElement?.tagName;
      const isEditing =
        tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable;

      // Ctrl/Cmd+F — abrir busca (sempre interceptado para evitar find nativo)
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }

      // Esc — fechar modal de atalhos, fechar painéis, limpar busca, desfocalizar
      if (e.key === 'Escape') {
        if (showShortcutsHelpRef.current) {
          setShowShortcutsHelp(false);
          return;
        }
        incrementEscapeSeq();
        setFocusedCard(null);
        if (searchQuery) setSearchQuery('');
        if (document.activeElement === searchInputRef.current) searchInputRef.current.blur();
        return;
      }

      // Atalhos abaixo só funcionam fora de inputs
      if (isEditing) return;

      // ? — exibir lista de atalhos
      if (e.key === '?') {
        e.preventDefault();
        setShowShortcutsHelp((v) => !v);
        return;
      }

      // N — criar novo cartão na coluna do card focado (ou primeira coluna)
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        const focusedCard = focusedCardId ? cards.find((c) => c.id === focusedCardId) : null;
        const targetColId = focusedCard?.columnId ?? columns[0]?.id;
        if (targetColId) {
          document.querySelector(`[data-add-card-col="${targetColId}"]`)?.click();
        }
        return;
      }

      // Navegação por setas e Enter
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(e.key)) return;
      e.preventDefault();

      // Enter — alternar CommentsPanel do card focado
      if (e.key === 'Enter' && focusedCardId) {
        triggerCommentsPanel(focusedCardId);
        return;
      }

      // Sem card focado → focar primeiro card
      if (!focusedCardId) {
        const first = cards.find((c) => c.columnId === columns[0]?.id);
        if (first) setFocusedCard(first.id);
        return;
      }

      const currentCard = cards.find((c) => c.id === focusedCardId);
      if (!currentCard) return;

      const colIdx = columns.findIndex((c) => c.id === currentCard.columnId);
      const colCards = cards.filter((c) => c.columnId === currentCard.columnId);
      const cardIdxInCol = colCards.findIndex((c) => c.id === focusedCardId);

      if (e.key === 'ArrowDown') {
        if (cardIdxInCol < colCards.length - 1) {
          setFocusedCard(colCards[cardIdxInCol + 1].id);
        } else if (colIdx < columns.length - 1) {
          const next = cards.filter((c) => c.columnId === columns[colIdx + 1].id);
          if (next.length) setFocusedCard(next[0].id);
        }
      } else if (e.key === 'ArrowUp') {
        if (cardIdxInCol > 0) {
          setFocusedCard(colCards[cardIdxInCol - 1].id);
        } else if (colIdx > 0) {
          const prev = cards.filter((c) => c.columnId === columns[colIdx - 1].id);
          if (prev.length) setFocusedCard(prev[prev.length - 1].id);
        }
      } else if (e.key === 'ArrowRight') {
        if (colIdx < columns.length - 1) {
          const next = cards.filter((c) => c.columnId === columns[colIdx + 1].id);
          if (next.length) setFocusedCard(next[0].id);
        }
      } else if (e.key === 'ArrowLeft') {
        if (colIdx > 0) {
          const prev = cards.filter((c) => c.columnId === columns[colIdx - 1].id);
          if (prev.length) setFocusedCard(prev[0].id);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fechar menu de export ao clicar fora ─────────────────────────────────

  useEffect(() => {
    if (!showExportMenu) return;
    const handler = (e) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showExportMenu]);

  const handleOpenArchived = async () => {
    setShowArchivedPanel(true);
    setLoadingArchived(true);
    try {
      const res = await api.get(`/boards/${boardId}/archived-cards`);
      setArchivedCards(res.data.data);
    } catch (err) {
      console.error('Erro ao carregar cards arquivados', err);
    } finally {
      setLoadingArchived(false);
    }
  };

  const handleRestoreCard = async (cardId) => {
    setRestoringCardId(cardId);
    try {
      const res = await api.post(`/cards/${cardId}/unarchive`);
      const restoredCard = res.data.data;
      unarchiveCard(restoredCard);
      socket?.emit('card:unarchive', { boardId, card: restoredCard });
      setArchivedCards((prev) => prev.filter((c) => c.id !== cardId));
    } catch (err) {
      console.error('Erro ao restaurar card', err);
    } finally {
      setRestoringCardId(null);
    }
  };

  const handleExportCSV = () => {
    setShowExportMenu(false);
    exportToCSV(boardName, columns, cards);
  };

  const handleExportPDF = () => {
    setShowExportMenu(false);
    exportToPDF(boardName, columns, cards);
  };

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

  const handleChecklistChange = (cardId, type, payload) => {
    if (type === 'add_checklist') addChecklist(cardId, payload);
    else if (type === 'delete_checklist') deleteChecklist(cardId, payload);
    else if (type === 'add_item') addChecklistItem(cardId, payload.checklistId, payload.item);
    else if (type === 'toggle_item') updateChecklistItem(cardId, payload.checklistId, payload.itemId, payload.updates);
    else if (type === 'delete_item') deleteChecklistItem(cardId, payload.checklistId, payload.itemId);
    else if (type === 'reorder_items') reorderChecklistItems(cardId, payload.checklistId, payload.items);
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

    const onChecklistCreated = ({ cardId, checklist }) => addChecklist(cardId, checklist);
    const onChecklistUpdated = ({ cardId, checklistId, title }) =>
      updateChecklist(cardId, checklistId, { title });
    const onChecklistDeleted = ({ cardId, checklistId }) => deleteChecklist(cardId, checklistId);
    const onChecklistItemAdded = ({ cardId, checklistId, item }) =>
      addChecklistItem(cardId, checklistId, item);
    const onChecklistItemToggled = ({ cardId, checklistId, itemId, completed }) =>
      updateChecklistItem(cardId, checklistId, itemId, { completed });
    const onChecklistItemUpdated = ({ cardId, checklistId, itemId, text }) =>
      updateChecklistItem(cardId, checklistId, itemId, { text });
    const onChecklistItemDeleted = ({ cardId, checklistId, itemId }) =>
      deleteChecklistItem(cardId, checklistId, itemId);
    const onChecklistItemsReordered = ({ cardId, checklistId, items }) =>
      reorderChecklistItems(cardId, checklistId, items);

    const onCardArchived = ({ cardId }) => {
      archiveCard(cardId);
      setArchivedCards((prev) => {
        if (prev.some((c) => c.id === cardId)) return prev;
        return prev;
      });
    };
    const onCardUnarchived = ({ card }) => {
      unarchiveCard(card);
      setArchivedCards((prev) => prev.filter((c) => c.id !== card.id));
    };

    const onColumnCreate = (column) => addColumn(column);
    const onColumnUpdate = (column) => updateColumn(column);
    const onColumnDeleted = ({ columnId }) => removeColumn(columnId);
    const onColumnReorder = ({ columns: cols }) => reorderColumns(cols);
    const onCardCreated = ({ card }) => addCard(card);
    const onCardUpdated = ({ card }) => updateCard(card);
    const onCardDeleted = ({ cardId }) => removeCard(cardId);

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
    socket.on('checklist:created', onChecklistCreated);
    socket.on('checklist:updated', onChecklistUpdated);
    socket.on('checklist:deleted', onChecklistDeleted);
    socket.on('checklist:item:added', onChecklistItemAdded);
    socket.on('checklist:item:toggled', onChecklistItemToggled);
    socket.on('checklist:item:updated', onChecklistItemUpdated);
    socket.on('checklist:item:deleted', onChecklistItemDeleted);
    socket.on('checklist:items:reordered', onChecklistItemsReordered);
    socket.on('card:archived', onCardArchived);
    socket.on('card:unarchived', onCardUnarchived);
    socket.on('column:create', onColumnCreate);
    socket.on('column:update', onColumnUpdate);
    socket.on('column:deleted', onColumnDeleted);
    socket.on('column:reorder', onColumnReorder);
    socket.on('card:created', onCardCreated);
    socket.on('card:updated', onCardUpdated);
    socket.on('card:deleted', onCardDeleted);

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
      socket.off('checklist:created', onChecklistCreated);
      socket.off('checklist:updated', onChecklistUpdated);
      socket.off('checklist:deleted', onChecklistDeleted);
      socket.off('checklist:item:added', onChecklistItemAdded);
      socket.off('checklist:item:toggled', onChecklistItemToggled);
      socket.off('checklist:item:updated', onChecklistItemUpdated);
      socket.off('checklist:item:deleted', onChecklistItemDeleted);
      socket.off('checklist:items:reordered', onChecklistItemsReordered);
      socket.off('card:archived', onCardArchived);
      socket.off('card:unarchived', onCardUnarchived);
      socket.off('column:create', onColumnCreate);
      socket.off('column:update', onColumnUpdate);
      socket.off('column:deleted', onColumnDeleted);
      socket.off('column:reorder', onColumnReorder);
      socket.off('card:created', onCardCreated);
      socket.off('card:updated', onCardUpdated);
      socket.off('card:deleted', onCardDeleted);
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

  const handleDragEnd = async (event) => {
    setActiveCard(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    if (active.data.current?.type === 'Column') {
      const oldIndex = columns.findIndex((c) => c.id === active.id);
      const newIndex = columns.findIndex((c) => c.id === over.id);
      if (oldIndex === newIndex) return;

      const reordered = arrayMove(columns, oldIndex, newIndex);
      reorderColumns(reordered);

      const payload = reordered.map((col, idx) => ({ id: col.id, position: idx }));
      try {
        const res = await api.patch(`/boards/${boardId}/columns/reorder`, { columns: payload });
        const updatedCols = res.data.data.map(({ cards: _c, ...col }) => col);
        reorderColumns(updatedCols);
        socket?.emit('column:reorder', { boardId, columns: updatedCols });
      } catch {
        reorderColumns(columns);
      }
      return;
    }

    const activeId = active.id;
    const activeCardData = cards.find((c) => c.id === activeId);
    if (!activeCardData) return;
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
    if (activeLabelFilter) {
      result = result.filter((c) => c.labels?.some((l) => l.id === activeLabelFilter));
    }
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

  const hasActiveFilters = !!(activeLabelFilter || myCardsFilter || searchQuery.trim());

  const currentMember = boardMembers.find((m) => m.id === user?.id);
  const canManageColumns = currentMember && currentMember.role !== 'viewer';

  if (!boardSynced) {
    return <SkeletonBoard />;
  }

  return (
    <>
    {showShortcutsHelp && <KeyboardShortcutsHelp onClose={() => setShowShortcutsHelp(false)} />}
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* ── Barra de Busca + Filtros ─────────────────────────────────────── */}
      <div
        className="label-filter-bar"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Campo de busca global */}
        <div className="board-search-wrapper">
          <Search size={13} className="board-search-icon" />
          <input
            ref={searchInputRef}
            type="text"
            className="board-search-input"
            placeholder="Buscar cartões... (Ctrl+F)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="board-search-clear"
              onClick={() => setSearchQuery('')}
              title="Limpar busca"
            >
              <X size={10} />
            </button>
          )}
        </div>

        {boardLabels.length > 0 && (
          <>
            <span className="label-filter-sep" />
            <span className="label-filter-title">Labels:</span>
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

        {hasActiveFilters && (
          <button
            className="label-filter-clear"
            onClick={clearAllFilters}
            title="Limpar todos os filtros"
          >
            <X size={12} /> Limpar tudo
          </button>
        )}

        {/* Cards arquivados */}
        <button
          className={`board-shortcuts-btn ${showArchivedPanel ? 'active' : ''}`}
          onClick={showArchivedPanel ? () => setShowArchivedPanel(false) : handleOpenArchived}
          title="Cards arquivados"
          style={showArchivedPanel ? { borderColor: 'rgba(106,56,227,0.5)', color: '#A881FC' } : {}}
        >
          <Archive size={12} />
          Arquivados
        </button>

        {/* Atalhos de teclado */}
        <button
          className="board-shortcuts-btn"
          onClick={() => setShowShortcutsHelp(true)}
          title="Atalhos de teclado (?)"
        >
          <Keyboard size={12} />
        </button>

        {/* Exportar board */}
        <div className="board-export-wrapper" ref={exportMenuRef}>
          <button
            className="board-export-btn"
            onClick={() => setShowExportMenu((v) => !v)}
            title="Exportar board"
          >
            <Download size={12} />
            Exportar
          </button>
          {showExportMenu && (
            <div className="board-export-menu">
              <button className="board-export-item" onClick={handleExportCSV}>
                <FileSpreadsheet size={13} />
                Exportar CSV
              </button>
              <button className="board-export-item" onClick={handleExportPDF}>
                <FileText size={13} />
                Exportar PDF
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Colunas + DnD ────────────────────────────────────────────────── */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div
          ref={boardContainerRef}
          className="board-container"
          onPointerMove={handlePointerMove}
          onScroll={handleColScroll}
        >
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
                searchQuery={searchQuery}
                pendingCardIds={pendingCardIds}
                focusedCardId={focusedCardId}
                canDelete={canManageColumns}
                onCardLabelChange={handleCardLabelChange}
                onBoardLabelChange={handleBoardLabelChange}
                onDueDateChange={handleDueDateChange}
                onAssigneeChange={handleAssigneeChange}
                onDescriptionChange={handleDescriptionChange}
                onChecklistChange={handleChecklistChange}
              />
            ))}
          </SortableContext>

          <DragOverlay>
            {activeCard ? <Card card={activeCard} isOverlay socket={socket} /> : null}
          </DragOverlay>

          {canManageColumns && (
            <AddColumnButton
              boardId={boardId}
              socket={socket}
              onColumnCreated={addColumn}
            />
          )}
        </div>
      </DndContext>

      {/* ── Painel de Cards Arquivados ─────────────────────────────────── */}
      {showArchivedPanel && (
        <div className="archived-panel">
          <div className="archived-panel-header">
            <span className="archived-panel-title">
              <Archive size={14} /> Cards Arquivados
            </span>
            <button className="archived-panel-close" onClick={() => setShowArchivedPanel(false)}>
              <X size={14} />
            </button>
          </div>
          <div className="archived-panel-body">
            {loadingArchived ? (
              <p className="archived-panel-empty">Carregando...</p>
            ) : archivedCards.length === 0 ? (
              <p className="archived-panel-empty">Nenhum card arquivado.</p>
            ) : (
              archivedCards.map((c) => (
                <div key={c.id} className="archived-card-row">
                  <div className="archived-card-info">
                    <span className="archived-card-title">{c.title}</span>
                    <span className="archived-card-col">{c.column?.name}</span>
                  </div>
                  <button
                    className="archived-restore-btn"
                    onClick={() => handleRestoreCard(c.id)}
                    disabled={restoringCardId === c.id}
                    title="Restaurar card"
                  >
                    <RotateCcw size={12} />
                    {restoringCardId === c.id ? '...' : 'Restaurar'}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Navegação mobile por colunas ────────────────────────────────── */}
      {columns.length > 1 && (
        <div className="board-col-nav">
          <button
            className="board-col-nav-arrow"
            onClick={() => scrollToCol(Math.max(0, activeColIndex - 1))}
            disabled={activeColIndex === 0}
            aria-label="Coluna anterior"
          >
            ‹
          </button>
          <div className="board-col-dots">
            {columns.map((col, i) => (
              <button
                key={col.id}
                className={`board-col-dot ${i === activeColIndex ? 'active' : ''}`}
                onClick={() => scrollToCol(i)}
                title={col.title}
                aria-label={`Ir para coluna ${col.title}`}
              />
            ))}
          </div>
          <button
            className="board-col-nav-arrow"
            onClick={() => scrollToCol(Math.min(columns.length - 1, activeColIndex + 1))}
            disabled={activeColIndex === columns.length - 1}
            aria-label="Próxima coluna"
          >
            ›
          </button>
        </div>
      )}
    </div>
    </>
  );
}
