import {
  BookOpen,
  Library,
  Wallet,
  Film,
  PlaySquare,
  BrainCircuit,
  Timer,
  Calendar as CalendarIcon,
  FolderOpen,
  Shield,
  Mic,
  Trash2
} from 'lucide-react';

export interface ModuleConfig {
  id: string;
  label: string;
  icon: any;
  color?: string; // used for custom colors like trash
  isSpecial?: boolean;
}

export const MAIN_MODULES: ModuleConfig[] = [
  { id: 'notes', label: 'Caderno', icon: BookOpen },
  { id: 'library', label: 'Biblioteca', icon: Library },
  { id: 'finance', label: 'Finanças', icon: Wallet },
  { id: 'culture', label: 'Cultura', icon: Film },
  { id: 'video', label: 'Vídeos', icon: PlaySquare },
  { id: 'anki', label: 'Flashcards', icon: BrainCircuit },
  { id: 'focus', label: 'Foco', icon: Timer },
  { id: 'calendar', label: 'Agenda', icon: CalendarIcon },
  { id: 'files', label: 'Arquivos', icon: FolderOpen },
  { id: 'vault', label: 'Cofre', icon: Shield },
  { id: 'practice', label: 'Prática', icon: Mic },
];

export const SPECIAL_MODULES: ModuleConfig[] = [
  { id: 'trash', label: 'Lixeira', icon: Trash2, color: 'red', isSpecial: true },
];
