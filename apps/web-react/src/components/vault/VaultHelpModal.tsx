import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  Key,
  Lock,
  FolderLock,
  SearchCheck,
  Film,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { Portal } from '../ui/Portal';

interface VaultHelpModalProps {
  onClose: () => void;
}

type TabKey = 'basics' | 'account_key' | 'items' | 'breach_audit' | 'video_streaming';

export function VaultHelpModal({ onClose }: VaultHelpModalProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('basics');

  useEffect(() => {
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
  }, [onClose]);

  return (
    <Portal>
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-in fade-in duration-200"
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-label="Guia do Cofre Criptografado"
          className="bg-dark-card w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row border border-white/[0.06] h-[85vh] max-h-[720px] animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Sidebar */}
          <div className="w-full md:w-64 bg-dark-bg border-r border-white/5 p-5 flex flex-col gap-1.5 shrink-0 overflow-y-auto custom-scrollbar">
            <div className="flex items-center gap-3 mb-6 px-2">
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Shield className="w-5 h-5 shrink-0" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Guia do Cofre</h2>
                <p className="text-[11px] text-dark-subtext">Segurança E2EE & Dados</p>
              </div>
            </div>

            <TabButton
              active={activeTab === 'basics'}
              onClick={() => setActiveTab('basics')}
              icon={<Lock size={16} />}
              label="Zero-Knowledge & E2EE"
            />
            <TabButton
              active={activeTab === 'account_key'}
              onClick={() => setActiveTab('account_key')}
              icon={<Key size={16} />}
              label="Conta Nuvem & criptografia"
            />
            <TabButton
              active={activeTab === 'items'}
              onClick={() => setActiveTab('items')}
              icon={<FolderLock size={16} />}
              label="Itens & Grupos"
            />
            <TabButton
              active={activeTab === 'breach_audit'}
              onClick={() => setActiveTab('breach_audit')}
              icon={<SearchCheck size={16} />}
              label="Auditoria de Vazamentos"
            />
            <TabButton
              active={activeTab === 'video_streaming'}
              onClick={() => setActiveTab('video_streaming')}
              icon={<Film size={16} />}
              label="Vídeos Criptografados"
            />
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto relative p-6 md:p-8 custom-scrollbar">
            <button
              onClick={onClose}
              className="absolute top-5 right-5 p-2 text-dark-subtext hover:text-white hover:bg-white/10 rounded-xl transition-colors z-10"
              title="Fechar (Esc)"
            >
              <X size={18} />
            </button>

            <div className="max-w-2xl mx-auto space-y-6">
              {activeTab === 'basics' && <BasicsTab />}
              {activeTab === 'account_key' && <AccountKeyTab />}
              {activeTab === 'items' && <ItemsTab />}
              {activeTab === 'breach_audit' && <BreachAuditTab />}
              {activeTab === 'video_streaming' && <VideoStreamingTab />}
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
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all text-xs font-medium ${
        active
          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 shadow-sm'
          : 'text-dark-subtext hover:bg-white/5 hover:text-white'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function BasicsTab() {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-bold text-white mb-2">Segurança Zero-Knowledge & E2EE</h3>
        <p className="text-sm text-dark-subtext leading-relaxed">
          O Cofre do Caderno opera sob o modelo <strong>Zero-Knowledge (Conhecimento Zero)</strong>.
          Suas informações são criptografadas e descriptografadas exclusivamente no seu dispositivo.
        </p>
      </div>

      <div className="space-y-3">
        <FeatureItem
          title="Dois Níveis de Keychain (Two-Tier Architecture)"
          description="A senha da Conta Nuvem deriva localmente uma chave de acesso com PBKDF2. As chaves de dados usam AES-256-GCM e são reembrulhadas quando a credencial da conta muda, sem recriptografar os arquivos volumosos."
        />
        <FeatureItem
          title="Autenticação Forte sem Backdoors"
          description="O servidor Firebase autentica a conta, mas não recebe as chaves de descriptografia em texto claro. A redefinição de senha da conta não recupera chaves criptográficas já protegidas pela credencial anterior."
        />
        <FeatureItem
          title="Bloqueio Automático em Segundo Plano"
          description="Após inatividade ou ao minimizar o aplicativo, a chave descriptografada é apagada da memória volátil imediatamente."
        />
      </div>
    </div>
  );
}

function AccountKeyTab() {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-bold text-white mb-2">Conta Nuvem & derivação PBKDF2</h3>
        <p className="text-sm text-dark-subtext leading-relaxed">
          A credencial da Conta Nuvem deriva uma chave criptográfica no dispositivo para proteger as chaves de dados:
        </p>
      </div>

      <div className="space-y-3">
        <FeatureItem
          title="PBKDF2 com 600.000 Iterações SHA-256"
          description="Alinhado às recomendações rigorosas da OWASP para inviabilizar ataques por dicionário com aceleradores GPU."
        />
        <FeatureItem
          title="AES-256-GCM com Vetor de Inicialização (IV) Único"
          description="Cada item e arquivo possui seu próprio IV criptográfico de 96 bits, garantindo integridade e confidencialidade autenticada."
        />
      </div>

      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 leading-relaxed flex items-start gap-2.5">
        <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
        <p>
          <strong>Importante:</strong> Redefinir a senha da Conta Nuvem não recupera dados criptografados com a credencial anterior. A migração exige a credencial que ainda abre as chaves existentes.
        </p>
      </div>
    </div>
  );
}

function ItemsTab() {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-bold text-white mb-2">Itens, Credenciais & Grupos</h3>
        <p className="text-sm text-dark-subtext leading-relaxed">
          Gerencie senhas, notas secretas, cartões e credenciais organizadas por grupos:
        </p>
      </div>

      <div className="space-y-3">
        <FeatureItem
          title="Grupos e Categorias Personalizadas"
          description="Organize seus segredos em grupos como Pessoal, Trabalho, Finanças e Servidores com cores e ícones dedicados."
        />
        <FeatureItem
          title="Campos Ocultos e Cópia Rápida"
          description="Visualize senhas com toggle de visibilidade e copie com um clique para a área de transferência com limpeza automática após alguns segundos."
        />
      </div>
    </div>
  );
}

