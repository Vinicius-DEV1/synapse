import React, { useState, useEffect } from 'react';
import {
  X,
  Wallet,
  Building2,
  ArrowLeftRight,
  HandCoins,
  Heart,
  TrendingUp,
  TrendingDown,
  PieChart,
  CheckCircle2,
} from 'lucide-react';
import { Portal } from '../ui/Portal';

interface FinanceHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabKey = 'overview' | 'accounts' | 'transactions' | 'loans' | 'wishlist';

export function FinanceHelpModal({ isOpen, onClose }: FinanceHelpModalProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

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
          aria-label="Guia do Sistema Financeiro"
          className="bg-dark-card w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row border border-white/10 h-[85vh] max-h-[700px] animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Sidebar */}
          <div className="w-full md:w-64 bg-dark-bg border-r border-white/5 p-5 flex flex-col gap-1.5 shrink-0 overflow-y-auto custom-scrollbar">
            <div className="flex items-center gap-3 mb-6 px-2">
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Wallet className="w-5 h-5 shrink-0" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Guia Financeiro</h2>
                <p className="text-[11px] text-dark-subtext">Gestão & Patrimônio</p>
              </div>
            </div>

            <TabButton
              active={activeTab === 'overview'}
              onClick={() => setActiveTab('overview')}
              icon={<PieChart size={16} />}
              label="Visão Geral & Dashboard"
            />
            <TabButton
              active={activeTab === 'accounts'}
              onClick={() => setActiveTab('accounts')}
              icon={<Building2 size={16} />}
              label="Contas & Bancos"
            />
            <TabButton
              active={activeTab === 'transactions'}
              onClick={() => setActiveTab('transactions')}
              icon={<ArrowLeftRight size={16} />}
              label="Receitas & Despesas"
            />
            <TabButton
              active={activeTab === 'loans'}
              onClick={() => setActiveTab('loans')}
              icon={<HandCoins size={16} />}
              label="Empréstimos & Dívidas"
            />
            <TabButton
              active={activeTab === 'wishlist'}
              onClick={() => setActiveTab('wishlist')}
              icon={<Heart size={16} />}
              label="Lista de Desejos (Metas)"
            />
          </div>

          {/* Content Area */}
          <div className="flex-1 flex flex-col min-w-0 bg-dark-card">
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-widest">
                  Manual de Uso & Boas Práticas
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  {activeTab === 'overview' && 'Dashboard Financeiro & Métricas Consolidadas'}
                  {activeTab === 'accounts' && 'Gestão de Contas Bancárias & Saldos'}
                  {activeTab === 'transactions' && 'Lançamentos, Categorias & Transferências'}
                  {activeTab === 'loans' && 'Controle de Empréstimos e Amortizações'}
                  {activeTab === 'wishlist' && 'Lista de Desejos, Prioridades & Aquisições'}
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
              {activeTab === 'overview' && (
                <>
                  <Section title="O que é o Dashboard Financeiro?">
                    <p>
                      O Dashboard oferece uma visão instantânea da sua saúde financeira atual. Ele consolida automaticamente todas as movimentações de suas contas bancárias, calculando o saldo líquido real, receitas totais do período e despesas acumuladas.
                    </p>
                  </Section>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <FeatureBox
                      icon={<TrendingUp className="text-emerald-400" size={18} />}
                      title="Receitas"
                      description="Soma de todos os recebimentos e salários cadastrados no mês ou período selecionado."
                    />
                    <FeatureBox
                      icon={<TrendingDown className="text-rose-400" size={18} />}
                      title="Despesas"
                      description="Gastos categorizados com controle em tempo real para evitar estouro de orçamento."
                    />
                    <FeatureBox
                      icon={<Wallet className="text-brand-400" size={18} />}
                      title="Saldo Líquido"
                      description="Patrimônio disponível nas contas ativas após todas as entradas e saídas."
                    />
                  </div>

                  <TipBox text="Você pode clicar em um cartão de conta bancária específico no topo do Dashboard para filtrar instantaneamente todo o painel e os extratos apenas para aquela instituição financeira." />
                </>
              )}

              {activeTab === 'accounts' && (
                <>
                  <Section title="Múltiplas Contas & Instituições">
                    <p>
                      Cadastre quantas contas forem necessárias: Conta Corrente (ex: Nubank, Inter), Conta Poupança, Carteira Física em Dinheiro ou Corretoras de Investimento.
                    </p>
                  </Section>

                  <Section title="Recursos Principais de Contas">
                    <ul className="space-y-2.5">
                      <ListItem title="Saldo Inicial">
                        Ao cadastrar uma conta, defina o saldo com o qual você está iniciando o controle. Todas as novas receitas e despesas vinculadas a ela atualizarão o saldo automaticamente.
                      </ListItem>
                      <ListItem title="Transferência entre Contas">
                        Ao mover dinheiro entre duas contas suas (ex: Corrente para Poupança), escolha a operação "Transferência". O sistema debita da origem e credita no destino sem distorcer suas estatísticas de despesa ou receita real.
                      </ListItem>
                      <ListItem title="Filtro Instantâneo">
                        Selecione "Todas as Contas" para uma visão patrimonial geral ou clique em um banco específico para auditar extratos individuais.
                      </ListItem>
                    </ul>
                  </Section>
                </>
              )}

              {activeTab === 'transactions' && (
                <>
                  <Section title="Lançamento Rápido de Transações">
                    <p>
                      Mantenha seu fluxo de caixa impecável lançando cada movimento assim que ele ocorrer, seja no Desktop ou no Celular:
                    </p>
                  </Section>

                  <div className="space-y-3">
                    <StepItem
                      number="1"
                      title="Clique em 'Nova Transação'"
                      description="Use o botão azul no cabeçalho ou o atalho de teclado correspondente."
                    />
                    <StepItem
                      number="2"
                      title="Defina o Tipo e Categoria"
                      description="Escolha entre Receita (+), Despesa (-) ou Transferência. Associe uma categoria temática (Alimentação, Moradia, Transporte, Lazer, etc.)."
                    />
                    <StepItem
                      number="3"
                      title="Informe o Valor e Data"
                      description="Valores monetários com formatação decimal intuitiva e possibilidade de registrar gastos retroativos ou programados."
                    />
                  </div>

                  <TipBox text="Categorias colapsáveis permitem contrair ou expandir grupos de despesas no extrato para facilitar a leitura visual rápida." />
                </>
              )}

              {activeTab === 'loans' && (
                <>
                  <Section title="Controle de Empréstimos & Dívidas">
                    <p>
                      Nunca mais perca o controle do dinheiro emprestado a amigos ou de financiamentos e parcelamentos a quitar:
                    </p>
                  </Section>

                  <Section title="Fluxo de Pagamento Inteligente">
                    <ul className="space-y-2.5">
                      <ListItem title="A Pagar vs A Receber">
                        Separação visual nítida entre valores devidos (dívidas) e valores que terceiros devem devolver a você.
                      </ListItem>
                      <ListItem title="Amortização Parcial">
                        Ao receber ou pagar uma parte do valor, você pode abater o montante sem fechar o registro, mantendo o saldo remanescente visível.
                      </ListItem>
                      <ListItem title="Vinculação Bancária">
                        Ao quitar um empréstimo, selecione de qual conta bancária o valor saiu (ou para qual conta o pagamento entrou), mantendo seus saldos sincronizados.
                      </ListItem>
                    </ul>
                  </Section>
                </>
              )}

              {activeTab === 'wishlist' && (
                <>
                  <Section title="Lista de Desejos & Planejamento de Metas">
                    <p>
                      Evite compras por impulso! Registre itens que deseja adquirir no futuro, associe valores estimados, links de referência e níveis de urgência/desejo.
                    </p>
                  </Section>

                  <Section title="Como Utilizar a Wishlist:">
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                        <span><strong>Priorização:</strong> Classifique seus desejos para focar no que realmente agrega valor.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                        <span><strong>Conversão em Despesa:</strong> Ao finalmente comprar o item, você pode convertê-lo diretamente em uma transação financeira na conta bancária desejada.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                        <span><strong>Auditoria de Gastos:</strong> Mantenha registro dos sonhos já realizados e do montante investido em realizações pessoais.</span>
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
          ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 shadow-sm'
          : 'text-dark-subtext hover:text-white hover:bg-white/5'
      }`}
    >
      <span className={active ? 'text-emerald-400' : 'text-dark-subtext'}>{icon}</span>
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
      <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
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
      <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0">
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
    <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/15 flex items-center gap-3">
      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
      <p className="text-xs text-emerald-300/90 leading-relaxed">
        <strong>Dica Pro:</strong> {text}
      </p>
    </div>
  );
}

export default FinanceHelpModal;
