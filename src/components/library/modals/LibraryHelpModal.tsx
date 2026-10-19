import React, { useState, useEffect } from 'react';
import {
  X,
  BookOpen,
  Layers,
  Filter,
  FileText,
  Highlighter,
  Keyboard,
  Cloud,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { Portal } from '../../ui/Portal';

interface LibraryHelpModalProps {
  onClose: () => void;
}

type TabKey =
  | 'overview'
  | 'collections'
  | 'filters'
  | 'pdf_reader'
  | 'highlights'
  | 'shortcuts';

export function LibraryHelpModal({ onClose }: LibraryHelpModalProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    const handleBackPress = (e: Event) => {
      e.preventDefault();
      onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('caderno-back-press', handleBackPress);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('caderno-back-press', handleBackPress);
    };
  }, [onClose]);

  return (
    <Portal>
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-in fade-in duration-200"
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-label="Guia do Usuário da Biblioteca"
          className="bg-dark-card w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row border border-white/[0.06] h-[85vh] max-h-[720px] animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Sidebar */}
          <div className="w-full md:w-64 bg-dark-bg border-r border-white/5 p-5 flex flex-col gap-1.5 shrink-0 overflow-y-auto custom-scrollbar">
            <div className="flex items-center gap-3 mb-6 px-2">
              <div className="p-2 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400">
                <BookOpen className="w-5 h-5 shrink-0" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Guia da Biblioteca</h2>
                <p className="text-[11px] text-dark-subtext">Manual e funcionalidades</p>
              </div>
            </div>

            <TabButton
              active={activeTab === 'overview'}
              onClick={() => setActiveTab('overview')}
              icon={<BookOpen size={16} />}
              label="O Básico & Formatos"
            />
            <TabButton
              active={activeTab === 'collections'}
              onClick={() => setActiveTab('collections')}
              icon={<Layers size={16} />}
              label="Coleções & Decks 3D"
            />
            <TabButton
              active={activeTab === 'filters'}
              onClick={() => setActiveTab('filters')}
              icon={<Filter size={16} />}
              label="Filtros & Arquivo"
            />
            <TabButton
              active={activeTab === 'pdf_reader'}
              onClick={() => setActiveTab('pdf_reader')}
              icon={<FileText size={16} />}
              label="Leitor & Temas"
            />
            <TabButton
              active={activeTab === 'highlights'}
              onClick={() => setActiveTab('highlights')}
              icon={<Highlighter size={16} />}
              label="Marcações & Notas"
            />
            <TabButton
              active={activeTab === 'shortcuts'}
              onClick={() => setActiveTab('shortcuts')}
              icon={<Keyboard size={16} />}
              label="Atalhos de Teclado"
            />
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto relative p-6 md:p-8 custom-scrollbar">
            <button
              onClick={onClose}
              className="absolute top-5 right-5 p-2 text-dark-subtext hover:text-white hover:bg-white/10 rounded-xl transition-colors z-10"
              title="Fechar (Esc)"
            >
              <X size={18} />
            </button>

            <div className="max-w-2xl mx-auto">
              {activeTab === 'overview' && <OverviewTab />}
              {activeTab === 'collections' && <CollectionsTab />}
              {activeTab === 'filters' && <FiltersTab />}
              {activeTab === 'pdf_reader' && <PdfReaderTab />}
              {activeTab === 'highlights' && <HighlightsTab />}
              {activeTab === 'shortcuts' && <ShortcutsTab />}
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all text-xs font-medium ${
        active
          ? 'bg-brand-500/15 text-brand-300 border border-brand-500/25 shadow-sm'
          : 'text-dark-subtext hover:bg-white/5 hover:text-white'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

/* Tab 1: Overview */
function OverviewTab() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-white mb-2">Visão Geral da Biblioteca</h3>
        <p className="text-sm text-dark-subtext leading-relaxed">
          A Biblioteca do Caderno é um ecossistema completo para leitura, anotação e catalogação de
          livros digitais, com suporte nativo a <strong>PDFs</strong> e <strong>EPUBs</strong>, OCR em
          segundo plano e sincronização em nuvem.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
          <div className="flex items-center gap-2 text-brand-400 font-semibold text-sm">
            <FileText size={16} />
            <span>Formatos Suportados</span>
          </div>
          <p className="text-xs text-dark-subtext leading-relaxed">
            Abra livros em <strong>PDF</strong> com renderização gráfica vetorial de alta definição e
            arquivos <strong>EPUB</strong> com paginação fluida e controle tipográfico.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
          <div className="flex items-center gap-2 text-blue-400 font-semibold text-sm">
            <Cloud size={16} />
            <span>Sincronização Google Drive</span>
          </div>
          <p className="text-xs text-dark-subtext leading-relaxed">
            Conecte sua conta do Google Drive para armazenar e sincronizar livros, posições de leitura,
            marcadores e notas em todos os seus dispositivos.
          </p>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-brand-500/10 border border-brand-500/20 text-xs text-brand-200 leading-relaxed space-y-1">
        <span className="font-semibold text-brand-300 flex items-center gap-1.5">
          <Sparkles size={14} /> Dica de Importação:
        </span>
        <p>
          Clique no botão <strong>"Importar Livro"</strong> no canto superior direito para selecionar arquivos do seu computador, ou selecione múltiplos livros para adicionar de uma só vez.
        </p>
      </div>
    </div>
  );
}

