import React, { useState, useEffect } from 'react';
import {
  X,
  Clapperboard,
  Tv,
  Target,
  LayoutGrid,
  Sparkles,
  CheckCircle2,
  Film,
  BookOpen,
  Gamepad2,
} from 'lucide-react';
import { Portal } from '../ui/Portal';

interface CultureHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabKey = 'basics' | 'episodes' | 'goals' | 'views' | 'recommendations';

export function CultureHelpModal({ isOpen, onClose }: CultureHelpModalProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('basics');

  useEffect(() => {
    if (!isOpen) return;

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
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <Portal>
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-in fade-in duration-200"
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-label="Guia da Área de Cultura"
          className="bg-dark-card w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row border border-white/10 h-[85vh] max-h-[700px] animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Sidebar */}
          <div className="w-full md:w-64 bg-dark-bg border-r border-white/5 p-5 flex flex-col gap-1.5 shrink-0 overflow-y-auto custom-scrollbar">
            <div className="flex items-center gap-3 mb-6 px-2">
              <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                <Clapperboard className="w-5 h-5 shrink-0" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Guia de Cultura</h2>
                <p className="text-[11px] text-dark-subtext">Mídias & Entretenimento</p>
              </div>
            </div>

            <TabButton
              active={activeTab === 'basics'}
              onClick={() => setActiveTab('basics')}
              icon={<Film size={16} />}
              label="O Básico & Mídias"
            />
            <TabButton
              active={activeTab === 'episodes'}
              onClick={() => setActiveTab('episodes')}
              icon={<Tv size={16} />}
              label="Séries & Episódios"
            />
            <TabButton
              active={activeTab === 'goals'}
              onClick={() => setActiveTab('goals')}
              icon={<Target size={16} />}
              label="Metas & Objetivos"
            />
            <TabButton
              active={activeTab === 'views'}
              onClick={() => setActiveTab('views')}
              icon={<LayoutGrid size={16} />}
              label="Modos de Exibição"
            />
            <TabButton
              active={activeTab === 'recommendations'}
              onClick={() => setActiveTab('recommendations')}
              icon={<Sparkles size={16} />}
              label="Recomendações"
            />
          </div>

          {/* Content Area */}
          <div className="flex-1 flex flex-col min-w-0 bg-dark-card">
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-semibold text-purple-400 uppercase tracking-widest">
                  Manual de Uso & Boas Práticas
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  {activeTab === 'basics' && 'Catálogo de Mídias, Status e Avaliações'}
                  {activeTab === 'episodes' && 'Acompanhamento Granular de Episódios'}
                  {activeTab === 'goals' && 'Objetivos de Consumo Cultural & Notas de Foco'}
                  {activeTab === 'views' && 'Grade Visual, Compacto e Ordenação Flexível'}
                  {activeTab === 'recommendations' && 'Sugestões Personalizadas por Gênero'}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-dark-subtext hover:text-white hover:bg-white/5 transition-colors"
                title="Fechar (Esc)"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm text-dark-text custom-scrollbar">
              {activeTab === 'basics' && (
                <>
                  <Section title="O que é o Módulo de Cultura?">
                    <p>
                      O módulo de Cultura é seu hub central para catalogar tudo o que você assiste, lê ou joga. Diga adeus a listas dispersas em múltiplos sites.
                    </p>
                  </Section>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <FeatureBox
                      icon={<Film className="text-purple-400" size={18} />}
                      title="Filmes & Cinema"
                      description="Acompanhe lançamentos, diretores, datas de estreia e dê notas pessoais aos filmes assistidos."
                    />
                    <FeatureBox
                      icon={<BookOpen className="text-amber-400" size={18} />}
                      title="Livros & HQs"
                      description="Marque páginas lidas, capítulos e registre citações marcantes de cada leitura."
                    />
                    <FeatureBox
                      icon={<Gamepad2 className="text-cyan-400" size={18} />}
                      title="Jogos & Games"
                      description="Acompanhe backlog, tempo investido e status de conclusão (zerado, 100%, platina)."
                    />
                  </div>

                  <TipBox text="Ao adicionar um item, você pode colar uma URL de pôster de alta resolução para deixar sua galeria com acabamento de streaming premium." />
                </>
              )}

              {activeTab === 'episodes' && (
                <>
                  <Section title="Controle de Séries, Animes & Temporadas">
                    <p>
                      Para mídias episódicas (séries de TV, animes e minisséries), o sistema permite registrar o progresso temporada por temporada:
                    </p>
                  </Section>

                  <Section title="Recursos do Rastreador de Episódios">
                    <ul className="space-y-2.5">
                      <ListItem title="Marcação com 1 Clique">
                        Clique diretamente no número do episódio para marcá-lo como assistido e atualizar a barra de progresso instantaneamente.
                      </ListItem>
                      <ListItem title="Próximo Episódio Sugerido">
                        O card principal sempre indica qual é o próximo episódio pendente na sua lista para você não perder o fio da meada.
                      </ListItem>
                      <ListItem title="Lançamentos Recentes">
                        O cabeçalho exibe novos episódios lançados recentemente das séries que você está assistindo ativamente.
                      </ListItem>
                    </ul>
                  </Section>
                </>
              )}

              {activeTab === 'goals' && (
                <>
                  <Section title="Metas & Objetivos Culturais">
                    <p>
                      Quer se comprometer a finalizar uma trilogia de livros antes do fim do mês ou zerar um RPG longo nas férias?
                    </p>
                  </Section>

                  <Section title="Como Funciona a Seção de Objetivos:">
                    <ul className="space-y-2.5">
                      <ListItem title="Fixar no Topo">
                        Marque qualquer item como "🎯 Objetivo Ativo". Ele será automaticamente pinado em uma seção de destaque no topo da tela.
                      </ListItem>
                      <ListItem title="Nota de Foco">
                        Adicione um lembrete pessoal (ex: "Ler 20 páginas por dia antes de dormir" ou "Jogar aos sábados à tarde").
                      </ListItem>
                      <ListItem title="Conclusão Automática">
                        Ao atingir 100% de progresso, o item é desmarcado da meta ativa e transferido com honras para a seção de concluídos.
                      </ListItem>
                    </ul>
                  </Section>
                </>
              )}

              {activeTab === 'views' && (
                <>
                  <Section title="Modos de Exibição & Organização">
                    <p>
                      Adapte o visual do módulo ao tamanho da sua tela ou à densidade de informação que você prefere:
                    </p>
                  </Section>

                  <div className="space-y-3">
                    <StepItem
                      number="1"
                      title="Grade Visual (Posters)"
                      description="Cartões com arte de capa generosa, ideal para explorar visualmente seu acervo em telas grandes."
                    />
                    <StepItem
                      number="2"
                      title="Modo Compacto"
                      description="Cards horizontais compactos que priorizam densidade de itens por tela sem abrir mão das cores de capa."
                    />
                    <StepItem
                      number="3"
                      title="Lista Textual"
                      description="Visão tabular enxuta perfeita para checar status, notas e datas em listas com centenas de itens."
                    />
                  </div>

                  <TipBox text="Você pode arrastar e reordenar as seções temáticas de categorias (Filmes, Séries, Games) usando os controles de ordenação personalizada." />
                </>
              )}

              {activeTab === 'recommendations' && (
                <>
                  <Section title="Sugestões & Descoberta">
                    <p>
                      Descubra novas obras para colocar na sua fila com base no que você mais avaliou positivamente:
                    </p>
                  </Section>

                  <Section title="Dicas de Aproveitamento:">
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 size={16} className="text-purple-400 shrink-0 mt-0.5" />
                        <span><strong>Avalie com Estrelas:</strong> Itens com nota alta (4 a 5 estrelas) refinam o radar de recomendações de obras afins.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 size={16} className="text-purple-400 shrink-0 mt-0.5" />
                        <span><strong>Mídias Mistas:</strong> Alterne entre filtros de cinema, literatura e games para diversificar seu tempo de lazer.</span>
                      </li>
                    </ul>
                  </Section>
                </>
              )}
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
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left ${
        active
          ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20 shadow-sm'
          : 'text-dark-subtext hover:text-white hover:bg-white/5'
      }`}
    >
      <span className={active ? 'text-purple-400' : 'text-dark-subtext'}>{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-white tracking-wide">{title}</h4>
      <div className="text-xs text-dark-subtext leading-relaxed space-y-2">{children}</div>
    </div>
  );
}

function FeatureBox({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="p-3.5 rounded-xl bg-dark-bg/60 border border-white/5 flex flex-col gap-2">
      <div className="p-2 rounded-lg bg-white/5 w-fit">{icon}</div>
      <h5 className="text-xs font-bold text-white">{title}</h5>
      <p className="text-[11px] text-dark-subtext leading-relaxed">{description}</p>
    </div>
  );
}

function ListItem({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-xs text-dark-subtext">
      <CheckCircle2 size={15} className="text-purple-400 shrink-0 mt-0.5" />
      <div>
        <strong className="text-zinc-200">{title}: </strong>
        <span>{children}</span>
      </div>
    </li>
  );
}

function StepItem({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-dark-bg/40 border border-white/5">
      <div className="w-6 h-6 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 font-bold text-xs flex items-center justify-center shrink-0">
        {number}
      </div>
      <div>
        <h5 className="text-xs font-bold text-white">{title}</h5>
        <p className="text-[11px] text-dark-subtext mt-0.5 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function TipBox({ text }: { text: string }) {
  return (
    <div className="p-3.5 rounded-xl bg-purple-500/5 border border-purple-500/15 flex items-center gap-3">
      <div className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
      <p className="text-xs text-purple-300/90 leading-relaxed">
        <strong>Dica Pro:</strong> {text}
      </p>
    </div>
  );
}

export default CultureHelpModal;
