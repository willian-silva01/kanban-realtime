import { useEffect, useRef, useState } from 'react';
import api from '../../services/api';
import { useBoardStore } from '../../stores/boardStore';
import { useAuthStore } from '../../stores/authStore';
import { usePresenceStore } from '../../stores/presenceStore';

const MAX_NAME_LENGTH = 100; // mesmo limite do updateBoardSchema no backend

/**
 * Nome do board no header. Admins renomeiam com clique: Enter/blur salva, Esc cancela.
 * O backend emite board:renamed para a sala após o PUT, inclusive para quem renomeou.
 */
export default function BoardTitle({ boardId }) {
  const boardName = useBoardStore((s) => s.boardName);
  const setBoardName = useBoardStore((s) => s.setBoardName);
  const boardMembers = useBoardStore((s) => s.boardMembers);
  const user = useAuthStore((s) => s.user);
  const socket = usePresenceStore((s) => s.socket);

  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [error, setError] = useState(null);
  const doneRef = useRef(false); // evita salvar duas vezes (Enter seguido de blur)

  const canEdit = boardMembers.some((m) => m.id === user?.id && m.role === 'admin');

  useEffect(() => {
    if (!socket) return;
    const onRenamed = (payload) => {
      if (payload?.boardId === boardId) setBoardName(payload.name);
    };
    socket.on('board:renamed', onRenamed);
    return () => socket.off('board:renamed', onRenamed);
  }, [socket, boardId, setBoardName]);

  const startEditing = () => {
    if (!canEdit) return;
    doneRef.current = false;
    setValue(boardName);
    setError(null);
    setEditing(true);
  };

  const cancel = () => {
    doneRef.current = true;
    setEditing(false);
  };

  const save = async () => {
    if (doneRef.current) return;
    doneRef.current = true;
    setEditing(false);

    const name = value.trim();
    if (!name || name === boardName) return;

    const previous = boardName;
    setBoardName(name);
    try {
      await api.put(`/boards/${boardId}`, { name });
    } catch (err) {
      setBoardName(previous);
      setError(err.response?.data?.message || 'Não foi possível renomear o board.');
    }
  };

  if (editing) {
    return (
      <input
        className="header-board-name-input"
        aria-label="Nome do board"
        autoFocus
        maxLength={MAX_NAME_LENGTH}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={(e) => e.target.select()}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === 'Enter') save();
          if (e.key === 'Escape') cancel();
        }}
      />
    );
  }

  if (!boardName) return null;

  const title = error || (canEdit ? 'Clique para renomear' : boardName);

  return canEdit ? (
    <button
      type="button"
      className={`header-board-name header-board-name--editable${error ? ' header-board-name--error' : ''}`}
      title={title}
      onClick={startEditing}
    >
      {boardName}
    </button>
  ) : (
    <span className="header-board-name" title={title}>
      {boardName}
    </span>
  );
}
