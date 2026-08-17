import type { AppSettings } from '../../../../utils/settings';

interface AutoLockSectionProps {
  appSettings: AppSettings;
  setAppSettings: (settings: AppSettings) => void;
}

export function AutoLockSection({ appSettings, setAppSettings }: AutoLockSectionProps) {
  return (
    <>
      <label className="flex items-center justify-between cursor-pointer group">
        <div>
          <span className="block text-sm font-medium text-white group-hover:text-brand-400 transition-colors">
            Bloquear ao Suspender
          </span>
          <span className="block text-xs text-dark-subtext mt-0.5 pr-4">
            Tranca o app se o PC for suspenso ou bloqueado.
          </span>
        </div>
        <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
          <input 
            type="checkbox" 
            checked={appSettings.autoLockOnSuspend}
            onChange={(e) => setAppSettings({ ...appSettings, autoLockOnSuspend: e.target.checked })}
            className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 border-dark-card appearance-none cursor-pointer checked:right-0 checked:border-brand-500 transition-all duration-200"
          />
          <label className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer transition-colors duration-200 ${appSettings.autoLockOnSuspend ? 'bg-brand-500' : 'bg-white/20'}`}></label>
        </div>
      </label>

      <div className="border-t border-white/5 pt-4">
        <label className="block text-sm font-medium text-white mb-2">Bloqueio por Inatividade</label>
        <select 
          value={appSettings.inactivityTimeoutMinutes}
          onChange={(e) => setAppSettings({ ...appSettings, inactivityTimeoutMinutes: parseInt(e.target.value) })}
          className="w-full bg-dark-bg border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors cursor-pointer"
        >
          <option className="bg-dark-bg text-white" value="0">Nunca</option>
          <option className="bg-dark-bg text-white" value="5">5 minutos</option>
          <option className="bg-dark-bg text-white" value="15">15 minutos</option>
          <option className="bg-dark-bg text-white" value="30">30 minutos</option>
          <option className="bg-dark-bg text-white" value="60">1 hora</option>
        </select>
        <p className="text-[11px] text-dark-subtext mt-1.5">
          Tranca automaticamente após período sem mexer no mouse/teclado.
        </p>
      </div>
    </>
  );
}
