
export function TypesTab() {
  return (
    <div className="space-y-6 animate-fade-in">
      <h3 className="text-2xl font-bold text-white mb-2">Tipos de Cartões</h3>
      <p className="text-dark-subtext text-sm leading-relaxed mb-6">
        O Caderno suporta múltiplos formatos de cartões para treinar diferentes habilidades, como leitura, escrita, fala e escuta.
      </p>

      <div className="grid gap-4">
        <div className="bg-white/5 p-4 rounded-xl border border-white/5">
          <h4 className="font-semibold text-white mb-2 text-indigo-400">Padrão (Leitura)</h4>
          <p className="text-sm text-dark-subtext">O flashcard clássico. Você lê a frente, pensa na resposta, clica para virar e julga se acertou. Ótimo para vocabulário e conceitos gerais.</p>
        </div>
        
        <div className="bg-white/5 p-4 rounded-xl border border-white/5">
          <h4 className="font-semibold text-white mb-2 text-blue-400">Digitação (Escrita Livre)</h4>
          <p className="text-sm text-dark-subtext">Apresenta uma caixa de texto para você digitar a resposta inteira. Excelente para forçar a memorização ativa e a ortografia. Suporta validação com Inteligência Artificial.</p>
        </div>
        
        <div className="bg-white/5 p-4 rounded-xl border border-white/5">
          <h4 className="font-semibold text-white mb-2 text-green-400">Preencher Lacuna (Cloze)</h4>
          <p className="text-sm text-dark-subtext">Para criar, digite algo como: <code>A capital da França é {'{{Paris}}'}.</code> O sistema esconderá a palavra Paris para você digitar. Muito útil para aprender contexto gramatical.</p>
        </div>

        <div className="bg-white/5 p-4 rounded-xl border border-white/5">
          <h4 className="font-semibold text-white mb-2 text-orange-400">Fala (Speaking)</h4>
          <p className="text-sm text-dark-subtext">Focado em pronúncia. A frente do cartão mostra uma palavra ou frase, e você deverá gravar um áudio lendo-a. A Inteligência Artificial ouvirá seu áudio e fará a correção da sua pronúncia!</p>
        </div>

        <div className="bg-white/5 p-4 rounded-xl border border-white/5">
          <h4 className="font-semibold text-white mb-2 text-purple-400">Escuta (Listening)</h4>
          <p className="text-sm text-dark-subtext">Um áudio será tocado automaticamente usando Text-to-Speech (ou um áudio gravado). Você deve escutar e tentar adivinhar a frase escrita ou a tradução dela. Treina o seu ouvido para nativos.</p>
        </div>
      </div>
    </div>
  );
}