/* Tab 2: Collections */
function CollectionsTab() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-white mb-2">Coleções & Cards em Deck 3D</h3>
        <p className="text-sm text-dark-subtext leading-relaxed">
          Organize seus livros em coleções temáticas com apresentação visual inspirada em decks de
          capas reais com inclinações calculadas e iluminação sutil.
        </p>
      </div>

      <div className="space-y-3">
        <FeatureItem
          title="Modo de Visualização em Coleções"
          description="Alterne entre as abas 'Livros' e 'Coleções' no topo da tela para ver seus grupos organizados ou a estante completa de títulos."
        />
        <FeatureItem
          title="Deck de Capas em 3D"
          description="Cada card de coleção exibe até 3 capas reais dos livros contidos na coleção, com inclinações fanning (-6°, +6°, 0°) e profundidade de sombras tridimensionais."
        />
        <FeatureItem
          title="Paleta Curada de 10 Cores"
          description="Personalize cada coleção com tons elegantes (Índigo, Violeta, Púrpura, Rosa, Carmesim, Âmbar, Esmeralda, Ciano, Azul, Lima) com prévia em tempo real."
        />
        <FeatureItem
          title="Atribuição de Livros em Massa"
          description="Selecione múltiplos livros na estante segurando Ctrl ou marcando os itens para exibir a barra inferior de ações e adicioná-los a qualquer coleção com 1 clique."
        />
      </div>
    </div>
  );
}

/* Tab 3: Filters & Archive */
function FiltersTab() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-white mb-2">Filtros Avançados & Arquivamento</h3>
        <p className="text-sm text-dark-subtext leading-relaxed">
          Localize qualquer livro instantaneamente com filtros multi-critério combinados e mantenha sua
          estante organizada arquivando leituras finalizadas.
        </p>
      </div>

      <div className="space-y-3">
        <FeatureItem
          title="Filtro Rápido por Formato"
          description="Filtre entre Todos os livros, apenas PDFs ou apenas EPUBs diretamente pelos botões de formato no cabeçalho."
        />
        <FeatureItem
          title="Barra de Chips de Filtros Ativos"
          description="Veja claramente todos os filtros aplicados (Busca, Status, Coleção, Autor, Formato). Remova filtros individualmente clicando no 'X' de cada chip ou clique em 'Limpar filtros'."
        />
        <FeatureItem
          title="Arquivamento de Livros"
          description="Livros arquivados não poluem sua estante principal de livros ativos. Acesse-os a qualquer momento clicando no botão 'Arquivados' no cabeçalho."
        />
        <FeatureItem
          title="Arquivar / Desarquivar em Massa"
          description="Pelo menu de 3 pontos de qualquer livro ou selecionando múltiplos livros na barra de ações, você pode arquivar ou desarquivar obras instantaneamente."
        />
      </div>
    </div>
  );
}

