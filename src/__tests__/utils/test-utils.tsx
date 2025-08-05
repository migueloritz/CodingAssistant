import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Custom render function with providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <div data-testid="test-wrapper">
      {children}
    </div>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// Mock data generators
export const createMockFile = (overrides = {}) => ({
  id: 'test-file-1',
  name: 'test.py',
  path: '/test/test.py',
  content: 'print("Hello, World!")',
  language: 'python' as const,
  lastModified: new Date('2023-01-01'),
  size: 100,
  isModified: false,
  ...overrides,
});

export const createMockProject = (overrides = {}) => ({
  id: 'test-project-1',
  name: 'Test Project',
  path: '/test/project',
  files: [createMockFile()],
  lastOpened: new Date('2023-01-01'),
  settings: {
    autoSave: true,
    autoSaveInterval: 30000,
    backupEnabled: true,
    maxBackups: 5,
  },
  ...overrides,
});

export const createMockAIResponse = (overrides = {}) => ({
  id: 'response-1',
  content: 'Generated code content',
  language: 'python' as const,
  explanation: 'This is a test response',
  suggestions: ['Suggestion 1', 'Suggestion 2'],
  timestamp: new Date('2023-01-01'),
  provider: 'mock',
  ...overrides,
});

export const createMockCodeGenerationResponse = (overrides = {}) => ({
  id: 'generation-1',
  content: 'def hello():\n    print("Hello, World!")',
  code: 'def hello():\n    print("Hello, World!")',
  tests: 'def test_hello():\n    assert hello() is None',
  documentation: '# Hello Function\nPrints a greeting',
  language: 'python' as const,
  explanation: 'This function prints a greeting',
  suggestions: ['Add error handling', 'Add docstring'],
  timestamp: new Date('2023-01-01'),
  provider: 'mock',
  ...overrides,
});

// Mock providers
export const createMockAIProvider = () => ({
  name: 'mock-provider',
  generate: jest.fn().mockResolvedValue(createMockCodeGenerationResponse()),
  explain: jest.fn().mockResolvedValue(createMockAIResponse()),
  improve: jest.fn().mockResolvedValue(createMockAIResponse()),
  debug: jest.fn().mockResolvedValue(createMockAIResponse()),
  isAvailable: jest.fn().mockResolvedValue(true),
});

// Async utilities
export const waitForAsync = () => act(async () => {
  await new Promise(resolve => setTimeout(resolve, 0));
});

export const flushPromises = () => new Promise(resolve => setImmediate(resolve));

// User event setup
export const setupUserEvent = () => userEvent.setup();

// Mock IndexedDB operations
export const mockIndexedDB = {
  open: jest.fn(),
  deleteDatabase: jest.fn(),
  createObjectStore: jest.fn(),
  transaction: jest.fn(),
  get: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  clear: jest.fn(),
  getAll: jest.fn(),
};

// Mock File System API
export const mockFileSystemAPI = {
  showOpenFilePicker: jest.fn(),
  showSaveFilePicker: jest.fn(),
  createWritable: jest.fn(),
  write: jest.fn(),
  close: jest.fn(),
};

// Performance testing utilities
export const measurePerformance = async (fn: () => Promise<void> | void) => {
  const start = performance.now();
  await fn();
  const end = performance.now();
  return end - start;
};

// Mock implementation helpers
export const createAsyncMock = <T,>(value: T, delay = 0) =>
  jest.fn().mockImplementation(() =>
    new Promise(resolve => setTimeout(() => resolve(value), delay))
  );

export const createRejectedMock = (error: Error, delay = 0) =>
  jest.fn().mockImplementation(() =>
    new Promise((_, reject) => setTimeout(() => reject(error), delay))
  );

// Test data generators
export const generateLargeContent = (lines = 1000) => {
  return Array.from({ length: lines }, (_, i) => `# Line ${i + 1}`).join('\n');
};

export const generateMockFiles = (count = 5) => {
  return Array.from({ length: count }, (_, i) =>
    createMockFile({
      id: `file-${i}`,
      name: `file-${i}.py`,
      path: `/test/file-${i}.py`,
    })
  );
};

// Console capture utilities
export const captureConsole = () => {
  const originalConsole = { ...console };
  const logs: string[] = [];
  const warns: string[] = [];
  const errors: string[] = [];

  console.log = (...args) => logs.push(args.join(' '));
  console.warn = (...args) => warns.push(args.join(' '));
  console.error = (...args) => errors.push(args.join(' '));

  return {
    logs,
    warns,
    errors,
    restore: () => {
      Object.assign(console, originalConsole);
    },
  };
};

// Re-export everything from React Testing Library
export * from '@testing-library/react';
export { customRender as render };