jest.mock('../../config/database', () => require('../mocks/prisma'));
jest.mock('../../modules/board/board.service');
jest.mock('../../websocket/socket', () => ({
  getIo: jest.fn(() => ({ to: jest.fn(() => ({ emit: jest.fn() })) })),
}));

const prisma = require('../../config/database');
const boardService = require('../../modules/board/board.service');
const labelService = require('../../modules/label/label.service');

const BOARD_ID = 'board-1';
const USER_ID = 'user-1';
const LABEL_ID = 'label-1';
const CARD_ID = 'card-1';

const MOCK_LABEL = { id: LABEL_ID, boardId: BOARD_ID, name: 'Bug', color: '#EF4444', createdAt: new Date() };
const MOCK_CARD = {
  id: CARD_ID,
  column: { boardId: BOARD_ID },
};

beforeEach(() => jest.clearAllMocks());

// ── list ───────────────────────────────────────────────────────────────────
describe('LabelService.list', () => {
  it('retorna labels do board', async () => {
    boardService._checkAccess.mockResolvedValue({ role: 'admin' });
    prisma.label.findMany.mockResolvedValue([MOCK_LABEL]);

    const result = await labelService.list(BOARD_ID, USER_ID);

    expect(boardService._checkAccess).toHaveBeenCalledWith(BOARD_ID, USER_ID);
    expect(result).toEqual([MOCK_LABEL]);
  });

  it('lança se usuário sem acesso', async () => {
    boardService._checkAccess.mockRejectedValue({ statusCode: 403, code: 'ACCESS_DENIED' });

    await expect(labelService.list(BOARD_ID, USER_ID))
      .rejects.toMatchObject({ code: 'ACCESS_DENIED' });
  });
});

// ── create ─────────────────────────────────────────────────────────────────
describe('LabelService.create', () => {
  it('cria label e retorna objeto', async () => {
    boardService._checkAccess.mockResolvedValue({ role: 'admin' });
    prisma.label.create.mockResolvedValue(MOCK_LABEL);

    const result = await labelService.create(BOARD_ID, USER_ID, { name: 'Bug', color: '#EF4444' });

    expect(prisma.label.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { boardId: BOARD_ID, name: 'Bug', color: '#EF4444' } })
    );
    expect(result).toEqual(MOCK_LABEL);
  });

  it('lança se viewer tentar criar', async () => {
    boardService._checkAccess.mockRejectedValue({ statusCode: 403, code: 'INSUFFICIENT_PERMISSIONS' });

    await expect(labelService.create(BOARD_ID, USER_ID, { name: 'X', color: '#000000' }))
      .rejects.toMatchObject({ code: 'INSUFFICIENT_PERMISSIONS' });
  });
});

// ── update ─────────────────────────────────────────────────────────────────
describe('LabelService.update', () => {
  it('atualiza label existente', async () => {
    boardService._checkAccess.mockResolvedValue({ role: 'admin' });
    prisma.label.findFirst.mockResolvedValue(MOCK_LABEL);
    prisma.label.update.mockResolvedValue({ ...MOCK_LABEL, name: 'Feature' });

    const result = await labelService.update(BOARD_ID, LABEL_ID, USER_ID, { name: 'Feature' });

    expect(prisma.label.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: LABEL_ID }, data: { name: 'Feature' } })
    );
    expect(result.name).toBe('Feature');
  });

  it('lança LABEL_NOT_FOUND se não existe', async () => {
    boardService._checkAccess.mockResolvedValue({ role: 'admin' });
    prisma.label.findFirst.mockResolvedValue(null);

    await expect(labelService.update(BOARD_ID, LABEL_ID, USER_ID, {}))
      .rejects.toMatchObject({ code: 'LABEL_NOT_FOUND', statusCode: 404 });
  });
});

// ── delete ─────────────────────────────────────────────────────────────────
describe('LabelService.delete', () => {
  it('deleta label existente', async () => {
    boardService._checkAccess.mockResolvedValue({ role: 'admin' });
    prisma.label.findFirst.mockResolvedValue(MOCK_LABEL);
    prisma.label.delete.mockResolvedValue(MOCK_LABEL);

    const result = await labelService.delete(BOARD_ID, LABEL_ID, USER_ID);

    expect(prisma.label.delete).toHaveBeenCalledWith({ where: { id: LABEL_ID } });
    expect(result).toEqual({ deleted: true });
  });

  it('lança LABEL_NOT_FOUND se não existe', async () => {
    boardService._checkAccess.mockResolvedValue({ role: 'admin' });
    prisma.label.findFirst.mockResolvedValue(null);

    await expect(labelService.delete(BOARD_ID, LABEL_ID, USER_ID))
      .rejects.toMatchObject({ code: 'LABEL_NOT_FOUND' });
  });
});

