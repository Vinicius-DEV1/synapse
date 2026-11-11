import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Portal } from './Portal';

describe('Portal component', () => {
  it('renders children into document.body', () => {
    render(
      <div data-testid="parent-container">
        <Portal>
          <div data-testid="portal-content">Floating Dropdown Content</div>
        </Portal>
      </div>
    );

    const portalElement = screen.getByTestId('portal-content');
    expect(portalElement).toBeInTheDocument();
    expect(portalElement.parentElement).toBe(document.body);
  });
});
