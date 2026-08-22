import { useRef, useEffect } from 'react';
import { Folder, FolderPlus, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import type { VideoCollection } from '../hooks/useVideoCollections';

interface VideoFolderCardProps {
  collection: VideoCollection;
  isList: boolean;
  isCompact: boolean;
  isRenaming: boolean;
  renameValue: string;
  onRenameChange: (val: string) => void;
  onRenameSubmit: (id: string) => void;
  onCancelRename: () => void;
  onStartRename: (col: VideoCollection) => void;
  onSelect: (id: string, name: string) => void;
  onDelete?: (id: string) => void;
}

export function VideoFolderCard({
  collection: col,
  isList,
  isCompact,
  isRenaming,
  renameValue,
  onRenameChange,
  onRenameSubmit,
  onCancelRename,
  onStartRename,
  onSelect,
  onDelete,
}: VideoFolderCardProps) {
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
    }
  }, [isRenaming]);

  return (
    <div
      className={`cursor-pointer group relative bg-white/5 border border-white/10 rounded-xl overflow-hidden transition-all duration-300 ${
        isList
          ? 'hover:bg-white/10 flex items-center p-2 gap-4'
          : 'hover:shadow-xl hover:shadow-brand-500/10 hover:-translate-y-1 flex-col'
      }`}
    >
      {!isCompact && (
        <div
          className={`${
            isList ? 'w-40 flex-shrink-0 rounded-lg overflow-hidden' : 'w-full'
          } aspect-video bg-black/40 relative flex items-center justify-center`}
          onClick={() => onSelect(col.id, col.name)}
        >
          <div className="w-full h-full bg-gradient-to-tr from-brand-900/40 to-brand-500/10 absolute inset-0"></div>
          <Folder
            size={32}
            className="text-brand-400 opacity-80 group-hover:scale-110 transition-transform relative z-10"
          />
          <div className="absolute bottom-2 right-2 bg-black/60 px-1.5 py-0.5 rounded text-[10px] font-medium text-white tracking-wider backdrop-blur-md z-10 border border-white/10">
            {col.count} {col.count === 1 ? 'vídeo' : 'vídeos'}
          </div>
        </div>
      )}

      <div
        className={`${isList ? 'flex-1 p-2' : 'p-3'} flex items-center justify-between gap-2`}
        onClick={() => {
          if (!isRenaming) onSelect(col.id, col.name);
        }}
      >
        {isCompact && (
          <div
            className="flex-shrink-0 text-brand-500 opacity-80 group-hover:opacity-100 transition-opacity"
            onClick={() => onSelect(col.id, col.name)}
          >
            <Folder size={20} className="ml-1 mr-2" />
          </div>
        )}
        <div
          className="flex-1 overflow-hidden"
          onClick={() => {
            if (!isRenaming) onSelect(col.id, col.name);
          }}
        >
          {isRenaming ? (
            <input
              ref={renameInputRef}
              value={renameValue}
              onChange={(e) => onRenameChange(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter') onRenameSubmit(col.id);
                if (e.key === 'Escape') onCancelRename();
              }}
              onBlur={() => onRenameSubmit(col.id)}
              onClick={(e) => e.stopPropagation()}
              className="bg-transparent border-b border-brand-500/50 text-white text-sm py-0.5 px-0 w-full focus:outline-none focus:border-brand-400"
            />
          ) : (
            <>
              <h3
                className={`text-white font-medium truncate ${isList ? 'text-sm' : 'text-xs'}`}
                title={col.name}
              >
                {col.name}
              </h3>
              {isList && !isCompact && (
                <p className="text-xs text-brand-400/80 mt-1">
                  {col.count} {col.count === 1 ? 'vídeo' : 'vídeos'}
                </p>
              )}
            </>
          )}
        </div>
        {isCompact && (
          <div className="text-xs font-medium text-brand-400/80 bg-brand-500/10 px-2 py-1 rounded mr-2">
            {col.count}
          </div>
        )}

        {/* Folder Context Menu */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              className="text-white/40 hover:text-white p-1.5 rounded-md hover:bg-white/10 transition-colors focus:outline-none flex-shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical size={14} />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="z-50 min-w-[160px] bg-dark-card border border-white/10 rounded-xl p-1.5 shadow-2xl animate-in fade-in zoom-in-95 data-[side=bottom]:slide-in-from-top-2"
              sideOffset={5}
              align="end"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenu.Item
                className="flex items-center gap-2 px-2 py-1.5 text-xs text-white/80 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer outline-none transition-colors"
                onSelect={() => onStartRename(col)}
              >
                <Pencil size={14} />
                Renomear
              </DropdownMenu.Item>
              <DropdownMenu.Separator className="h-px bg-white/10 my-1 mx-1" />
              <DropdownMenu.Item
                className="flex items-center gap-2 px-2 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg cursor-pointer outline-none transition-colors"
                onSelect={() => {
                  if (onDelete) onDelete(col.id);
                }}
              >
                <Trash2 size={14} />
                Excluir pasta
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </div>
  );
}

