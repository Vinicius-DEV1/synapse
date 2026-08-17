
export function FsrsTab() {
  return (
    <div className="space-y-6 animate-fade-in">
      <h3 className="text-2xl font-bold text-white mb-2">O Algoritmo FSRS</h3>
      <p className="text-dark-subtext text-sm leading-relaxed">
        O Caderno utiliza o <strong>Free Spaced Repetition Scheduler (FSRS)</strong>, um algoritmo de IA moderno que é significativamente mais eficiente que o algoritmo tradicional do Anki (SM-2).
      </p>

      <div className="bg-white/5 rounded-xl border border-white/5 overflow-hidden">
        <div className="p-4 border-b border-white/5">
          <h4 className="font-semibold text-white">Como ele calcula os intervalos?</h4>
          <p className="text-sm text-dark-subtext mt-1">Ele rastreia 3 métricas secretas para cada cartão:</p>
        </div>
        <ul className="divide-y divide-white/5 text-sm">
          <li className="p-4 flex gap-4 items-start">
            <span className="font-mono text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded">D</span>
            <div>
              <strong className="text-white block">Dificuldade (Difficulty)</strong>
              <span className="text-dark-subtext">De 1 a 10. Representa a complexidade inerente daquele cartão para você.</span>
            </div>
          </li>
          <li className="p-4 flex gap-4 items-start">
            <span className="font-mono text-green-400 bg-green-500/10 px-2 py-1 rounded">S</span>
            <div>
              <strong className="text-white block">Estabilidade (Stability)</strong>
              <span className="text-dark-subtext">Tempo (em dias) que leva para sua chance de lembrar cair para 90%.</span>
            </div>
          </li>
          <li className="p-4 flex gap-4 items-start">
            <span className="font-mono text-blue-400 bg-blue-500/10 px-2 py-1 rounded">R</span>
            <div>
              <strong className="text-white block">Recuperabilidade (Retrievability)</strong>
              <span className="text-dark-subtext">Sua probabilidade atual de lembrar do cartão neste exato segundo.</span>
            </div>
          </li>
        </ul>
      </div>
    </div>
  );
}
