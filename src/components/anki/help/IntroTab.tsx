import React from 'react';

export function IntroTab() {
  return (
    <div className="space-y-6 animate-fade-in">
      <h3 className="text-2xl font-bold text-white mb-2">Como usar os Baralhos</h3>
      <p className="text-dark-subtext text-sm leading-relaxed">
        O módulo Anki utiliza o conceito de <strong>Repetição Espaçada</strong> (Spaced Repetition) para ajudar você a memorizar qualquer coisa com o mínimo de esforço.
      </p>

      <div className="grid gap-4 mt-6">
        <div className="bg-white/5 p-4 rounded-xl border border-white/5">
          <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500"></span>
            Novos Cartões
          </h4>
          <p className="text-sm text-dark-subtext">Cartões que você nunca estudou. Eles são limitados por dia para não sobrecarregar sua memória.</p>
        </div>
        
        <div className="bg-white/5 p-4 rounded-xl border border-white/5">
          <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-orange-500"></span>
            Aprendendo
          </h4>
          <p className="text-sm text-dark-subtext">Cartões que você acabou de conhecer ou que errou recentemente. O foco é fixá-los antes de enviá-los para revisões mais longas.</p>
        </div>
        
        <div className="bg-white/5 p-4 rounded-xl border border-white/5">
          <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
            A Revisar
          </h4>
          <p className="text-sm text-dark-subtext">Cartões já aprendidos que o algoritmo agendou para hoje, pouco antes de você esquecê-los.</p>
        </div>
      </div>

      <div className="mt-6 bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl">
        <h4 className="font-semibold text-indigo-300 mb-1">Dica de Ouro</h4>
        <p className="text-sm text-indigo-200/70">
          Você pode organizar baralhos dentro de outros baralhos (Subbaralhos). Clique no <strong>+</strong> ao lado de um baralho existente para criar um filho!
        </p>
      </div>
    </div>
  );
}
