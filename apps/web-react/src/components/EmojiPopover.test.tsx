import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import EmojiPopover from './EmojiPopover';

vi.mock('emoji-picker-react', () => ({
  default: ({ onEmojiClick }: any) => (
    <div data-testid="mock-emoji-picker">
      <button onClick={() => onEmojiClick({ emoji: '🚀' })}>Selecionar Foguete</button>
    </div>
  ),
  Theme: { DARK: 'dark' },
}));

describe('EmojiPopover Component', () => {
  it('opens emoji picker on trigger click and emits selected emoji', async () => {
    const onEmojiSelect = vi.fn();

    const { getByText, queryByTestId, findByText } = render(
      <EmojiPopover onEmojiSelect={onEmojiSelect}>
        <span>😀 Abrir Picker</span>
      </EmojiPopover>
    );

    expect(queryByTestId('mock-emoji-picker')).toBeNull();

    const trigger = getByText('😀 Abrir Picker');
    fireEvent.click(trigger);

    const emojiBtn = await findByText('Selecionar Foguete');
    expect(emojiBtn).toBeDefined();

    fireEvent.click(emojiBtn);
    expect(onEmojiSelect).toHaveBeenCalledWith('🚀');
  });
});
