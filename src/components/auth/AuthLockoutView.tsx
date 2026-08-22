import { Timer } from 'lucide-react';

interface AuthLockoutViewProps {
  lockoutTime: number;
  intimidatingPhrase: string;
}

export function AuthLockoutView({ lockoutTime, intimidatingPhrase }: AuthLockoutViewProps) {
  return (
    <div className="flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
      <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(239,68,68,0.4)]">
        <Timer size={32} className="text-red-400 animate-pulse" />
      </div>

      <h1 className="text-3xl font-bold text-white mb-2 tracking-widest text-red-400">
        00:{lockoutTime.toString().padStart(2, '0')}
      </h1>

      <h2 className="text-lg font-medium text-center text-white/90 mb-4 uppercase tracking-wider">
        Acesso Bloqueado
      </h2>

      <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl w-full">
        <p className="text-center text-red-200/90 text-sm leading-relaxed italic font-medium">
          &quot;{intimidatingPhrase}&quot;
        </p>
      </div>
    </div>
  );
}
