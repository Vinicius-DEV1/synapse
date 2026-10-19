import { useEffect } from 'react';
import { X, Bell, Calendar, Clock, BookOpen, Check, Trash2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { AppNotification } from '../../types/core';
import type { CalendarEvent } from '../../types/calendar';
import { useI18n } from '../../i18n';

interface NotificationCenterModalProps {
  notifications: AppNotification[];
  onClose: () => void;
  onMarkRead: (id?: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function NotificationCenterModal({
  notifications,
  onClose,
  onMarkRead,
  onDelete
}: NotificationCenterModalProps) {
  const { dispatch, state } = useStore();
  const { t, language } = useI18n();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    const handleBackPress = (e: Event) => {
      e.preventDefault();
      onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('caderno-back-press', handleBackPress);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('caderno-back-press', handleBackPress);
    };
  }, [onClose]);

  const handleOpenPage = async (pageId?: string | null) => {
    if (!pageId) return;
    dispatch({ type: 'NAVIGATE_IN_TAB', pageId });
    onClose();
  };

  const handleSnooze = async (notif: AppNotification, minutes: number) => {
    if (!window.api?.notifications || !window.api?.calendar) return;
    const newScheduled = new Date(Date.now() + minutes * 60 * 1000).toISOString();
    // Mark active notification as read
    await onMarkRead(notif.id);
    // Create new scheduled notification or re-scheduled alert
    await window.api.notifications.addNotification({
      title: `${notif.title} (${t('notifications.snoozeTag')})`,
      message: `${notif.message}`,
      type: notif.type,
      target_page_id: notif.target_page_id,
      event_id: notif.event_id,
      scheduled_for: newScheduled,
      is_read: false
    });
  };

  const handleCompleteEvent = async (notif: AppNotification) => {
    if (!window.api?.calendar || !notif.event_id) return;
    try {
      const events: CalendarEvent[] = await window.api.calendar.getEvents();
      const ev = events.find((e: CalendarEvent) => e.id === notif.event_id);
      if (ev) {
        await window.api.calendar.updateEvent(notif.event_id, {
          ...ev,
          status: 'completed'
        });
        window.dispatchEvent(new CustomEvent('calendar-event-updated'));
        await onMarkRead(notif.id);
      }
    } catch (e) {
      console.error('Erro ao concluir evento pela notificação:', e);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'calendar_event':
        return <Calendar size={16} className="text-brand-400" />;
      case 'alarm':
        return <Clock size={16} className="text-amber-400" />;
      default:
        return <Bell size={16} className="text-indigo-400" />;
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
      if (diffMin < 1) return t('notifications.now');
      if (diffMin < 60) return t('notifications.minutesAgo', { count: diffMin });
      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) return t('notifications.hoursAgo', { count: diffHours });
      return d.toLocaleDateString(language === 'pt-BR' ? 'pt-BR' : 'en-US', { day: '2-digit', month: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-start justify-end p-4 sm:p-6"
      onClick={onClose}
    >
      <div 
        className="bg-dark-card border border-white/[0.06] rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5 bg-white/5">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-brand-400" />
            <h3 className="font-semibold text-white text-base">{t('notifications.centerTitle')}</h3>
            {notifications.filter(n => !n.is_read).length > 0 && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-brand-500 text-white font-medium">
                {t('notifications.newBadge', { count: notifications.filter(n => !n.is_read).length })}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {notifications.some(n => !n.is_read) && (
              <button
                onClick={() => onMarkRead()}
                className="text-xs text-brand-400 hover:text-brand-300 px-2.5 py-1 rounded-lg hover:bg-white/5 transition-colors"
                title={t('notifications.readAllTitle')}
              >
                {t('notifications.readAll')}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-dark-subtext hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 divide-y divide-white/5">
          {notifications.length === 0 ? (
            <div className="py-12 text-center text-dark-subtext flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                <Bell size={22} className="opacity-40" />
              </div>
              <div>
                <p className="font-medium text-white/80">{t('notifications.emptyTitle')}</p>
                <p className="text-xs opacity-60">{t('notifications.emptyDesc')}</p>
              </div>
            </div>
          ) : (
            notifications.map((notif) => {
              const linkedPage = state.pages.find(p => p.id === notif.target_page_id);
              return (
                <div
                  key={notif.id}
                  className={`p-3 rounded-xl transition-colors ${
                    notif.is_read ? 'bg-white/[0.02] opacity-70' : 'bg-white/[0.06] border border-brand-500/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {getIcon(notif.type)}
                      <span className="font-medium text-sm text-white">{notif.title}</span>
                    </div>
                    <span className="text-[11px] text-dark-subtext flex-shrink-0">
                      {formatTimeAgo(notif.fired_at || notif.created_at)}
                    </span>
                  </div>

                  <p className="text-xs text-dark-subtext mt-1.5 leading-relaxed">
                    {notif.message}
                  </p>

                  {/* Actions */}
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5">
                    <div className="flex items-center gap-1.5">
                      {notif.target_page_id && (
                        <button
                          onClick={() => handleOpenPage(notif.target_page_id)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-brand-500/20 text-brand-300 hover:bg-brand-500/30 transition-colors"
                        >
                          <BookOpen size={13} />
                          <span className="max-w-[120px] truncate">
                            {linkedPage?.title || t('notifications.openPage')}
                          </span>
                        </button>
                      )}

                      <button
                        onClick={() => handleSnooze(notif, 15)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-lg bg-white/5 text-dark-subtext hover:text-white hover:bg-white/10 transition-colors"
                        title={t('notifications.snoozeTitle', { minutes: 15 })}
                      >
                        <Clock size={12} />
                        <span>{t('notifications.snooze', { minutes: 15 })}</span>
                      </button>

                      {notif.type === 'calendar_event' && notif.event_id && (
                        <button
                          onClick={() => handleCompleteEvent(notif)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-lg bg-emerald-500/10 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20 transition-colors"
                          title={t('notifications.completeTitle')}
                        >
                          <Check size={12} />
                          <span>{t('notifications.complete')}</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {!notif.is_read && (
                        <button
                          onClick={() => onMarkRead(notif.id)}
                          className="p-1 text-dark-subtext hover:text-emerald-400 hover:bg-emerald-500/10 rounded-md transition-colors"
                          title={t('notifications.markAsRead')}
                        >
                          <Check size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => onDelete(notif.id)}
                        className="p-1 text-dark-subtext hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                        title={t('notifications.remove')}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
