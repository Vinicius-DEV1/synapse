import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import EditorModalHost from './EditorModalHost';

// Mock PageSearchMenu so we can trigger onSelect directly
vi.mock('../../PageSearchMenu', () => ({
  default: ({ onSelect, onClose }: { onSelect: (id: string, title: string) => void; onClose: () => void }) => (
    <div data-testid="page-search-menu">
      <button onClick={() => onSelect('page-1', 'Minha Página')}>Select Existing</button>
      <button onClick={() => onSelect('new', 'Nova Página')}>Create New</button>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

describe('EditorModalHost Component', () => {
  let mockEditor: any;
  let defaultProps: any;
  const setPageSearchMenu = vi.fn();
  const setSlashMenu = vi.fn();
  const onCreateLinkedPage = vi.fn().mockResolvedValue('new-page-id');

  beforeEach(() => {
    vi.clearAllMocks();

    const chainObj: any = {
      focus: vi.fn().mockReturnThis(),
      setTextSelection: vi.fn().mockReturnThis(),
      insertContent: vi.fn().mockReturnThis(),
      run: vi.fn(),
    };

    mockEditor = {
      isDestroyed: false,
      state: {
        doc: {
          content: { size: 100 },
        },
        selection: {
          $head: { pos: 25 },
        },
      },
      commands: {
        deleteRange: vi.fn(),
      },
      chain: vi.fn(() => chainObj),
    };

    defaultProps = {
      editor: mockEditor,
      pageId: 'current-page',
      pageTitle: 'Current Page Title',
      slashMenu: null,
      setSlashMenu,
      executeSlashCommand: vi.fn(),
      pageSearchMenu: null,
      setPageSearchMenu,
      onCreateLinkedPage,
      viewerState: { isOpen: false, src: '', nodePos: null, nodeType: null },
      setViewerState: vi.fn(),
      handleCroppedImage: vi.fn(),
      focusModal: null,
      setFocusModal: vi.fn(),
      handleStartTimer: vi.fn(),
      alarmModal: null,
      setAlarmModal: vi.fn(),
      handleSaveAlarm: vi.fn(),
      fileUploadModal: null,
      setFileUploadModal: vi.fn(),
      fileSelectModal: false,
      setFileSelectModal: vi.fn(),
      questionCreateModal: false,
      setQuestionCreateModal: vi.fn(),
      groupBundleModal: false,
      setGroupBundleModal: vi.fn(),
      calendarEventModal: null,
      setCalendarEventModal: vi.fn(),
      mediaSelectModal: null,
      setMediaSelectModal: vi.fn(),
      mediaActionModal: null,
      setMediaActionModal: vi.fn(),
      fileActionModal: null,
      setFileActionModal: vi.fn(),
      imageToDelete: null,
      setImageToDelete: vi.fn(),
    };
  });

  it('inserts pageReference at targetPos without executing second deleteRange', async () => {
    const props = {
      ...defaultProps,
      pageSearchMenu: {
        isOpen: true,
        x: 100,
        y: 200,
        query: '',
        mode: 'link' as const,
        targetPos: 14,
      },
    };

    render(<EditorModalHost {...props} />);

    const selectBtn = screen.getByText('Select Existing');
    fireEvent.click(selectBtn);

    expect(setPageSearchMenu).toHaveBeenCalledWith(null);
    expect(setSlashMenu).toHaveBeenCalledWith(null);

    // Verify deleteRange was NOT called
    expect(mockEditor.commands.deleteRange).not.toHaveBeenCalled();

    // Verify chain actions
    const chainInstance = mockEditor.chain();
    expect(chainInstance.setTextSelection).toHaveBeenCalledWith(14);
    expect(chainInstance.insertContent).toHaveBeenCalledWith({
      type: 'pageReference',
      attrs: { pageId: 'page-1', title: 'Minha Página' },
    });
    expect(chainInstance.run).toHaveBeenCalled();
  });

  it('creates and links new page using onCreateLinkedPage at targetPos', async () => {
    const props = {
      ...defaultProps,
      pageSearchMenu: {
        isOpen: true,
        x: 100,
        y: 200,
        query: 'Nova',
        mode: 'create' as const,
        targetPos: 30,
      },
    };

    render(<EditorModalHost {...props} />);

    const { act } = await import('@testing-library/react');
    const createBtn = screen.getByText('Create New');
    await act(async () => {
      fireEvent.click(createBtn);
    });

    expect(onCreateLinkedPage).toHaveBeenCalledWith('Nova Página');

    expect(mockEditor.chain().setTextSelection).toHaveBeenCalledWith(30);
    expect(mockEditor.chain().insertContent).toHaveBeenCalledWith({
      type: 'pageReference',
      attrs: { pageId: 'new-page-id', title: 'Nova Página' },
    });

    expect(mockEditor.commands.deleteRange).not.toHaveBeenCalled();
  });

  it('falls back to current selection pos if targetPos is omitted', () => {
    const props = {
      ...defaultProps,
      pageSearchMenu: {
        isOpen: true,
        x: 100,
        y: 200,
        query: '',
        mode: 'link' as const,
      },
    };

    render(<EditorModalHost {...props} />);

    const selectBtn = screen.getByText('Select Existing');
    fireEvent.click(selectBtn);

    expect(mockEditor.chain().setTextSelection).toHaveBeenCalledWith(25);
    expect(mockEditor.chain().insertContent).toHaveBeenCalledWith({
      type: 'pageReference',
      attrs: { pageId: 'page-1', title: 'Minha Página' },
    });
    expect(mockEditor.commands.deleteRange).not.toHaveBeenCalled();
  });
});
