import { useState, useEffect, type FormEvent } from 'react';
import { X, Cloud, Key, CheckCircle, Loader2 } from 'lucide-react';
import {
  getDriveAuthUrl,
  exchangeCodeForToken,
  saveDriveCredentials,
  getDriveCredentials,
  generateCodeVerifier,
  generateCodeChallenge,
} from '../../../services/drive';
import { Modal } from '../../ui/Modal';

export interface DriveAuthModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function DriveAuthModal({ onClose, onSuccess }: DriveAuthModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [alreadyAuthed, setAlreadyAuthed] = useState(false);

  useEffect(() => {
    getDriveCredentials().then((creds) => {
      if (creds.token) {
        setAlreadyAuthed(true);
      }
    });
  }, []);

  const handleOpenAuth = async () => {
    const verifier = generateCodeVerifier();
    sessionStorage.setItem('drive_code_verifier', verifier);
    const challenge = await generateCodeChallenge(verifier);
    const url = getDriveAuthUrl(challenge);

    if (window.api?.drive) {
      await window.api.drive.openExternalUrl(url);
    } else {
      window.open(url, '_blank');
    }
    setStep(2);
  };

  const handleSubmitCode = async (e: FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    const verifier = sessionStorage.getItem('drive_code_verifier');
    if (!verifier) {
      setError('Sessão de login expirou. Volte e clique no botão de login novamente.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const token = await exchangeCodeForToken(code.trim(), verifier);
      await saveDriveCredentials(token);

      // Trigger immediate full sync & book upload
      window.dispatchEvent(new CustomEvent('app-sync-trigger'));
      window.dispatchEvent(new CustomEvent('caderno-drive-connected'));

      setAlreadyAuthed(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Falha ao autenticar com o Google Drive');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    await saveDriveCredentials(null);
    setAlreadyAuthed(false);
    setStep(1);
    setCode('');
    sessionStorage.removeItem('drive_code_verifier');
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      zIndexClassName="z-[100]"
      containerClassName="w-full max-w-md flex flex-col"
    >
      <div className="w-full bg-dark-card border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-xl">
              <Cloud size={20} className="text-blue-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Google Drive</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-dark-subtext hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {alreadyAuthed ? (
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
                <CheckCircle size={32} className="text-green-400" />
              </div>
              <h3 className="text-xl font-medium text-white">Conta Conectada</h3>
              <p className="text-sm text-dark-subtext">
                Seus PDFs serão sincronizados automaticamente em segundo plano.
              </p>
              <button
                type="button"
                onClick={handleDisconnect}
                className="mt-6 px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                Desconectar Conta
              </button>
            </div>
          ) : step === 1 ? (
            <div className="space-y-6">
              <p className="text-sm text-dark-subtext leading-relaxed">
                Para sincronizar seus livros e PDFs entre dispositivos sem pagar pelo Firebase,
                precisamos usar o Google Drive. Os PDFs serão enviados <strong>criptografados</strong>{' '}
                (nem mesmo o Google consegue lê-los).
              </p>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                <h4 className="text-sm font-medium text-blue-400 mb-2">Como conectar:</h4>
                <ol className="text-xs text-blue-300/80 space-y-2 list-decimal list-inside">
                  <li>Clique no botão abaixo para abrir a tela do Google.</li>
                  <li>Faça login com a sua conta do Gmail.</li>
                  <li>Copie o código que aparecerá na barra de endereço (a URL inteira).</li>
                </ol>
              </div>

              <button
                type="button"
                onClick={handleOpenAuth}
                className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-xl font-medium transition-colors"
              >
                <Key size={18} />
                Fazer login com Google
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <p className="text-sm text-dark-subtext">
                Cole abaixo a URL completa ou apenas o código que apareceu após o login:
              </p>

              <form onSubmit={handleSubmitCode} className="space-y-4">
                <div>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.includes('code=')) {
                        try {
                          const url = new URL(val);
                          const extracted = url.searchParams.get('code');
                          if (extracted) {
                            setCode(extracted);
                            return;
                          }
                        } catch (err: unknown) {
                          console.debug('[DriveAuthModal] Input is not a parseable URL:', err);
                        }
                      }
                      setCode(val);
                    }}
                    placeholder="URL ou código (4/0AeaY...)"
                    className="w-full bg-dark-card border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                  />
                  {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 py-3 px-4 rounded-xl font-medium text-dark-subtext bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={!code.trim() || loading}
                    className="flex-[2] flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 px-4 rounded-xl font-medium transition-colors"
                  >
                    {loading ? <Loader2 size={18} className="animate-spin" /> : 'Confirmar Código'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