/* Tab 4: PDF Reader */
function PdfReaderTab() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-white mb-2">Leitor de PDF & Modos de Leitura</h3>
        <p className="text-sm text-dark-subtext leading-relaxed">
          Experiência de leitura imersiva e de alta performance projetada para estudos longos sem fadiga
          ocular.
        </p>
      </div>

      <div className="space-y-3">
        <FeatureItem
          title="Gestos Touch Mobile: Pinça com 2 Dedos (Pinch-to-zoom)"
          description="Aproxime ou afaste dois dedos em qualquer ponto da tela para dar zoom contínuo e suave de 50% até 300%, preservando o ponto focal exatamente sob seus dedos."
        />
        <FeatureItem
          title="Arrastar e Deslizar para os Lados (Panning Horizontal)"
          description="Quando a página estiver ampliada além das bordas da tela, deslize livremente com 1 dedo para os lados sem nenhum corte de texto ou travamento de margem."
        />
        <FeatureItem
          title="Duplo Toque Rápido para Zoom Inteligente"
          description="Dê dois toques rápidos com 1 dedo sobre qualquer parágrafo para aproximar a leitura a 185%; dê mais dois toques para afastar de volta para 100% ou largura da tela."
        />
        <FeatureItem
          title="Ajuste Automático à Largura da Tela (Fit to Width)"
          description="Ao abrir um livro no celular, a página se ajusta automaticamente à largura do display. No leitor, use o botão de ajuste horizontal na barra flutuante ou o atalho 'W'."
        />
        <FeatureItem
          title="Tela Cheia com Tecla 'F'"
          description="Pressione a tecla 'F' a qualquer momento para ocultar todas as barras de ferramentas e entrar no modo de foco imersivo, sem interferir no duplo clique de seleção de palavras."
        />
        <FeatureItem
          title="8 Temas e Modos de Cor"
          description="Alterne instantaneamente entre os temas Claro, Sépia, Menta, Dim, Nord, Meia-noite, Escuro e Alto Contraste usando o botão de tema ou a tecla 'M'."
        />
        <FeatureItem
          title="OCR Inteligente em Segundo Plano"
          description="PDFs digitalizados ou escaneados sem camada de texto nativa são processados automaticamente por workers Web com OCR para permitir seleção e marcação de texto."
        />
        <FeatureItem
          title="Dicionário Contextual Integrado"
          description="Selecione qualquer palavra e use o botão de dicionário na barra flutuante para ver definições e sinônimos sem sair do fluxo de leitura."
        />
      </div>
    </div>
  );
}

/* Tab 5: Highlights & Notes */
function HighlightsTab() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-white mb-2">Marcações de Texto & Notas</h3>
        <p className="text-sm text-dark-subtext leading-relaxed">
          Destaque trechos essenciais com uniformidade homogênea em padrão Kindle e gerencie suas notas
          de estudo com fluidez.
        </p>
      </div>

      <div className="space-y-3">
        <FeatureItem
          title="Marcação Homogênea em Linha Única"
          description="O algoritmo de fusão unifica palavras adjacentes em barras contínuas e lisas, eliminando costuras e divisórias feias entre palavras."
        />
        <FeatureItem
          title="Prévia de Notas ao Passar o Mouse (Hover)"
          description="Passe o cursor sobre qualquer marcação com anotação para visualizar imediatamente o texto da nota em um tooltip elegante e discreto."
        />
        <FeatureItem
          title="Inspetor Completo ao Clicar"
          description="Clique na marcação para abrir o painel de opções: altere entre 5 cores (Amarelo, Verde, Azul, Rosa, Laranja), edite notas inline, copie o texto ou remova o destaque no 1º clique."
        />
        <FeatureItem
          title="Painel Lateral de Anotações"
          description="Pressione 'S' para abrir o painel lateral com todas as notas e marcadores do livro agrupados por página, com busca interna rápida."
        />
      </div>
    </div>
  );
}

