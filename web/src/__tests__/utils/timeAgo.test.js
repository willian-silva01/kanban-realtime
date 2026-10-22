import { describe, it, expect } from 'vitest';
import { timeAgo } from '../../utils/timeAgo';

const NOW = new Date('2026-10-06T12:00:00Z').getTime();
const ago = (ms) => new Date(NOW - ms).toISOString();
const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe('timeAgo', () => {
  it.each([
    [0, 'agora'],
    [59 * 1000, 'agora'],
    [MIN, 'há 1 min'],
    [5 * MIN, 'há 5 min'],
    [59 * MIN, 'há 59 min'],
    [HOUR, 'há 1 hora'],
    [2 * HOUR, 'há 2 horas'],
    [23 * HOUR, 'há 23 horas'],
    [DAY, 'ontem'],
    [3 * DAY, 'há 3 dias'],
  ])('%i ms atrás → %s', (ms, expected) => {
    expect(timeAgo(ago(ms), NOW)).toBe(expected);
  });

  it('acima de 7 dias mostra a data', () => {
    expect(timeAgo('2026-09-20T12:00:00Z', NOW)).toBe('20/09/2026');
  });

  it('datas no futuro (relógio adiantado) contam como agora', () => {
    expect(timeAgo(new Date(NOW + 30 * 1000).toISOString(), NOW)).toBe('agora');
  });

  it('data inválida devolve string vazia', () => {
    expect(timeAgo(undefined, NOW)).toBe('');
  });
});
