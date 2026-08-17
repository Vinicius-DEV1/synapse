import  { useState, useEffect, useRef } from 'react';
import { FolderOpen, AlertTriangle, ShieldCheck, HardDrive, CheckCircle2,  Ban } from 'lucide-react';
import { getValidAccessToken } from '../../../services/drive';

export function BackupTab() {
  const [destination, setDestination] = useState<string>('');
  const [backupType, setBackupType] = useState<'encrypted' | 'decrypted'>('encrypted');
  const [includeMedia, setIncludeMedia] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [logs, setLogs] = useState<{ message: string; progress?: number }[]>([]);
  const [progress, setProgress] = useState(0);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  useEffect(() => {
    if (!window.api?.backup) return;
    
    const unsubscribe = window.api.backup.onLog((data) => {
      setLogs((prev) => [...prev, data]);
      if (typeof data.progress === 'number') {
        setProgress(data.progress);
      }
      if (data.progress === 100) {
        setIsBackingUp(false);
        setIsCompleted(true);
      }
      // Handle cancel (progress resets to 0 with cancel message)
      if (data.progress === 0 && data.message.includes('cancelado')) {
        setIsBackingUp(false);
      }
    });
    
    return unsubscribe;
  }, []);

  const handleSelectFolder = async () => {
    if (!window.api?.backup) return;
    const folder = await window.api.backup.selectFolder();
    if (folder) {
      setDestination(folder);
    }
  };

  const handleStartBackup = async () => {
    if (!destination) {
      alert("Por favor, selecione uma pasta de destino.");
      return;
    }
    if (!window.api?.backup) return;

    setIsBackingUp(true);
    setIsCompleted(false);
    setLogs([]);
    setProgress(0);

    let driveToken = undefined;
    if (includeMedia) {
      const token = await getValidAccessToken();
      if (!token) {
        alert("Não foi possível autenticar com o Google Drive para baixar as mídias.");
        setIsBackingUp(false);
        return;
      }
      driveToken = token;
    }

    const res = await window.api.backup.startBackup({
      destination,
      type: backupType,
      includeMedia,
      driveToken
    });

    if (!res.success) {
      setIsBackingUp(false);
    }
  };

  const handleCancelBackup = async () => {
    if (!window.api?.backup?.cancelBackup) return;
    await window.api.backup.cancelBackup();
  };

  const getLogStyle = (message: string) => {
    if (message.startsWith('ERRO')) return 'text-red-400';
    if (message.startsWith('✅')) return 'text-green-400 font-semibold';
    if (message.startsWith('✓')) return 'text-green-400';
    if (message.startsWith('⏭')) return 'text-white/40';
    if (message.startsWith('⚠️')) return 'text-yellow-400';
    if (message.startsWith('☁️') || message.startsWith('  ⬇')) return 'text-blue-400';
    return 'text-white/80';
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-2">Backup de Dados</h3>
        <p className="text-sm text-white/60">
          Faça um backup local de 100% dos seus cadernos, anotações, vídeos e flashcards.
        </p>
      </div>

      {/* Tipo de Backup */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => setBackupType('encrypted')}
          disabled={isBackingUp}
          className={`flex flex-col gap-2 p-4 rounded-xl border text-left transition-colors ${
            backupType === 'encrypted' 
              ? 'bg-brand-500/20 border-brand-500' 
              : 'bg-white/5 border-white/10 hover:bg-white/10'
          } ${isBackingUp ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className={backupType === 'encrypted' ? 'text-brand-400' : 'text-white/60'} />
            <span className="font-semibold text-white">Criptografado</span>
          </div>
          <span className="text-sm text-white/60">
            Recomendado. Mantém a segurança original. Arquivos ilegíveis fora do app.
          </span>
        </button>

        <button
          onClick={() => setBackupType('decrypted')}
          disabled={isBackingUp}
          className={`flex flex-col gap-2 p-4 rounded-xl border text-left transition-colors ${
            backupType === 'decrypted' 
              ? 'bg-red-500/20 border-red-500' 
              : 'bg-white/5 border-white/10 hover:bg-white/10'
          } ${isBackingUp ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle size={20} className={backupType === 'decrypted' ? 'text-red-400' : 'text-white/60'} />
            <span className="font-semibold text-white">Descriptografado</span>
          </div>
          <span className="text-sm text-white/60">
            Atenção. Seus dados poderão ser abertos por qualquer leitor de banco de dados.
          </span>
        </button>
      </div>

      {/* Opções extras */}
      <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input 
            type="checkbox" 
            checked={includeMedia} 
            onChange={(e) => setIncludeMedia(e.target.checked)}
            className="mt-1"
            disabled={isBackingUp}
          />
          <div>
            <span className="text-sm font-medium text-white block">Incluir Mídias do Drive</span>
            <span className="text-xs text-white/50 block">Baixa todos os PDFs, Vídeos e Imagens para a pasta. Atenção: Isso pode demorar horas dependendo da quantidade de arquivos.</span>
          </div>
        </label>
      </div>

      {/* Pasta de Destino */}
      <div className="space-y-2">
        <span className="text-sm font-medium text-white">Pasta de Destino</span>
        <div className="flex gap-2">
          <div className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white/70 overflow-hidden text-ellipsis whitespace-nowrap">
            {destination || 'Nenhuma pasta selecionada...'}
          </div>
          <button 
            onClick={handleSelectFolder}
            disabled={isBackingUp}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FolderOpen size={18} />
            Escolher
          </button>
        </div>
      </div>

      {/* Ação e Progresso */}
      <div className="pt-4 space-y-4">
        <div className="flex gap-3">
          <button
            onClick={handleStartBackup}
            disabled={!destination || isBackingUp}
            className={`flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors ${
              !destination || isBackingUp
                ? 'bg-white/10 text-white/40 cursor-not-allowed'
                : 'bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-500/20'
            }`}
          >
            {isBackingUp ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Realizando Backup...
              </>
            ) : isCompleted ? (
              <>
                <CheckCircle2 size={18} />
                Backup Concluído — Iniciar Novo
              </>
            ) : (
              <>
                <HardDrive size={18} />
                Iniciar Backup Completo
              </>
            )}
          </button>

          {isBackingUp && (
            <button
              onClick={handleCancelBackup}
              className="px-5 py-3 rounded-xl font-medium bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 transition-colors flex items-center gap-2"
            >
              <Ban size={18} />
              Cancelar
            </button>
          )}
        </div>

        {/* Console de Logs */}
        {(logs.length > 0 || isBackingUp) && (
          <div className="mt-6 bg-black/80 rounded-xl border border-white/10 overflow-hidden flex flex-col h-64">
            <div className="px-4 py-2 bg-white/5 border-b border-white/10 flex justify-between items-center text-xs text-white/50">
              <span className="flex items-center gap-2">
                {isBackingUp && <div className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />}
                {isBackingUp ? 'Backup em andamento' : isCompleted ? '✓ Finalizado' : 'Log'}
              </span>
              <span className="font-mono">{Math.round(progress)}%</span>
            </div>
            
            <div className="h-1.5 bg-white/10 w-full">
              <div 
                className={`h-full transition-all duration-500 ease-out ${
                  isCompleted ? 'bg-green-500' : 'bg-brand-500'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="p-4 flex-1 overflow-y-auto font-mono text-xs space-y-1.5 custom-scrollbar">
              {logs.map((l, i) => (
                <div key={i} className={`flex items-start gap-2 ${getLogStyle(l.message)}`}>
                  <span className="opacity-40 select-none shrink-0">{'>'}</span>
                  <span className="break-all">{l.message}</span>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
