import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AiSidebar from './AiSidebar';
import { StoreContext } from '../store/useStore';
import type { AppState, StoreAction } from '../types';

describe('AiSidebar Component', () => {
  let mockState: AppState;
  let mockDispatch: (action: StoreAction) => void;

  beforeEach(() => {
    mockDispatch = vi.fn();
    mockState = {
      pages: [
        {
          id: 'page-1',
          title: 'Algoritmos e Estruturas',
          parent_id: null,
          user_id: 'user-1',
          is_expanded: false,
          created_at: 1000,
          updated_at: 2000,
        },
      ],
      tags: [],
      tabs: [
        {
          id: 'tab-1',
          module: 'notes',
          pageId: 'page-1',
          title: 'Algoritmos e Estruturas',
          icon: 'FileText',
          isPinned: false,
        },
      ],
      activeTabId: 'tab-1',
      selectedPageId: 'page-1',
      sidebarCollapsed: false,
      expandedNodes: {},
      aiChatSessions: {
        'chat-1': {
          id: 'chat-1',
          pageId: 'global',
          pageTitle: 'Chat Rápido',
          messages: [
            { role: 'user', parts: [{ text: 'O que é busca binária?' }] },
            { role: 'model', parts: [{ text: 'Busca binária é um algoritmo de divisão e conquista...' }] },
          ],
          updatedAt: 1000,
        },
      },
      activeAiChatId: null,
      showAiSidebar: true,
      aiSidebarWidth: 340,
      activeModal: null,
      trash: [],
      readingProgress: {},
      diagrams: [],
      activeDiagramId: null,
      flashcardDecks: [],
      activeDeckId: null,
      videos: [],
      activeVideoId: null,
      isReadingModeFullScreen: false,
    };
  });

  const renderWithStore = (state: AppState) => {
    return render(
      <StoreContext.Provider value={{ state, dispatch: mockDispatch }}>
        <AiSidebar />
      </StoreContext.Provider>
    );
  };

  it('renders nothing when showAiSidebar is false', () => {
    mockState.showAiSidebar = false;
    const { container } = renderWithStore(mockState);
    expect(container.firstChild).toBeNull();
  });

  it('renders active sessions list with session title and delete button', () => {
    renderWithStore(mockState);

    expect(screen.getByText('Chats Ativos')).toBeInTheDocument();
    expect(screen.getByText('O que é busca binária?')).toBeInTheDocument();
    expect(screen.getByTitle('Excluir conversa')).toBeInTheDocument();
  });

  it('triggers new quick chat action on button click', () => {
    renderWithStore(mockState);

    const newChatBtn = screen.getByTitle('Novo Chat Rápido');
    fireEvent.click(newChatBtn);

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'UPDATE_AI_CHAT' })
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'OPEN_AI_CHAT' })
    );
  });

  it('navigates to session on session card click', () => {
    renderWithStore(mockState);

    fireEvent.click(screen.getByText('O que é busca binária?'));
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'OPEN_AI_CHAT', chatId: 'chat-1' });
  });

  it('opens ConfirmDialog when deleting a session, and deletes on confirmation', () => {
    renderWithStore(mockState);

    const deleteBtn = screen.getByTitle('Excluir conversa');
    fireEvent.click(deleteBtn);

    expect(screen.getByRole('heading', { name: 'Excluir Conversa' })).toBeInTheDocument();
    expect(screen.getByText(/Deseja realmente excluir esta conversa/i)).toBeInTheDocument();

    // Confirm deletion
    const confirmBtn = screen.getByText('Sim, Excluir');
    fireEvent.click(confirmBtn);

    expect(mockDispatch).toHaveBeenCalledWith({ type: 'DELETE_AI_CHAT', id: 'chat-1' });
  });

  it('navigates back to session list when Escape is pressed inside an active chat', () => {
    mockState.activeAiChatId = 'chat-1';
    renderWithStore(mockState);

    expect(screen.getByText('Conversa com IA')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'OPEN_AI_CHAT', chatId: null });
  });

  it('closes AI sidebar when Escape is pressed from the session list', () => {
    mockState.activeAiChatId = null;
    renderWithStore(mockState);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'TOGGLE_AI_SIDEBAR' });
  });

  it('handles caderno-back-press custom event hierarchically', () => {
    mockState.activeAiChatId = 'chat-1';
    const { rerender } = renderWithStore(mockState);

    // 1. Back press inside active chat -> closes active chat
    window.dispatchEvent(new CustomEvent('caderno-back-press'));
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'OPEN_AI_CHAT', chatId: null });

    // 2. Back press in session list -> toggles AI sidebar
    mockState.activeAiChatId = null;
    rerender(
      <StoreContext.Provider value={{ state: mockState, dispatch: mockDispatch }}>
        <AiSidebar />
      </StoreContext.Provider>
    );

    window.dispatchEvent(new CustomEvent('caderno-back-press'));
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'TOGGLE_AI_SIDEBAR' });
  });
});
