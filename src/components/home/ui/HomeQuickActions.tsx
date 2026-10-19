import { Plus, Calendar, BrainCircuit, FolderUp } from 'lucide-react';
import { useI18n } from '../../../i18n';

interface HomeQuickActionsProps {
  onNewPage: () => void;
  onOpenCalendar: () => void;
  onOpenAnki: () => void;
  onOpenFiles: () => void;
  dueCardsCount?: number;
}

export function HomeQuickActions({
  onNewPage,
  onOpenCalendar,
  onOpenAnki,
  onOpenFiles,
  dueCardsCount = 0
}: HomeQuickActionsProps) {
  const { t } = useI18n();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <button 
        onClick={onNewPage} 
        className="flex items-center gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-brand-500/30 transition-all group shadow-sm hover:shadow-lg"
      >
        <div className="w-10 h-10 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center group-hover:scale-110 transition-transform">
          <Plus size={20} />
        </div>
        <div className="text-left">
          <p className="font-medium text-white text-sm">{t('home.quickActions.newPage')}</p>
        </div>
      </button>
      
      <button 
        onClick={onOpenCalendar} 
        className="flex items-center gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-amber-500/30 transition-all group shadow-sm hover:shadow-lg"
      >
        <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
          <Calendar size={20} />
        </div>
        <div className="text-left">
          <p className="font-medium text-white text-sm">{t('home.quickActions.calendar')}</p>
        </div>
      </button>

      <button 
        onClick={onOpenAnki} 
        className="flex items-center gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-blue-500/30 transition-all group shadow-sm hover:shadow-lg"
      >
        <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
          <BrainCircuit size={20} />
        </div>
        <div className="text-left flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1.5">
            <p className="font-medium text-white text-sm truncate">{t('home.quickActions.flashcards')}</p>
            {dueCardsCount > 0 && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 shrink-0">
                {dueCardsCount}
              </span>
            )}
          </div>
        </div>
      </button>
      
      <button 
        onClick={onOpenFiles} 
        className="flex items-center gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-emerald-500/30 transition-all group shadow-sm hover:shadow-lg"
      >
        <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
          <FolderUp size={20} />
        </div>
        <div className="text-left">
          <p className="font-medium text-white text-sm">{t('home.quickActions.files')}</p>
        </div>
      </button>
    </div>
  );
}
