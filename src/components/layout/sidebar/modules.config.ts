import type { ComponentType } from 'react';
import {
  Home,
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
  Trash2,
  PenTool,
  CheckSquare
} from 'lucide-react';

export interface ModuleConfig {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string; size?: number | string }>;
  color?: string; // used for custom colors like trash
  isSpecial?: boolean;
}

export const MAIN_MODULES: ModuleConfig[] = [
  { id: 'home', label: 'Início', icon: Home },
  { id: 'notes', label: 'Caderno', icon: BookOpen },
  { id: 'quiz', label: 'Questões', icon: CheckSquare },
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
  { id: 'diagrams', label: 'Diagramas', icon: PenTool },
];

export const SPECIAL_MODULES: ModuleConfig[] = [
  { id: 'trash', label: 'Lixeira', icon: Trash2, color: 'red', isSpecial: true },
];

export const ALL_MODULES: ModuleConfig[] = [...MAIN_MODULES, ...SPECIAL_MODULES];

export const MODULE_CONFIG_MAP = new Map<string, ModuleConfig>(
  ALL_MODULES.map((m) => [m.id, m])
);
