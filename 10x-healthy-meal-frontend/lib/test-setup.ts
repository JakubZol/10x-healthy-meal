import { vi } from 'vitest';

// Mock environment variables
process.env.OPENROUTER_API_KEY = 'test-api-key';
process.env.OPENROUTER_BASE_URL = 'https://test.openrouter.ai/api/v1';
process.env.OPENROUTER_DEFAULT_MODEL = 'test/model';
process.env.NODE_ENV = 'test';

// Mock crypto for Node.js environment
Object.defineProperty(global, 'crypto', {
  value: {
    subtle: {
      digest: vi.fn().mockResolvedValue(new ArrayBuffer(32))
    }
  }
});

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}; 