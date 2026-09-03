import { useState } from 'react';
import { Bell } from 'lucide-react';
import { useNotificationScheduler } from './useNotificationScheduler';
import NotificationCenterModal from './NotificationCenterModal';

export default function NotificationBell() {
  const [showModal, setShowModal] = useState(false);
  const { notifications, unreadCount, markRead, deleteNotification } = useNotificationScheduler();

  return (
    <>
      <button
        onClick={() => setShowModal(!showModal)}
        className={`group relative flex-shrink-0 flex items-center justify-center p-2 mx-0.5 mb-1 rounded-lg text-xs font-medium transition-colors ${
          showModal || unreadCount > 0
            ? 'bg-brand-500/20 text-brand-400'
            : 'text-dark-subtext hover:text-white hover:bg-white/5'
        }`}
        title="Central de Notificações"
        aria-label="Central de Notificações"
      >
        <div className="relative flex items-center justify-center">
          <Bell size={16} />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[15px] h-[15px] px-1 bg-brand-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-dark-bg animate-pulse">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>

        {/* Floating tooltip on hover (pure CSS, zero layout shift) */}
        <span className="pointer-events-none absolute top-full mt-1 left-1/2 -translate-x-1/2 px-2 py-1 bg-dark-card/95 border border-white/10 rounded-md text-[11px] font-medium text-white shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 whitespace-nowrap">
          Notificações
        </span>
      </button>

      {showModal && (
        <NotificationCenterModal
          notifications={notifications}
          onClose={() => setShowModal(false)}
          onMarkRead={markRead}
          onDelete={deleteNotification}
        />
      )}
    </>
  );
}
