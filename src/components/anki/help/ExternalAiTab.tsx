import React, { useState } from 'react';
import { Database, CheckCircle2, Settings } from 'lucide-react';

export function ExternalAiTab() {
  const [copySuccess, setCopySuccess] = useState(false);

  const handleCopyPrompt = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const PROMPT_TEXT = `Você é um especialista na criação de Flashcards para Anki. Vou te passar um tema e você deve gerar cartões no formato JSON abaixo.

REGRAS CRÍTICAS:
1. Você deve retornar APENAS o JSON válido.
2. Cada flashcard deve possuir exatamente 1 objeto na lista "notes" e 1 objeto correspondente na lista "cards".
3. Gere um "id" único e aleatório (como "card_1234", "note_9876" ou UUID) para CADA nota e para CADA cartão.
4. O campo "note_id" dentro de um objeto "card" DEVE ser igual ao "id" da "note" correspondente.
5. O campo "deck_id" deve ser preenchido (vou informar qual é).
6. "card_type" pode ser: "reading" (Padrão), "typing" (Digitação livre), "cloze" (Use {{c1::Resposta}} no campo front para ocultar), "speaking" ou "listening".
7. Adicione tags relevantes e em letras minúsculas para cada cartão no campo "tags" (ex: ["geografia", "europa"]).

SCHEMA OBRIGATÓRIO:
\`\`\`json
{
  "decks": [],
  "notes": [
    {
      "id": "uuid_ou_string_unica_aqui",
      "deck_id": "ID_DO_BARALHO_AQUI",
      "front": "Pergunta do flashcard",
      "back": "Resposta detalhada do flashcard",
      "card_type": "reading",
      "validation_mode": "exact",
      "tags": ["tag1", "tag2"]
    }
  ],
  "cards": [
    {
      "id": "uuid_ou_string_unica_aqui_diferente",
      "note_id": "MESMO_ID_DA_NOTA_ACIMA",
      "deck_id": "ID_DO_BARALHO_AQUI",
      "ord": 0,
      "state": 0
    }
  ]
}
\`\`\``;

  return (
    <div className="space-y-6 animate-fade-in">
      <h3 className="text-2xl font-bold text-white mb-2">Usando IAs Externas (ChatGPT, Claude)</h3>
      <p className="text-dark-subtext text-sm leading-relaxed mb-6">
        Se você preferir gerar cartões usando o site do ChatGPT ou Claude, basta copiar o <strong>Prompt do Sistema</strong> abaixo e colar lá. A IA vai gerar um código JSON estruturado que você pode colar diretamente na nossa ferramenta de <strong>Importar Baralho</strong>.
      </p>

      <div className="space-y-4">
        <div className="bg-white/5 p-4 rounded-xl border border-white/5 relative group">
          <button 
            onClick={() => handleCopyPrompt(PROMPT_TEXT)}
            className="absolute top-4 right-4 p-2 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded-lg transition-colors flex items-center gap-2 text-xs font-medium border border-indigo-500/30"
          >
            {copySuccess ? <CheckCircle2 size={14} /> : <Database size={14} />}
            {copySuccess ? 'Copiado!' : 'Copiar Prompt'}
          </button>
          
          <h4 className="font-semibold text-white mb-2 text-indigo-400 flex items-center gap-2">
            <Settings className="w-4 h-4" /> Prompt para Copiar
          </h4>
          <p className="text-xs text-dark-subtext mb-4 w-[80%]">Cole isso no ChatGPT/Claude antes de pedir seus cartões para ele entender como formatá-los.</p>
          <div className="bg-black/40 rounded-lg p-4 font-mono text-xs text-indigo-200/80 whitespace-pre-wrap overflow-x-auto max-h-[300px] custom-scrollbar border border-black/50">
            {PROMPT_TEXT}
          </div>
        </div>
        
        <div className="bg-white/5 p-4 rounded-xl border border-white/5">
          <h4 className="font-semibold text-white mb-2 text-green-400">Exportar & Atualizar Cartões</h4>
          <p className="text-sm text-dark-subtext">
            O nosso sistema é inteligente! Se você <strong>Exportar</strong> um baralho do Caderno, mandar o JSON completo pro ChatGPT e pedir para ele <strong>adicionar 10 cartões novos e editar alguns antigos</strong>, ao importar o JSON de volta, nós iremos:
          </p>
          <ul className="list-disc list-inside mt-2 text-sm text-dark-subtext space-y-1">
            <li>Manter os cartões que não foram alterados.</li>
            <li>Atualizar o texto dos cartões que a IA modificou (preservando seu progresso!).</li>
            <li>Adicionar os cartões novos criados por ela.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
