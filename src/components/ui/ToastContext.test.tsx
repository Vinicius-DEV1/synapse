import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ToastProvider, useGlobalToast, triggerToast } from './ToastContext';

const TestToastConsumer = () => {
  const { showToast } = useGlobalToast();
  return (
    <div>
      <button onClick={() => showToast('Success Action!', 'success', 0)}>Show Success</button>
      <button onClick={() => showToast('Error Occurred!', 'error', 0)}>Show Error</button>
    </div>
  );
};

describe('ToastContext & ToastProvider', () => {
  it('displays toast when showToast is invoked and removes on close click', () => {
    render(
      <ToastProvider>
        <TestToastConsumer />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));
    expect(screen.getByText('Success Action!')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Show Error'));
    expect(screen.getByText('Error Occurred!')).toBeInTheDocument();

    // Close buttons
    const closeButtons = screen.getAllByRole('button');
    // Click close button on the first toast
    fireEvent.click(closeButtons[closeButtons.length - 2]);
    expect(screen.queryByText('Success Action!')).not.toBeInTheDocument();
  });

  it('triggers toast through window event using triggerToast', () => {
    render(
      <ToastProvider>
        <div>Content</div>
      </ToastProvider>
    );

    act(() => {
      triggerToast('Event Dispatched Toast', 'info', 0);
    });

    expect(screen.getByText('Event Dispatched Toast')).toBeInTheDocument();
  });
});
