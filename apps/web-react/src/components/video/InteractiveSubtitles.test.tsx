import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import InteractiveSubtitles from './InteractiveSubtitles';

describe('InteractiveSubtitles Component', () => {
  it('renders tokens and invokes onWordClick when a word is clicked', () => {
    const onWordClick = vi.fn();
    const currentSubtitle = 'Never give up on your dreams';

    const { getByText } = render(
      <InteractiveSubtitles
        currentSubtitle={currentSubtitle}
        onWordClick={onWordClick}
        savedWords={[{ word: 'dreams', color: 'yellow' }]}
      />
    );

    const dreamsWord = getByText('dreams');
    expect(dreamsWord).toBeDefined();

    fireEvent.click(dreamsWord);
    expect(onWordClick).toHaveBeenCalledWith('dreams', currentSubtitle);
  });
});
