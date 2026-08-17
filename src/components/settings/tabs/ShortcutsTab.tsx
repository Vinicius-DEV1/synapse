import { Keyboard, BookOpen, PenTool, Layout} from 'lucide-react';

export default function ShortcutsTab() {
  const shortcutGroups = [
    {
      title: "Gerais do Aplicativo",
      icon: <Layout size={16} className="text-brand-400" />,
      items: [
        { keys: ["Ctrl", "J"], desc: "Abrir/Fechar Assistente de IA Rápido (ou Ctrl+Shift+A)" },
        { keys: ["Shift", "F"], desc: "Alternar Tela Cheia (Ocultar Barra do Windows)" },
        { keys: ["Ctrl", "P"], desc: "Abrir Busca Global de Obras" },
        { keys: ["Esc"], desc: "Fechar modais abertos" }
      ]
    },
    {
      title: "Leitor de PDF e EPUB",
      icon: <BookOpen size={16} className="text-purple-400" />,
      items: [
        { keys: ["F"], desc: "Modo Foco do Leitor (Ocultar menus e barra lateral)" },
        { keys: ["M"], desc: "Alternar Temas (Claro, Sépia, Escuro, Nord, etc)" },
        { keys: ["+", "ou", "="], desc: "Aumentar o Zoom do texto" },
        { keys: ["-"], desc: "Reduzir o Zoom do texto" },
        { keys: ["Seta Esquerda"], desc: "Página Anterior" },
        { keys: ["Seta Direita", "ou", "Espaço"], desc: "Próxima Página" }
      ]
    },
    {
      title: "Editor de Cadernos / Notas",
      icon: <PenTool size={16} className="text-emerald-400" />,
      items: [
        { keys: ["Ctrl", "B"], desc: "Negrito" },
        { keys: ["Ctrl", "I"], desc: "Itálico" },
        { keys: ["Ctrl", "U"], desc: "Sublinhado" },
        { keys: ["Ctrl", "Z"], desc: "Desfazer (Undo)" },
        { keys: ["Ctrl", "Shift", "Z"], desc: "Refazer (Redo)" }
      ]
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <Keyboard size={16} className="text-brand-400" />
        <p className="text-sm font-medium text-white">Atalhos de Teclado</p>
      </div>

      <div className="space-y-5">
        {shortcutGroups.map((group, idx) => (
          <div key={idx} className="bg-black/20 border border-white/5 rounded-xl overflow-hidden">
            <div className="bg-white/5 px-4 py-2 flex items-center gap-2 border-b border-white/5">
              {group.icon}
              <span className="text-xs font-semibold text-white/90">{group.title}</span>
            </div>
            <div className="p-2 space-y-1">
              {group.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between px-2 py-1.5 hover:bg-white/5 rounded-lg transition-colors">
                  <span className="text-xs text-dark-subtext">{item.desc}</span>
                  <div className="flex items-center gap-1.5">
                    {item.keys.map((k, j) => (
                      <span key={j} className="text-[10px] font-mono bg-white/10 text-white/80 px-2 py-0.5 rounded border border-white/10">
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