/* Tab 6: Shortcuts */
function ShortcutsTab() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-white mb-2">Atalhos de Teclado & Gestos</h3>
        <p className="text-sm text-dark-subtext leading-relaxed">
          Controle sua leitura com velocidade e zero fadiga no computador ou no celular.
        </p>
      </div>

      <div className="rounded-xl border border-white/10 overflow-hidden bg-white/[0.02]">
        <table className="w-full text-xs text-left">
          <thead className="bg-white/5 border-b border-white/10 text-white/70">
            <tr>
              <th className="py-2.5 px-4 font-semibold">Atalho / Gesto</th>
              <th className="py-2.5 px-4 font-semibold">Ação</th>
              <th className="py-2.5 px-4 font-semibold">Contexto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-white/90">
            <ShortcutRow shortcut="Pinça (2 dedos)" action="Zoom contínuo suave (50% a 300%)" context="Mobile / Touch" />
            <ShortcutRow shortcut="Duplo Toque" action="Alternar zoom (Largura da tela <-> 185%)" context="Mobile / Touch" />
            <ShortcutRow shortcut="Arrastar (1 dedo)" action="Rolagem livre bidirecional (X e Y)" context="Mobile / Touch" />
            <ShortcutRow shortcut="W" action="Ajustar página à largura da tela" context="Leitor de PDF" />
            <ShortcutRow shortcut="F" action="Alternar tela cheia / ocultar barras" context="Leitor de PDF" />
            <ShortcutRow shortcut="Ctrl + F" action="Abrir barra de busca no livro" context="Leitor de PDF" />
            <ShortcutRow shortcut="B" action="Adicionar / remover marcador da página" context="Leitor de PDF" />
            <ShortcutRow shortcut="S" action="Abrir / fechar painel de anotações e sumário" context="Leitor de PDF" />
            <ShortcutRow shortcut="M" action="Alternar entre os 8 modos de leitura / cores" context="Leitor de PDF" />
            <ShortcutRow shortcut="Ctrl + +" action="Aumentar zoom (+25%)" context="Leitor de PDF" />
            <ShortcutRow shortcut="Ctrl + -" action="Diminuir zoom (-25%)" context="Leitor de PDF" />
            <ShortcutRow shortcut="Ctrl + 0" action="Resetar zoom para 100%" context="Leitor de PDF" />
            <ShortcutRow shortcut="Esc" action="Fechar modais, busca, notas ou voltar à estante" context="Global" />
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ShortcutRow({
  shortcut,
  action,
  context,
}: {
  shortcut: string;
  action: string;
  context: string;
}) {
  return (
    <tr className="hover:bg-white/[0.02] transition-colors">
      <td className="py-2.5 px-4 font-mono font-bold text-brand-300">
        <span className="px-2 py-0.5 rounded bg-white/10 border border-white/10 text-[11px]">
          {shortcut}
        </span>
      </td>
      <td className="py-2.5 px-4 text-white/90">{action}</td>
      <td className="py-2.5 px-4 text-white/50">{context}</td>
    </tr>
  );
}

function FeatureItem({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
      <div className="flex items-center gap-2 text-white font-semibold text-xs">
        <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
        <span>{title}</span>
      </div>
      <p className="text-xs text-dark-subtext leading-relaxed pl-5">{description}</p>
    </div>
  );
}
