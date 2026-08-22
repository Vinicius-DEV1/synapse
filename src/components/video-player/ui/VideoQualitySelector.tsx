export type WebQualityType = 'original' | 'remux' | '1080p' | '720p' | '480p' | '360p';

interface VideoQualitySelectorProps {
  webQuality: WebQualityType;
  onChangeQuality: (quality: WebQualityType) => void;
  disabled?: boolean;
}

export function VideoQualitySelector({ webQuality, onChangeQuality, disabled }: VideoQualitySelectorProps) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-white/80">Qualidade da Versão Web</label>
      <select 
        value={webQuality}
        onChange={(e) => onChangeQuality(e.target.value as WebQualityType)}
        disabled={disabled}
        className="bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-white/90 outline-none focus:border-brand-500 transition-colors"
      >
        <option className="bg-gray-900 text-white" value="original">Original (Nenhuma Conversão - Pesado)</option>
        <option className="bg-gray-900 text-white" value="remux">Clonar Original (Remux MP4 Ultra Rápido)</option>
        <option className="bg-gray-900 text-white" value="1080p">1080p Full HD (Alta Qualidade)</option>
        <option className="bg-gray-900 text-white" value="720p">720p HD (Rápido e Leve - Recomendado)</option>
        <option className="bg-gray-900 text-white" value="480p">480p SD (Bom para Celular)</option>
        <option className="bg-gray-900 text-white" value="360p">360p (Economia Máxima de Espaço)</option>
      </select>
    </div>
  );
}
