import { Keyboard, BookOpen, PenTool, Layout } from 'lucide-react';
import { useI18n } from '../../../i18n';

export default function ShortcutsTab() {
  const { t } = useI18n();

  const shortcutGroups = [
    {
      title: t('settings.shortcuts.general'),
      icon: <Layout size={16} className="text-brand-400" />,
      items: [
        { keys: ["Ctrl", "J"], desc: t('settings.shortcuts.quickAi') },
        { keys: ["Shift", "F"], desc: t('settings.shortcuts.fullScreen') },
        { keys: ["Ctrl", "P"], desc: t('settings.shortcuts.search') },
        { keys: ["Esc"], desc: t('settings.shortcuts.closeModals') }
      ]
    },
    {
      title: t('settings.shortcuts.reader'),
      icon: <BookOpen size={16} className="text-purple-400" />,
      items: [
        { keys: ["F"], desc: t('settings.shortcuts.readerFocus') },
        { keys: ["M"], desc: t('settings.shortcuts.readerThemes') },
        { keys: ["+", t('settings.shortcuts.or'), "="], desc: t('settings.shortcuts.zoomIn') },
        { keys: ["-"], desc: t('settings.shortcuts.zoomOut') },
        { keys: [t('settings.shortcuts.leftArrow')], desc: t('settings.shortcuts.prevPage') },
        { keys: [t('settings.shortcuts.rightArrow'), t('settings.shortcuts.or'), t('settings.shortcuts.space')], desc: t('settings.shortcuts.nextPage') }
      ]
    },
    {
      title: t('settings.shortcuts.editor'),
      icon: <PenTool size={16} className="text-emerald-400" />,
      items: [
        { keys: ["Ctrl", "B"], desc: t('settings.shortcuts.bold') },
        { keys: ["Ctrl", "I"], desc: t('settings.shortcuts.italic') },
        { keys: ["Ctrl", "U"], desc: t('settings.shortcuts.underline') },
        { keys: ["Ctrl", "Z"], desc: t('settings.shortcuts.undo') },
        { keys: ["Ctrl", "Shift", "Z"], desc: t('settings.shortcuts.redo') }
      ]
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <Keyboard size={16} className="text-brand-400" />
        <p className="text-sm font-medium text-white">{t('settings.shortcuts.title')}</p>
      </div>

      <div className="space-y-5">
        {shortcutGroups.map((group, idx) => (
          <div key={idx} className="bg-black/20 border border-white/5 rounded-xl overflow-hidden">
            <div className="bg-white/5 px-4 py-2 flex items-center gap-2 border-b border-white/5">
              {group.icon}
              <span className="text-xs font-semibold text-white/90">{group.title}</span>
            </div>
            <div className="p-2 space-y-1">
              {group.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between px-2 py-1.5 hover:bg-white/5 rounded-lg transition-colors">
                  <span className="text-xs text-dark-subtext">{item.desc}</span>
                  <div className="flex items-center gap-1.5">
                    {item.keys.map((k, j) => (
                      <span key={j} className="text-[10px] font-mono bg-white/10 text-white/80 px-2 py-0.5 rounded border border-white/10">
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
