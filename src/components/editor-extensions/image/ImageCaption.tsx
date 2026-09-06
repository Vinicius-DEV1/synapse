
interface ImageCaptionProps {
  visible: boolean;
  value: string;
  isEditable: boolean;
  onChange: (value: string) => void;
  onFocus: () => void;
  onBlur: () => void;
}

export default function ImageCaption({
  visible,
  value,
  isEditable,
  onChange,
  onFocus,
  onBlur,
}: ImageCaptionProps) {
  if (!visible) return null;

  return (
    <div className="mt-1.5 w-full" contentEditable={false}>
      <input
        type="text"
        value={value}
        readOnly={!isEditable}
        onFocus={onFocus}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === 'Escape') {
            event.preventDefault();
            (event.target as HTMLInputElement).blur();
          }
        }}
        placeholder="Escreva uma legenda..."
        className="w-full rounded border-none bg-transparent px-2 py-1 text-center text-sm text-dark-subtext placeholder-white/20 focus:text-white focus:outline-none focus:ring-1 focus:ring-brand-500/50"
      />
    </div>
  );
}
