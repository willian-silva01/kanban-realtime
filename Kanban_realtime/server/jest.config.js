module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/src/__tests__/**/*.test.js'],
  setupFiles: ['./src/__tests__/setup.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/config/database.js',
    '!src/config/redis.js',
    '!src/websocket/**',
    '!src/__tests__/**',
  ],
  coverageThreshold: {
    global: { lines: 70 },
  },
};
