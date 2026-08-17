import  { useState, useEffect } from 'react';
import { Video, Settings2, PlayCircle, Zap } from 'lucide-react';
import { getSettings, saveSettings, type AppSettings } from '../../../utils/settings';

export default function VideoTab() {
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    setSettings(getSettings());
    
    const handleSettingsChange = () => setSettings(getSettings());
    window.addEventListener('app-settings-changed', handleSettingsChange);
    return () => window.removeEventListener('app-settings-changed', handleSettingsChange);
  }, []);

  if (!settings) return null;

  const handleSave = (newSettings: AppSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  return (
    <div className="max-w-3xl animate-fade-in p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center">
          <Video size={20} />
        </div>
        <div>
          <h2 className="text-xl font-medium text-white">Vídeos & Mídia</h2>
          <p className="text-sm text-dark-subtext">Configurações de conversão e reprodução</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Preferência de Reprodução */}
        <section className="bg-dark-card border border-white/5 rounded-2xl p-5 shadow-lg">
          <h3 className="text-base font-medium text-white mb-4 flex items-center gap-2">
            <PlayCircle size={18} className="text-purple-400" />
            Preferência de Reprodução
          </h3>
          
          <div className="space-y-4">
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="mt-1 relative flex items-center justify-center">
                <input 
                  type="radio" 
                  name="videoPlaybackPreference"
                  checked={settings.videoPlaybackPreference === 'auto'}
                  onChange={() => handleSave({ ...settings, videoPlaybackPreference: 'auto' })}
                  className="peer sr-only" 
                />
                <div className="w-5 h-5 rounded-full border border-dark-border group-hover:border-purple-400 peer-checked:border-purple-500 transition-colors"></div>
                <div className="absolute w-2.5 h-2.5 rounded-full bg-purple-500 opacity-0 peer-checked:opacity-100 transition-opacity"></div>
              </div>
              <div>
                <span className="text-white font-medium block">Automático (Recomendado)</span>
                <span className="text-sm text-dark-subtext block mt-1">Toca a versão Web para vídeos incompatíveis (MKV) e a versão Original para vídeos suportados nativamente (MP4).</span>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="mt-1 relative flex items-center justify-center">
                <input 
                  type="radio" 
                  name="videoPlaybackPreference"
                  checked={settings.videoPlaybackPreference === 'force_web'}
                  onChange={() => handleSave({ ...settings, videoPlaybackPreference: 'force_web' })}
                  className="peer sr-only" 
                />
                <div className="w-5 h-5 rounded-full border border-dark-border group-hover:border-purple-400 peer-checked:border-purple-500 transition-colors"></div>
                <div className="absolute w-2.5 h-2.5 rounded-full bg-purple-500 opacity-0 peer-checked:opacity-100 transition-opacity"></div>
              </div>
              <div>
                <span className="text-white font-medium block">Forçar Versão Web</span>
                <span className="text-sm text-dark-subtext block mt-1">Sempre tenta tocar a versão convertida (menor e mais leve), mesmo se o arquivo original for MP4.</span>
              </div>
            </label>
            
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="mt-1 relative flex items-center justify-center">
                <input 
                  type="radio" 
                  name="videoPlaybackPreference"
                  checked={settings.videoPlaybackPreference === 'force_original'}
                  onChange={() => handleSave({ ...settings, videoPlaybackPreference: 'force_original' })}
                  className="peer sr-only" 
                />
                <div className="w-5 h-5 rounded-full border border-dark-border group-hover:border-purple-400 peer-checked:border-purple-500 transition-colors"></div>
                <div className="absolute w-2.5 h-2.5 rounded-full bg-purple-500 opacity-0 peer-checked:opacity-100 transition-opacity"></div>
              </div>
              <div>
                <span className="text-white font-medium block">Forçar Original</span>
                <span className="text-sm text-dark-subtext block mt-1">Ignora versões web e tenta rodar sempre o arquivo original. Falhará para MKVs se você não tiver plugins instalados no sistema.</span>
              </div>
            </label>
          </div>
        </section>

        {/* Preset de Conversão */}
        <section className="bg-dark-card border border-white/5 rounded-2xl p-5 shadow-lg">
          <h3 className="text-base font-medium text-white mb-4 flex items-center gap-2">
            <Zap size={18} className="text-yellow-400" />
            Motor de Conversão (FFmpeg Preset)
          </h3>
          
          <div className="flex flex-col gap-2">
            <label className="text-sm text-dark-subtext">Perfil de Velocidade vs Qualidade</label>
            <select
              value={settings.videoConversionPreset}
              onChange={(e) => handleSave({ ...settings, videoConversionPreset: e.target.value as any })}
              className="bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-brand-500 w-full md:w-1/2"
            >
              <option className="bg-dark-bg text-white" value="ultrafast">Ultrafast (Mais Rápido / Maior Tamanho / Menor Qualidade)</option>
              <option className="bg-dark-bg text-white" value="superfast">Superfast</option>
              <option className="bg-dark-bg text-white" value="veryfast">Veryfast</option>
              <option className="bg-dark-bg text-white" value="faster">Faster</option>
              <option className="bg-dark-bg text-white" value="fast">Fast</option>
              <option className="bg-dark-bg text-white" value="medium">Medium (Equilíbrio Padrão)</option>
              <option className="bg-dark-bg text-white" value="slow">Slow</option>
              <option className="bg-dark-bg text-white" value="slower">Slower</option>
              <option className="bg-dark-bg text-white" value="veryslow">Veryslow (Mais Lento / Menor Tamanho / Máxima Qualidade)</option>
            </select>
            <p className="text-xs text-dark-subtext mt-2">
              Presets rápidos (como ultrafast) desativam B-Frames e estimação de movimento fina, o que pode causar trepidações ou "cortes" em cenas de ação, mas convertem muito rápido.
            </p>
          </div>
        </section>
        
        {/* Qualidade Web Padrão */}
        <section className="bg-dark-card border border-white/5 rounded-2xl p-5 shadow-lg">
          <h3 className="text-base font-medium text-white mb-4 flex items-center gap-2">
            <Settings2 size={18} className="text-blue-400" />
            Qualidade Web Padrão
          </h3>
          
          <div className="flex flex-col gap-2">
            <label className="text-sm text-dark-subtext">Resolução pré-selecionada no momento do upload</label>
            <select
              value={settings.videoDefaultWebQuality}
              onChange={(e) => handleSave({ ...settings, videoDefaultWebQuality: e.target.value as any })}
              className="bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-brand-500 w-full md:w-1/2"
            >
              <option className="bg-dark-bg text-white" value="original">Original (Não recomendado para Web)</option>
              <option className="bg-dark-bg text-white" value="remux">Clonar Original (Remux MP4 Ultra Rápido)</option>
              <option className="bg-dark-bg text-white" value="1080p">1080p Full HD</option>
              <option className="bg-dark-bg text-white" value="720p">720p HD (Rápido e Leve - Recomendado)</option>
              <option className="bg-dark-bg text-white" value="480p">480p SD (Bom para Celular)</option>
              <option className="bg-dark-bg text-white" value="360p">360p (Economia Máxima de Espaço)</option>
            </select>
          </div>
        </section>

      </div>
    </div>
  );
}
