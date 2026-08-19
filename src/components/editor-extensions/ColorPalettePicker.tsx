import { BG_COLORS } from '../../utils/colors';

interface ColorPalettePickerProps {
  currentColor: string;
  onSelectColor: (color: string) => void;
  onClearColor: () => void;
}

export default function ColorPalettePicker({
  currentColor,
  onSelectColor,
  onClearColor,
}: ColorPalettePickerProps) {
  return (
    <div className="absolute top-full right-0 mt-1 bg-dark-bg/95 backdrop-blur-xl border border-white/10 rounded-xl p-2 shadow-2xl z-50 flex flex-col gap-2 min-w-[200px]">
      <div className="text-[11px] font-medium text-dark-subtext px-1">Cor do Destaque</div>
      <div className="grid grid-cols-5 gap-1.5">
        <button
          onClick={onClearColor}
          className={`w-7 h-7 rounded-lg border flex items-center justify-center text-xs transition-all ${
            currentColor === 'default' || !currentColor
              ? 'border-white bg-white/20 text-white'
              : 'border-white/10 hover:border-white/30 text-dark-subtext hover:text-white'
          }`}
          title="Padrão"
        >
          ✕
        </button>
        {BG_COLORS.filter((c) => c.value !== 'transparent').map((c) => {
          const isSelected = currentColor === c.hex || currentColor === c.value;
          return (
            <button
              key={c.name}
              onClick={() => onSelectColor(c.hex)}
              className={`w-7 h-7 rounded-lg border border-white/15 transition-transform hover:scale-110 flex items-center justify-center ${
                isSelected ? 'ring-2 ring-white ring-offset-1 ring-offset-dark-bg scale-105' : ''
              }`}
              style={{ backgroundColor: c.hex }}
              title={c.name}
            />
          );
        })}
      </div>
    </div>
  );
}