interface NewFolderCardProps {
  isCreating: boolean;
  isList: boolean;
  isCompact: boolean;
  newFolderName: string;
  onNameChange: (val: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  onStartCreate: () => void;
}

export function NewFolderCard({
  isCreating,
  isList,
  isCompact,
  newFolderName,
  onNameChange,
  onSubmit,
  onCancel,
  onStartCreate,
}: NewFolderCardProps) {
  const newFolderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCreating && newFolderInputRef.current) {
      newFolderInputRef.current.focus();
    }
  }, [isCreating]);

  if (isCreating) {
    return (
      <div
        className={`bg-white/5 border border-brand-500/30 rounded-xl overflow-hidden ${
          isList ? 'flex items-center p-2 gap-4' : 'flex-col'
        }`}
      >
        {!isCompact && (
          <div
            className={`${
              isList ? 'w-40 flex-shrink-0 rounded-lg overflow-hidden' : 'w-full'
            } aspect-video bg-black/40 relative flex items-center justify-center`}
          >
            <div className="w-full h-full bg-gradient-to-tr from-brand-900/40 to-brand-500/10 absolute inset-0"></div>
            <FolderPlus size={32} className="text-brand-400 opacity-80 relative z-10" />
          </div>
        )}
        <div className={`${isList ? 'flex-1 p-2' : 'p-3'} flex items-center gap-2`}>
          {isCompact && (
            <FolderPlus size={20} className="text-brand-400 ml-1 mr-2 flex-shrink-0" />
          )}
          <input
            ref={newFolderInputRef}
            value={newFolderName}
            onChange={(e) => onNameChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSubmit();
              if (e.key === 'Escape') onCancel();
            }}
            onBlur={onSubmit}
            placeholder="Nome da pasta..."
            className="flex-1 bg-transparent border-b border-brand-500/50 text-white text-sm py-1 px-1 focus:outline-none focus:border-brand-400 placeholder:text-white/30"
          />
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onStartCreate}
      className={`cursor-pointer group bg-white/[0.02] border border-dashed border-white/10 hover:border-brand-500/30 rounded-xl overflow-hidden transition-all duration-300 ${
        isList ? 'flex items-center p-2 gap-4' : 'flex-col'
      }`}
    >
      {!isCompact && (
        <div
          className={`${
            isList ? 'w-40 flex-shrink-0 rounded-lg overflow-hidden' : 'w-full'
          } aspect-video bg-transparent relative flex items-center justify-center`}
        >
          <FolderPlus
            size={28}
            className="text-white/20 group-hover:text-brand-400/60 transition-colors"
          />
        </div>
      )}
      <div className={`${isList ? 'flex-1 p-2' : 'p-3'} flex items-center gap-2`}>
        {isCompact && (
          <FolderPlus
            size={20}
            className="text-white/20 group-hover:text-brand-400/60 ml-1 mr-2 flex-shrink-0 transition-colors"
          />
        )}
        <span className="text-white/30 group-hover:text-white/60 text-xs font-medium transition-colors">
          Nova Pasta
        </span>
      </div>
    </div>
  );
}
