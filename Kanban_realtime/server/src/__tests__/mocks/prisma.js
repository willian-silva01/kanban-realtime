const prismaMock = {
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  board: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  boardMember: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  column: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
  },
  card: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
  },
  activityLog: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  comment: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  notification: {
    createMany: jest.fn(),
    findMany: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
  },
  label: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  cardLabel: {
    create: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    delete: jest.fn(),
  },
  $transaction: jest.fn((arg) => {
    if (typeof arg === 'function') return arg(prismaMock);
    return Promise.all(arg);
  }),
  $disconnect: jest.fn(),
};

module.exports = prismaMock;
