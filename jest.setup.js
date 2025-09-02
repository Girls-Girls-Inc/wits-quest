// jest.setup.js

// Extend Jest matchers (e.g. .toBeInTheDocument, .toHaveAttribute, etc.)
require('@testing-library/jest-dom');

// Polyfill fetch (in case some tests depend on it, like Supabase or API calls)
try {
  require('whatwg-fetch');
} catch {}

// TextEncoder / TextDecoder (needed for some libs, e.g. Supabase client)
global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;

// Mock matchMedia if not provided by jsdom
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),            // legacy
      removeListener: jest.fn(),         // legacy
      addEventListener: jest.fn(),       // modern
      removeEventListener: jest.fn(),    // modern
      dispatchEvent: jest.fn(),
    })),
  });
}

