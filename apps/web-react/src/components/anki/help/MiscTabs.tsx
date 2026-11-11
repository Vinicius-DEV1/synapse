import { BrainCircuit, Search, Tag } from 'lucide-react';

export function AiCorrectionTab() {
  return (
    <div className="space-y-6 animate-fade-in">
      <h3 className="text-2xl font-bold text-white mb-2">Correção com Inteligência Artificial</h3>
      <p className="text-dark-subtext text-sm leading-relaxed">
        Cartões de tipo "Digitação" (Typing) e "Completar" (Cloze) podem utilizar a IA para validar suas respostas de forma semântica.
      </p>

      <div className="space-y-4 mt-6">
        <div className="bg-white/5 p-4 rounded-xl border border-white/5">
          <h4 className="font-semibold text-white mb-1">Validação Exata (Padrão)</h4>
          <p className="text-sm text-dark-subtext">O sistema compara exatamente o que você digitou com o gabarito. Se faltar um acento ou tiver um espaço extra, pode ser considerado errado.</p>
        </div>

        <div className="bg-indigo-500/10 p-4 rounded-xl border border-indigo-500/20">
          <h4 className="font-semibold text-indigo-300 mb-1">Validação com IA</h4>
          <p className="text-sm text-indigo-200/70 mb-3">
            O sistema entende o contexto! Se o gabarito for "cachorro" e você digitar "cãozinho", a IA compreenderá o significado e marcará como correto, fornecendo um feedback sutil.
          </p>
          <p className="text-xs text-indigo-300/50 bg-indigo-500/10 p-2 rounded">
            Para ativar, na criação do cartão de Digitação, mude a Validação para "Com IA".
          </p>
        </div>
      </div>
    </div>
  );
}

export function TagsTab() {
  return (
    <div className="space-y-6 animate-fade-in">
      <h3 className="text-2xl font-bold text-white mb-2">Sistema Transversal de Tags</h3>
      <p className="text-dark-subtext text-sm leading-relaxed">
        As tags permitem que você categorize cartões muito além das limitações de pastas ou subbaralhos. Elas são transversais e extremamente úteis para filtros.
      </p>

      <div className="space-y-4 mt-6">
        <div className="bg-white/5 p-4 rounded-xl border border-white/5">
          <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
            <Tag className="w-4 h-4 text-indigo-400" />
            Como Criar
          </h4>
          <p className="text-sm text-dark-subtext">No editor de cartões, há um campo específico para Tags. Digite uma palavra e pressione `Enter` ou `,` (vírgula) para transformá-la em uma pílula roxa.</p>
        </div>
        
        <div className="bg-white/5 p-4 rounded-xl border border-white/5">
          <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
            <Search className="w-4 h-4 text-indigo-400" />
            Filtros Inteligentes
          </h4>
          <p className="text-sm text-dark-subtext">Ao navegar pelo seu baralho, um menu suspenso de Tags será mostrado. Ele exibe apenas as tags que realmente existem naqueles cartões. Perfeito para estudar contextos como `#urgente` ou `#phrasal_verbs` separadamente.</p>
        </div>

        <div className="bg-indigo-500/10 p-4 rounded-xl border border-indigo-500/20 mt-4">
          <h4 className="font-semibold text-indigo-300 mb-1 flex items-center gap-2">
            <BrainCircuit className="w-4 h-4" />
            Tags Automáticas via IA
          </h4>
          <p className="text-sm text-indigo-200/70">
            Sempre que você utilizar o Assistente de IA para gerar novos flashcards a partir de um texto, a inteligência artificial não apenas criará os cartões, mas também aplicará tags cirúrgicas a cada um deles automaticamente.
          </p>
        </div>
      </div>
    </div>
  );
}
