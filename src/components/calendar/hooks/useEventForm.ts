import { useState, useEffect } from 'react';
import type { CalendarEvent } from '../../../types';
import { format } from 'date-fns';
import { parseEventDate } from '../../../utils/date-utils';

export const CALENDAR_EVENT_COLORS = ['#4F46E5', '#EF4444', '#F59E0B', '#10B981', '#8B5CF6', '#EC4899', '#64748B'];

export function useEventForm(
  event: CalendarEvent | null,
  initialDate?: Date,
  onSave?: (eventData: Partial<CalendarEvent>) => void
) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('10:00');
  const [type, setType] = useState<'event' | 'task'>('event');
  const [color, setColor] = useState(CALENDAR_EVENT_COLORS[0]);
  const [isAllDay, setIsAllDay] = useState(false);
  const [recurrence, setRecurrence] = useState<'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'>('none');
  const [reminders, setReminders] = useState<number[]>([1440, 120, 15, 0]);

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description || '');
      setType(event.type);
      setColor(event.color || CALENDAR_EVENT_COLORS[0]);

      let remArray: number[] = [1440, 120, 15];
      if (Array.isArray(event.reminders)) {
        remArray = event.reminders;
      } else if (typeof event.reminders === 'string') {
        try {
          remArray = JSON.parse(event.reminders);
        } catch {
          remArray = [1440, 120, 15];
        }
      }
      setReminders(remArray);

      if (event.start_date) {
        const start = parseEventDate(event.start_date);
        if (!isNaN(start.getTime())) {
          setStartDate(format(start, 'yyyy-MM-dd'));
          setStartTime(format(start, 'HH:mm'));
        }
      }

      if (event.end_date) {
        const end = parseEventDate(event.end_date);
        if (!isNaN(end.getTime())) {
          setEndDate(format(end, 'yyyy-MM-dd'));
          setEndTime(format(end, 'HH:mm'));
        }
      }

      // Se for de 00:00 até 23:59, consideramos "Dia Inteiro"
      if (event.start_date && event.end_date) {
        const start = parseEventDate(event.start_date);
        const end = parseEventDate(event.end_date);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
          if (format(start, 'HH:mm') === '00:00' && format(end, 'HH:mm') === '23:59') {
            setIsAllDay(true);
          }
        }
      } else {
        setIsAllDay(false);
      }
    } else {
      const now = initialDate || new Date();
      setStartDate(format(now, 'yyyy-MM-dd'));
      setEndDate(format(now, 'yyyy-MM-dd'));
      setIsAllDay(false);
    }
  }, [event, initialDate]);

  const toggleReminder = (value: number) => {
    if (reminders.includes(value)) {
      setReminders(reminders.filter(v => v !== value));
    } else {
      setReminders([...reminders, value].sort((a, b) => b - a));
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim() || !startDate || !startTime || !endDate || !endTime) return;
    const finalStartTime = isAllDay ? '00:00' : startTime;
    const finalEndTime = isAllDay ? '23:59' : endTime;

    const start_date = new Date(`${startDate}T${finalStartTime}`).toISOString();
    const end_date = new Date(`${endDate}T${finalEndTime}`).toISOString();

    onSave?.({
      title: title.trim(),
      description: description.trim(),
      start_date,
      end_date,
      type,
      color,
      status: event?.status || 'pending',
      recurrence_rule: recurrence !== 'none' ? recurrence : null,
      page_id: event?.page_id || null,
      reminders,
    });
  };

  return {
    title,
    setTitle,
    description,
    setDescription,
    startDate,
    setStartDate,
    startTime,
    setStartTime,
    endDate,
    setEndDate,
    endTime,
    setEndTime,
    type,
    setType,
    color,
    setColor,
    isAllDay,
    setIsAllDay,
    recurrence,
    setRecurrence,
    reminders,
    toggleReminder,
    handleSubmit,
  };
}
