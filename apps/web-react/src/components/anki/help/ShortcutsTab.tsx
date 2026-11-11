import React from 'react';

function ShortcutRow({ keys, description, color = "text-white" }: { keys: string[], description: string, color?: string }) {
  return (
    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
      <div className="flex items-center gap-2">
        {keys.map((k, i) => (
          <React.Fragment key={k}>
            <kbd className="bg-black/30 border border-white/10 px-2 py-1 rounded text-xs font-mono text-dark-subtext">
              {k}
            </kbd>
            {i < keys.length - 1 && <span className="text-dark-subtext/50 text-xs">ou</span>}
          </React.Fragment>
        ))}
      </div>
      <span className={`text-sm ${color}`}>{description}</span>
    </div>
  );
}

export function ShortcutsTab() {
  return (
    <div className="space-y-6 animate-fade-in">
      <h3 className="text-2xl font-bold text-white mb-2">Atalhos de Teclado</h3>
      <p className="text-dark-subtext text-sm leading-relaxed mb-6">
        Estude muito mais rápido usando apenas o teclado.
      </p>

      <div className="space-y-3">
        <ShortcutRow keys={['Espaço', 'Enter']} description="Mostrar a resposta ou confirmar o que foi digitado" />
        <ShortcutRow keys={['1']} description="Avaliar como: Errei (Volta para a fase de aprendizado)" color="text-red-400" />
        <ShortcutRow keys={['2']} description="Avaliar como: Difícil (Aumenta um pouco o intervalo)" color="text-orange-400" />
        <ShortcutRow keys={['3']} description="Avaliar como: Bom (Progresso normal)" color="text-green-400" />
        <ShortcutRow keys={['4']} description="Avaliar como: Fácil (Aumenta bastante o intervalo)" color="text-blue-400" />
        <ShortcutRow keys={['Esc']} description="Sair da sessão de estudos" />
      </div>
      
      <h4 className="text-lg font-bold text-white mt-8 mb-4 border-t border-white/10 pt-6">Modal de Pré-visualização (Olhinho)</h4>
      <div className="space-y-3">
        <ShortcutRow keys={['Seta Direita (>)']} description="Avançar rapidamente para o próximo cartão da lista atual." />
        <ShortcutRow keys={['Seta Esquerda (<)']} description="Voltar para o cartão anterior." />
        <ShortcutRow keys={['Espaço / Enter']} description="Mostrar a resposta ou fechar a resposta do cartão atual." />
      </div>
    </div>
  );
}
