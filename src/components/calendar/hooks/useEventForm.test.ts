import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEventForm } from './useEventForm';
import type { CalendarEvent } from '../../../types';

describe('useEventForm Hook', () => {
  const mockEvent: CalendarEvent = {
    id: 'evt_1',
    title: 'Reunião de Alinhamento',
    description: 'Discutir arquitetura do software',
    type: 'event',
    start_date: '2026-08-25T14:00:00.000Z',
    end_date: '2026-08-25T15:00:00.000Z',
    color: '#4F46E5',
    created_at: 1000,
    updated_at: 1000,
  };

  it('populates fields when event is passed', () => {
    const onSave = vi.fn();
    const { result } = renderHook(() => useEventForm(mockEvent, undefined, onSave));

    expect(result.current.title).toBe('Reunião de Alinhamento');
    expect(result.current.description).toBe('Discutir arquitetura do software');
    expect(result.current.type).toBe('event');
  });

  it('calls onSave when form is submitted with valid data', () => {
    const onSave = vi.fn();
    const { result } = renderHook(() => useEventForm(null, new Date('2026-08-25'), onSave));

    act(() => {
      result.current.setTitle('Entrega do Projeto');
      result.current.setStartDate('2026-08-25');
      result.current.setStartTime('10:00');
      result.current.setEndDate('2026-08-25');
      result.current.setEndTime('11:00');
    });

    const mockEventObj = { preventDefault: vi.fn() } as any;

    act(() => {
      result.current.handleSubmit(mockEventObj);
    });

    expect(mockEventObj.preventDefault).toHaveBeenCalled();
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Entrega do Projeto',
      })
    );
  });
});
