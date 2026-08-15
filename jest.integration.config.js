module.exports = {
    testMatch: ['**/tests/integration/**/*.test.js'],
    modulePathIgnorePatterns: ['.*/__mocks__/.*'],
    globalSetup: './tests/integration/globalSetup.js',
    globalTeardown: './tests/integration/globalTeardown.js',
    setupFiles: ['./tests/integration/setupEnv.js'],
    clearMocks: true,
    automock: false,
    maxWorkers: 1
}