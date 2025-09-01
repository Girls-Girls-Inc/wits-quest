require('@testing-library/jest-dom'); // adds .toBeInTheDocument, etc.

try { require('whatwg-fetch'); } catch {}

global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;

// Only do this in jsdom
if (typeof window !== 'undefined' && !('matchMedia' in window)) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

