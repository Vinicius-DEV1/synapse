import type React from 'react';
import {
  RefreshCw,
  X,
  Plus,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  Ungroup,
  Check,
  Link2,
  Palette,
} from 'lucide-react';
import ColorPalettePicker from '../../ColorPalettePicker';

interface LinkCardActionsProps {
  color?: string;
  isCustomColor: boolean;
  watched?: boolean;
  notes: string;
  showNotes: boolean;
  isInsideGroup: boolean;
  isReloading: boolean;
  showColorPicker: boolean;
  colorPickerRef: React.RefObject<HTMLDivElement>;
  setShowColorPicker: (show: boolean) => void;
  onChangeColor?: (color: string) => void;
  onToggleWatched?: (e: React.MouseEvent) => void;
  onConvertToText?: (e: React.MouseEvent) => void;
  onToggleNotes: (e: React.MouseEvent) => void;
  onUngroup: (e: React.MouseEvent) => void;
  onGroupWithNext: (e: React.MouseEvent) => void;
  onReload: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}

export default function LinkCardActions({
  color,
  isCustomColor,
  watched,
  notes,
  showNotes,
  isInsideGroup,
  isReloading,
  showColorPicker,
  colorPickerRef,
  setShowColorPicker,
  onChangeColor,
  onToggleWatched,
  onConvertToText,
  onToggleNotes,
  onUngroup,
  onGroupWithNext,
  onReload,
  onDelete,
}: LinkCardActionsProps) {
  return (
    <div
      className={`absolute top-2 right-2 flex items-center gap-1 transition-opacity ${
        showColorPicker ? 'opacity-100 z-50' : 'opacity-0 group-hover/link:opacity-100'
      }`}
    >
      {onChangeColor && (
        <div className="relative">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowColorPicker(!showColorPicker);
            }}
            className={`p-1.5 rounded transition-all flex items-center justify-center border backdrop-blur-sm ${
              isCustomColor
                ? 'bg-brand-500/20 text-brand-300 border-brand-500/40 shadow-sm'
                : 'bg-dark-card/80 hover:bg-white/10 text-dark-subtext hover:text-white border-white/5'
            }`}
            title="Personalizar cor do card"
          >
            <Palette size={14} />
          </button>
          {showColorPicker && (
            <div ref={colorPickerRef} onClick={(e) => e.stopPropagation()}>
              <ColorPalettePicker
                currentColor={color || 'default'}
                onSelectColor={(c) => {
                  onChangeColor(c);
                  setShowColorPicker(false);
                }}
                onClearColor={() => {
                  onChangeColor('default');
                  setShowColorPicker(false);
                }}
              />
            </div>
          )}
        </div>
      )}

      {onToggleWatched && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleWatched(e);
          }}
          className={`p-1.5 rounded transition-all flex items-center justify-center border backdrop-blur-sm ${
            watched
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
              : 'bg-dark-card/80 hover:bg-emerald-500/15 text-dark-subtext hover:text-emerald-300 border-white/5'
          }`}
          title={watched ? 'Marcar como não assistido' : 'Marcar como assistido (check verde)'}
        >
          <Check size={14} className={watched ? 'text-emerald-400 stroke-[2.5]' : ''} />
        </button>
      )}

      {onConvertToText && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onConvertToText(e);
          }}
          className="p-1.5 rounded hover:bg-white/10 text-dark-subtext hover:text-white bg-dark-card/80 backdrop-blur-sm border border-white/5"
          title="Converter para link de texto simples"
        >
          <Link2 size={14} />
        </button>
      )}

      <button
        onClick={onToggleNotes}
        className={`p-1.5 rounded transition-all flex items-center gap-1 border backdrop-blur-sm ${
          showNotes
            ? 'bg-brand-500/20 text-brand-300 border-brand-500/40 shadow-sm'
            : notes
              ? 'bg-brand-500/15 hover:bg-brand-500/25 text-brand-300 border-brand-500/30'
              : 'bg-dark-card/80 hover:bg-white/10 text-dark-subtext hover:text-white border-white/5'
        }`}
        title={
          !showNotes && !notes
            ? 'Adicionar Anotações ao Link (+)'
            : showNotes
              ? 'Recolher Anotações do Link'
              : 'Expandir Anotações do Link'
        }
      >
        {!notes && !showNotes ? <Plus size={14} /> : showNotes ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {isInsideGroup ? (
        <button
          onClick={onUngroup}
          className="p-1.5 rounded hover:bg-white/10 text-dark-subtext hover:text-white bg-dark-card/80 backdrop-blur-sm border border-white/5"
          title="Desagrupar este link (mover para fora do grupo)"
        >
          <Ungroup size={14} />
        </button>
      ) : (
        <button
          onClick={onGroupWithNext}
          className="p-1.5 rounded hover:bg-brand-500/20 text-dark-subtext hover:text-brand-300 bg-dark-card/80 backdrop-blur-sm border border-white/5"
          title="Agrupar com link vizinho (Lado a Lado)"
        >
          <LayoutGrid size={14} />
        </button>
      )}

      <button
        onClick={onReload}
        className="p-1.5 rounded hover:bg-white/10 text-dark-subtext hover:text-white bg-dark-card/80 backdrop-blur-sm border border-white/5"
        title="Recarregar título"
      >
        <RefreshCw size={14} className={isReloading ? 'animate-spin' : ''} />
      </button>
      <button
        onClick={onDelete}
        className="p-1.5 rounded hover:bg-red-500/20 text-dark-subtext hover:text-red-400 bg-dark-card/80 backdrop-blur-sm border border-white/5"
        title="Remover link"
      >
        <X size={14} />
      </button>
    </div>
  );
}