// ── addToCard ──────────────────────────────────────────────────────────────
describe('LabelService.addToCard', () => {
  it('adiciona label ao card com sucesso', async () => {
    prisma.card.findUnique.mockResolvedValue(MOCK_CARD);
    boardService._checkAccess.mockResolvedValue({ role: 'editor' });
    prisma.label.findFirst.mockResolvedValue(MOCK_LABEL);
    prisma.cardLabel.count.mockResolvedValue(0);
    prisma.cardLabel.findUnique.mockResolvedValue(null);
    prisma.cardLabel.create.mockResolvedValue({ cardId: CARD_ID, labelId: LABEL_ID });

    const result = await labelService.addToCard(CARD_ID, LABEL_ID, USER_ID);

    expect(prisma.cardLabel.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { cardId: CARD_ID, labelId: LABEL_ID } })
    );
    expect(result).toMatchObject({ cardId: CARD_ID, label: MOCK_LABEL });
  });

  it('lança CARD_NOT_FOUND se card não existe', async () => {
    prisma.card.findUnique.mockResolvedValue(null);

    await expect(labelService.addToCard(CARD_ID, LABEL_ID, USER_ID))
      .rejects.toMatchObject({ code: 'CARD_NOT_FOUND' });
  });

  it('lança LABEL_LIMIT_EXCEEDED ao ultrapassar 5 labels', async () => {
    prisma.card.findUnique.mockResolvedValue(MOCK_CARD);
    boardService._checkAccess.mockResolvedValue({ role: 'editor' });
    prisma.label.findFirst.mockResolvedValue(MOCK_LABEL);
    prisma.cardLabel.count.mockResolvedValue(5);

    await expect(labelService.addToCard(CARD_ID, LABEL_ID, USER_ID))
      .rejects.toMatchObject({ code: 'LABEL_LIMIT_EXCEEDED' });
  });

  it('lança LABEL_ALREADY_ASSIGNED se label já está no card', async () => {
    prisma.card.findUnique.mockResolvedValue(MOCK_CARD);
    boardService._checkAccess.mockResolvedValue({ role: 'editor' });
    prisma.label.findFirst.mockResolvedValue(MOCK_LABEL);
    prisma.cardLabel.count.mockResolvedValue(1);
    prisma.cardLabel.findUnique.mockResolvedValue({ cardId: CARD_ID, labelId: LABEL_ID });

    await expect(labelService.addToCard(CARD_ID, LABEL_ID, USER_ID))
      .rejects.toMatchObject({ code: 'LABEL_ALREADY_ASSIGNED' });
  });
});

// ── removeFromCard ─────────────────────────────────────────────────────────
describe('LabelService.removeFromCard', () => {
  it('remove label do card com sucesso', async () => {
    prisma.card.findUnique.mockResolvedValue(MOCK_CARD);
    boardService._checkAccess.mockResolvedValue({ role: 'editor' });
    prisma.cardLabel.findUnique.mockResolvedValue({ cardId: CARD_ID, labelId: LABEL_ID });
    prisma.cardLabel.delete.mockResolvedValue({});

    const result = await labelService.removeFromCard(CARD_ID, LABEL_ID, USER_ID);

    expect(prisma.cardLabel.delete).toHaveBeenCalled();
    expect(result).toEqual({ deleted: true });
  });

  it('lança LABEL_NOT_ON_CARD se label não está no card', async () => {
    prisma.card.findUnique.mockResolvedValue(MOCK_CARD);
    boardService._checkAccess.mockResolvedValue({ role: 'editor' });
    prisma.cardLabel.findUnique.mockResolvedValue(null);

    await expect(labelService.removeFromCard(CARD_ID, LABEL_ID, USER_ID))
      .rejects.toMatchObject({ code: 'LABEL_NOT_ON_CARD' });
  });
});
