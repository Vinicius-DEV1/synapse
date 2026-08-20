import React, { type ReactElement, type ReactNode } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { StoreProvider } from '../store/useStore';
import { TaskProvider } from '../store/TaskContext';
import { FocusProvider } from '../store/FocusContext';
import { ToastProvider } from '../components/ui/ToastContext';

interface AllTheProvidersProps {
  children: ReactNode;
}

export const AllTheProviders: React.FC<AllTheProvidersProps> = ({ children }) => {
  return (
    <ToastProvider>
      <StoreProvider>
        <TaskProvider>
          <FocusProvider>
            {children}
          </FocusProvider>
        </TaskProvider>
      </StoreProvider>
    </ToastProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };
