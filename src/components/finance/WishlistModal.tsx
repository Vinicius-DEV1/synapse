import { useState, useRef } from 'react';
import { X, ImageIcon } from 'lucide-react';
import type { WishlistItem } from '../../types';

interface WishlistModalProps {
  initialData?: WishlistItem | null;
  onClose: () => void;
  onSave: (item: Partial<WishlistItem>) => Promise<void>;
}

export default function WishlistModal({ initialData, onClose, onSave }: WishlistModalProps) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [price, setPrice] = useState(initialData?.price ? String(initialData.price) : '');
  const [priority, setPriority] = useState<WishlistItem['priority']>(initialData?.priority || 'medium');
  const [category, setCategory] = useState(initialData?.category || 'Geral');
  const [expectedDate, setExpectedDate] = useState(initialData?.expected_date || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !price) return;
    
    setLoading(true);
    try {
      await onSave({
        title,
        price: parseFloat(price),
        priority,
        category,
        expected_date: expectedDate || null,
        description: description || null,
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    let imagePasted = false;
    for (const item of items) {
      if (item.type.indexOf('image') === 0) {
        imagePasted = true;
        const file = item.getAsFile();
        if (file && window.api.imageCache) {
          try {
            const buffer = await file.arrayBuffer();
            const id = 'wishimg_' + Date.now() + Math.random().toString(36).substring(2,6);
            await window.api.imageCache.put(id, buffer, file.type);
            
            const textToInsert = `\n![image](${id})\n`;
            
            if (textareaRef.current) {
              const start = textareaRef.current.selectionStart;
              const end = textareaRef.current.selectionEnd;
              const newText = description.substring(0, start) + textToInsert + description.substring(end);
              setDescription(newText);
              
              setTimeout(() => {
                if (textareaRef.current) {
                  textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + textToInsert.length;
                  textareaRef.current.focus();
                }
              }, 0);
            } else {
              setDescription(prev => prev + textToInsert);
            }
          } catch (err) {
            console.error('Failed to paste image', err);
          }
        }
      }
    }
    if (imagePasted) {
      e.preventDefault();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-card border border-white/10 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <h2 className="text-lg font-semibold text-dark-text">
            {initialData ? 'Editar Desejo' : 'Novo Desejo / Gasto Futuro'}
          </h2>
          <button onClick={onClose} className="p-1 text-dark-subtext hover:text-dark-text rounded-lg hover:bg-white/5">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4 max-h-[80vh] overflow-y-auto">
          <div>
            <label className="block text-xs text-dark-subtext mb-1.5">O que você deseja comprar/pagar?</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Novo Notebook, Viagem..."
              className="w-full bg-dark-bg border border-white/10 rounded-lg px-3 py-2 text-sm text-dark-text focus:border-brand-500/50 outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-dark-subtext mb-1.5">Custo Estimado</label>
              <input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="w-full bg-dark-bg border border-white/10 rounded-lg px-3 py-2 text-sm text-dark-text focus:border-brand-500/50 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs text-dark-subtext mb-1.5">Prioridade</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full bg-dark-bg border border-white/10 rounded-lg px-3 py-2 text-sm text-dark-text focus:border-brand-500/50 outline-none"
              >
                <option value="low">Baixa</option>
                <option value="medium">Média</option>
                <option value="high">Alta</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-dark-subtext mb-1.5">Data Esperada (Opcional)</label>
              <input
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                className="w-full bg-dark-bg border border-white/10 rounded-lg px-3 py-2 text-sm text-dark-text focus:border-brand-500/50 outline-none [color-scheme:dark]"
              />
            </div>

            <div>
              <label className="block text-xs text-dark-subtext mb-1.5">Categoria</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Ex: Geral, Tecnologia, Casa..."
                className="w-full bg-dark-bg border border-white/10 rounded-lg px-3 py-2 text-sm text-dark-text focus:border-brand-500/50 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-dark-subtext mb-1.5 flex justify-between items-center">
              <span>Descrição / Anotações</span>
              <span className="flex items-center gap-1 text-[10px] bg-white/5 px-2 py-0.5 rounded text-dark-subtext">
                <ImageIcon size={10} />
                Suporta colar imagens
              </span>
            </label>
            <textarea
              ref={textareaRef}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onPaste={handlePaste}
              placeholder="Adicione detalhes, especificações, razões para comprar... (Você pode colar imagens aqui)"
              className="w-full h-32 bg-dark-bg border border-white/10 rounded-lg px-3 py-2 text-sm text-dark-text focus:border-brand-500/50 outline-none resize-y"
            />
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-dark-subtext hover:text-dark-text hover:bg-white/5 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg text-sm text-white bg-brand-600 hover:bg-brand-500 transition-colors disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
