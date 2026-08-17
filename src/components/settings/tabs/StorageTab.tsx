import  { useEffect, useState } from 'react';
import { Database, Image as ImageIcon, Video, Book, FileQuestion, HardDrive, RefreshCw, Headphones } from 'lucide-react';
import { getDriveStorageUsage, type DriveStorageUsage } from '../../../services/drive';
import StorageFilesModal from './StorageFilesModal';

export default function StorageTab() {
  const [usage, setUsage] = useState<DriveStorageUsage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedModule, setSelectedModule] = useState<any>(null);

  const fetchStorage = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getDriveStorageUsage();
      if (data) {
        setUsage(data);
      } else {
        setError('Não foi possível obter o armazenamento. Verifique se você está conectado ao Google Drive na aba Geral.');
      }
    } catch (err) {
      setError('Erro ao carregar os dados de armazenamento.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStorage();
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-dark-subtext">
        <RefreshCw size={24} className="animate-spin mb-4" />
        <p className="text-sm">Calculando armazenamento...</p>
      </div>
    );
  }

  if (error || !usage) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 mb-4">
          <HardDrive size={24} />
        </div>
        <p className="text-sm text-red-400 mb-4">{error || 'Dados de armazenamento não disponíveis.'}</p>
        <button
          onClick={fetchStorage}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors flex items-center gap-2"
        >
          <RefreshCw size={16} />
          Tentar Novamente
        </button>
      </div>
    );
  }

  const modules = [
    { name: 'Biblioteca (PDFs)', icon: Book, size: usage.modules.library.size, files: usage.modules.library.files, color: 'text-blue-400', bg: 'bg-blue-500/20' },
    { name: 'Fotos (Imagens)', icon: ImageIcon, size: usage.modules.photos.size, files: usage.modules.photos.files, color: 'text-pink-400', bg: 'bg-pink-500/20' },
    { name: 'Vídeos', icon: Video, size: usage.modules.videos.size, files: usage.modules.videos.files, color: 'text-brand-400', bg: 'bg-brand-500/20' },
    { name: 'Lofi (Áudio)', icon: Headphones, size: usage.modules.lofi.size, files: usage.modules.lofi.files, color: 'text-purple-400', bg: 'bg-purple-500/20' },
    { name: 'Outros', icon: FileQuestion, size: usage.modules.others.size, files: usage.modules.others.files, color: 'text-gray-400', bg: 'bg-gray-500/20' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-white flex items-center gap-2">
            <Database size={16} className="text-brand-400" />
            Armazenamento no Drive
          </h3>
          <p className="text-xs text-dark-subtext mt-1">
            Espaço consumido pelos arquivos criptografados do app
          </p>
        </div>
        <button
          onClick={fetchStorage}
          className="p-2 bg-white/5 hover:bg-white/10 text-dark-subtext hover:text-white rounded-lg transition-colors"
          title="Recalcular"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Card de Armazenamento Total */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5 flex flex-col items-center justify-center">
        <p className="text-xs text-dark-subtext uppercase tracking-wider font-semibold mb-1">Total Utilizado</p>
        <p className="text-3xl font-bold text-white tracking-tight">{formatBytes(usage.total)}</p>
      </div>

      {/* Lista de Módulos */}
      <div className="space-y-3 mt-4">
        {modules.map((mod, index) => {
          const percentage = usage.total > 0 ? (mod.size / usage.total) * 100 : 0;
          return (
            <div 
              key={index} 
              onClick={() => setSelectedModule(mod)}
              className="flex flex-col gap-2 p-3 bg-white/5 border border-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer active:scale-[0.99]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${mod.bg} ${mod.color}`}>
                    <mod.icon size={16} />
                  </div>
                  <span className="text-sm font-medium text-white">{mod.name}</span>
                </div>
                <span className="text-sm font-bold text-white">{formatBytes(mod.size)}</span>
              </div>
              <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${mod.bg.replace('/20', '')}`} 
                  style={{ width: `${Math.max(percentage, percentage > 0 ? 2 : 0)}%` }} 
                />
              </div>
            </div>
          );
        })}
      </div>

      {selectedModule && (
        <StorageFilesModal
          isOpen={!!selectedModule}
          onClose={() => setSelectedModule(null)}
          moduleName={selectedModule.name}
          icon={selectedModule.icon}
          color={selectedModule.color}
          bg={selectedModule.bg}
          files={selectedModule.files}
        />
      )}
    </div>
  );
}