function BreachAuditTab() {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-bold text-white mb-2">Auditoria de Senhas & Vazamentos</h3>
        <p className="text-sm text-dark-subtext leading-relaxed">
          Monitore a saúde e integridade de suas senhas armazenadas:
        </p>
      </div>

      <div className="space-y-3">
        <FeatureItem
          title="Auditoria k-Anonymity (HaveIBeenPwned)"
          description="Verifica se suas senhas constam em vazamentos globais públicos enviando apenas os primeiros 5 caracteres do hash SHA-1. A senha real nunca sai do seu computador."
        />
        <FeatureItem
          title="Detecção de Senhas Fracas ou Reutilizadas"
          description="O analisador zxcvbn calcula o tempo estimado para quebrar a senha e alerta sobre padrões óbvios e duplicatas."
        />
      </div>
    </div>
  );
}

function VideoStreamingTab() {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-bold text-white mb-2">Streaming de Vídeos Criptografados</h3>
        <p className="text-sm text-dark-subtext leading-relaxed">
          Reproduza aulas e vídeos confidenciais com descriptografia em tempo real:
        </p>
      </div>

      <div className="space-y-3">
        <FeatureItem
          title="Descriptografia Chunk por Chunk na Memória"
          description="Vídeos criptografados são lidos e descriptografados sob demanda via pipeline IPC/Range requests sem gravar arquivos temporários em disco."
        />
        <FeatureItem
          title="Reprodução Contínua com Seeking Preciso"
          description="Navegue pela linha do tempo do player com busca instantânea sem esperar o download completo do arquivo."
        />
      </div>
    </div>
  );
}

function FeatureItem({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
      <div className="flex items-center gap-2 text-white font-semibold text-xs">
        <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
        <span>{title}</span>
      </div>
      <p className="text-xs text-dark-subtext leading-relaxed pl-5">{description}</p>
    </div>
  );
}
