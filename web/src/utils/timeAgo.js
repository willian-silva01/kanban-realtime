const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Tempo relativo em português: "agora", "há 5 min", "há 1 hora", "ontem", "há 3 dias".
 * Acima de 7 dias devolve a data (dd/mm/aaaa).
 */
export function timeAgo(date, now = Date.now()) {
  const time = new Date(date).getTime();
  if (Number.isNaN(time)) return '';

  const diff = Math.max(0, now - time);

  if (diff < MINUTE) return 'agora';
  if (diff < HOUR) return `há ${Math.floor(diff / MINUTE)} min`;
  if (diff < DAY) {
    const hours = Math.floor(diff / HOUR);
    return hours === 1 ? 'há 1 hora' : `há ${hours} horas`;
  }
  if (diff < 2 * DAY) return 'ontem';
  if (diff < 7 * DAY) return `há ${Math.floor(diff / DAY)} dias`;

  return new Date(time).toLocaleDateString('pt-BR');
}
