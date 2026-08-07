import React from 'react';
import type { AppSettings } from '../../../utils/settings';

interface GeneralTabProps {
  appSettings: AppSettings;
  setAppSettings: (settings: AppSettings) => void;
}

export default function GeneralTab({ appSettings, setAppSettings }: GeneralTabProps) {
  const [videoPath, setVideoPath] = React.useState<string>('Padrão do Sistema (AppData)');
  
  React.useEffect(() => {
    if (window.api?.config) {
      window.api.config.get('videoStoragePath').then((path) => {
        if (path && typeof path === 'string') {
          setVideoPath(path);
        }
      });
    }
  }, []);

  const handleSelectFolder = async () => {
    if (!window.api?.video?.openFolderDialog) {
      alert("Recurso não disponível nesta versão.");
      return;
    }
    const newPath = await window.api.video.openFolderDialog();
    if (newPath) {
      setVideoPath(newPath);
      window.api.config?.set('videoStoragePath', newPath);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-white/10 pb-4">
        <h4 className="text-sm font-medium text-white mb-3">Sistema de Abas</h4>
        
        <label className="flex items-center justify-between cursor-pointer group mb-4">
          <div>
            <span className="block text-sm font-medium text-white group-hover:text-brand-400 transition-colors">
              Abas na Versão Web
            </span>
            <span className="block text-xs text-dark-subtext mt-0.5 pr-4">
              Ativa ou desativa o sistema de abas na versão web do aplicativo.
            </span>
          </div>
          <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
            <input 
              type="checkbox" 
              checked={appSettings.enableTabsWeb}
              onChange={(e) => setAppSettings({ ...appSettings, enableTabsWeb: e.target.checked })}
              className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 border-dark-card appearance-none cursor-pointer checked:right-0 checked:border-brand-500 transition-all duration-200"
            />
            <label className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer transition-colors duration-200 ${appSettings.enableTabsWeb ? 'bg-brand-500' : 'bg-white/20'}`}></label>
          </div>
        </label>

        <label className="flex items-center justify-between cursor-pointer group">
          <div>
            <span className="block text-sm font-medium text-white group-hover:text-brand-400 transition-colors">
              Abas na Versão Desktop
            </span>
            <span className="block text-xs text-dark-subtext mt-0.5 pr-4">
              Ativa ou desativa o sistema de abas na versão desktop do aplicativo.
            </span>
          </div>
          <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
            <input 
              type="checkbox" 
              checked={appSettings.enableTabsDesktop}
              onChange={(e) => setAppSettings({ ...appSettings, enableTabsDesktop: e.target.checked })}
              className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 border-dark-card appearance-none cursor-pointer checked:right-0 checked:border-brand-500 transition-all duration-200"
            />
            <label className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer transition-colors duration-200 ${appSettings.enableTabsDesktop ? 'bg-brand-500' : 'bg-white/20'}`}></label>
          </div>
        </label>
      </div>

      <label className="flex items-center justify-between cursor-pointer group">
        <div>
          <span className="block text-sm font-medium text-white group-hover:text-brand-400 transition-colors">
            Salvar estado das abas
          </span>
          <span className="block text-xs text-dark-subtext mt-0.5 pr-4">
            Restaura as abas abertas da última sessão.
          </span>
        </div>
        <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
          <input 
            type="checkbox" 
            checked={appSettings.restoreTabsOnStartup}
            onChange={(e) => setAppSettings({ ...appSettings, restoreTabsOnStartup: e.target.checked })}
            className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 border-dark-card appearance-none cursor-pointer checked:right-0 checked:border-brand-500 transition-all duration-200"
          />
          <label className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer transition-colors duration-200 ${appSettings.restoreTabsOnStartup ? 'bg-brand-500' : 'bg-white/20'}`}></label>
        </div>
      </label>

      <div className="border-t border-white/10 pt-4 mb-4">
        <h4 className="text-sm font-medium text-white mb-3">Estudos (Anki)</h4>
        
        <label className="flex items-center justify-between cursor-pointer group mb-4">
          <div>
            <span className="block text-sm font-medium text-white group-hover:text-brand-400 transition-colors">
              Animação 3D do Cartão
            </span>
            <span className="block text-xs text-dark-subtext mt-0.5 pr-4">
              Ativa uma animação 3D suave ao revelar a resposta do flashcard.
            </span>
          </div>
          <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
            <input 
              type="checkbox" 
              checked={appSettings.enableStudy3DFlip ?? true}
              onChange={(e) => setAppSettings({ ...appSettings, enableStudy3DFlip: e.target.checked })}
              className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 border-dark-card appearance-none cursor-pointer checked:right-0 checked:border-brand-500 transition-all duration-200"
            />
            <label className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer transition-colors duration-200 ${appSettings.enableStudy3DFlip ?? true ? 'bg-brand-500' : 'bg-white/20'}`}></label>
          </div>
        </label>

        <label className="flex items-center justify-between cursor-pointer group mb-4">
          <div>
            <span className="block text-sm font-medium text-white group-hover:text-brand-400 transition-colors">
              Efeitos Sonoros (SFX)
            </span>
            <span className="block text-xs text-dark-subtext mt-0.5 pr-4">
              Toca sons sutis ao virar cartões e ao acertar/errar.
            </span>
          </div>
          <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
            <input 
              type="checkbox" 
              checked={appSettings.enableStudySfx ?? true}
              onChange={(e) => setAppSettings({ ...appSettings, enableStudySfx: e.target.checked })}
              className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 border-dark-card appearance-none cursor-pointer checked:right-0 checked:border-brand-500 transition-all duration-200"
            />
            <label className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer transition-colors duration-200 ${appSettings.enableStudySfx ?? true ? 'bg-brand-500' : 'bg-white/20'}`}></label>
          </div>
        </label>
      </div>

      <div className="border-t border-white/10 pt-4">
        <h4 className="text-sm font-medium text-white mb-3">Armazenamento Local</h4>
        <div className="bg-black/20 border border-white/5 rounded-xl p-3">
          <label className="block text-xs font-medium text-dark-subtext mb-1">Pasta de Download de Vídeos</label>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-white/5 border border-white/10 text-white/80 text-xs px-3 py-2 rounded-lg font-mono truncate cursor-not-allowed">
              {videoPath}
            </div>
            <button
              type="button"
              onClick={handleSelectFolder}
              className="px-3 py-2 bg-brand-500/20 text-brand-400 hover:bg-brand-500/30 text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
            >
              Alterar
            </button>
          </div>
          <p className="text-[10px] text-white/40 mt-2">
            Nota: Alterar a pasta fará com que novos vídeos sejam salvos no novo local. Vídeos antigos continuarão funcionando nos locais originais.
          </p>
        </div>
      </div>

      <div className="border-t border-white/10 pt-4">
        <h4 className="text-sm font-medium text-white mb-3">Módulos Externos</h4>
        <div className="bg-black/20 border border-white/5 rounded-xl p-3 flex justify-between items-center">
          <div>
            <label className="block text-xs font-medium text-dark-subtext mb-1">Módulo Focus</label>
            <p className="text-[10px] text-white/40">
              Abre o módulo de foco em uma janela separada.
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.api?.app?.openFocusWindow?.()}
            className="px-3 py-2 bg-brand-500/20 text-brand-400 hover:bg-brand-500/30 text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
          >
            Abrir Focus
          </button>
        </div>
      </div>
    </div>
  );
}
