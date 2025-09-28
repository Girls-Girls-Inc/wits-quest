import React from 'react';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

export function renderWithRouter(ui, options = {}) {
  function Wrapper({ children }) {
    return <BrowserRouter>{children}</BrowserRouter>;
  }
  
  return render(ui, { wrapper: Wrapper, ...options });
}

export * from '@testing-library/react';