import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { AlertTriangle, KeyRound, Link2, ShieldCheck, UserCheck, X } from 'lucide-react';
import { Portal } from '../ui/Portal';

type HelpSection = 'links' | 'passwords' | 'approval' | 'recovery';

interface ShareHelpModalProps {
  onClose: () => void;
}

export function ShareHelpModal({ onClose }: ShareHelpModalProps) {
  const [section, setSection] = useState<HelpSection>('links');

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    const closeOnBackPress = (event: Event) => {
      event.preventDefault();
      onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    window.addEventListener('caderno-back-press', closeOnBackPress);
    return () => {
      window.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('caderno-back-press', closeOnBackPress);
    };
  }, [onClose]);

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      >
        <section
          role="dialog"
          aria-modal="true"
          aria-label="Guia de compartilhamento"
          className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-dark-card shadow-xl md:flex-row"
          onClick={(event) => event.stopPropagation()}
        >
          <nav aria-label="Seções do guia" className="flex shrink-0 flex-col gap-1 border-b border-white/[0.06] bg-dark-bg p-4 md:w-56 md:border-b-0 md:border-r">
            <h2 className="mb-3 px-2 text-sm font-semibold text-dark-text">Guia de compartilhamento</h2>
            <SectionButton active={section === 'links'} onClick={() => setSection('links')} icon={<Link2 size={15} />} label="Links e acesso" />
            <SectionButton active={section === 'passwords'} onClick={() => setSection('passwords')} icon={<KeyRound size={15} />} label="Proteção por senha" />
            <SectionButton active={section === 'approval'} onClick={() => setSection('approval')} icon={<UserCheck size={15} />} label="Aprovação do dono" />
            <SectionButton active={section === 'recovery'} onClick={() => setSection('recovery')} icon={<ShieldCheck size={15} />} label="Chaves e recuperação" />
          </nav>

          <div className="relative flex-1 overflow-y-auto p-6 md:p-8">
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar guia"
              className="absolute right-4 top-4 rounded-lg p-2 text-dark-subtext transition-colors hover:bg-white/5 hover:text-dark-text"
            >
              <X size={17} />
            </button>
            <article className="max-w-2xl space-y-4 pr-6">
              {section === 'links' && (
                <>
                  <h3 className="text-lg font-semibold text-dark-text">Links de compartilhamento</h3>
                  <p className="text-sm leading-relaxed text-dark-subtext">Crie um link para uma página e escolha se ele inclui apenas a página ou também páginas descendentes. O conteúdo continua criptografado no Firestore.</p>
                  <p className="text-sm leading-relaxed text-dark-subtext">Em links abertos sem senha ou aprovação, a chave fica no fragmento do endereço. O fragmento não é enviado ao servidor. Copie o link pelo próprio app para incluir a chave corretamente.</p>
                </>
              )}
              {section === 'passwords' && (
                <>
                  <h3 className="text-lg font-semibold text-dark-text">Proteção por senha</h3>
                  <p className="text-sm leading-relaxed text-dark-subtext">A senha protege a chave que abre o conteúdo. A chave não fica salva em texto aberto no documento público do compartilhamento.</p>
                  <p className="text-sm leading-relaxed text-dark-subtext">Use uma senha longa e exclusiva. Quem tiver acesso ao endereço e à senha poderá abrir o conteúdo enquanto o link estiver ativo.</p>
                </>
              )}
              {section === 'approval' && (
                <>
                  <h3 className="text-lg font-semibold text-dark-text">Aprovação do dono</h3>
                  <p className="text-sm leading-relaxed text-dark-subtext">Com aprovação ativada, cada dispositivo solicita acesso. Você pode liberar ou negar o pedido na notificação do app e revogar dispositivos confiáveis depois.</p>
                  <p className="text-sm leading-relaxed text-dark-subtext">A senha, quando configurada, valida o pedido antes de ele chegar para aprovação. A aprovação continua sendo necessária para receber a chave de acesso.</p>
                </>
              )}
              {section === 'recovery' && (
                <>
                  <h3 className="text-lg font-semibold text-dark-text">Chaves e recuperação</h3>
                  <p className="text-sm leading-relaxed text-dark-subtext">Mantenha sua conta Firebase conectada para gerenciar os links. O app guarda uma cópia local da chave de cada compartilhamento e uma cópia protegida pela sua chave mestra no Firestore.</p>
                  <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-200">
                    <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-400" />
                    <p>Links antigos criados antes da proteção atual precisam ser recriados. Guarde os links novos com cuidado e desative links antigos que não usa mais.</p>
                  </div>
                </>
              )}
            </article>
          </div>
        </section>
      </div>
    </Portal>
  );
}

function SectionButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs transition-colors ${
        active
          ? 'border border-brand-500/25 bg-brand-500/10 text-brand-300'
          : 'text-dark-subtext hover:bg-white/5 hover:text-dark-text'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
