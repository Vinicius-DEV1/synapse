import { Timer } from 'lucide-react';

interface AuthLockoutBannerProps {
  lockoutTime: number;
  intimidatingPhrase: string;
}

export function AuthLockoutBanner({
  lockoutTime,
  intimidatingPhrase,
}: AuthLockoutBannerProps) {
  if (lockoutTime <= 0) return null;

  return (
    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl space-y-2 text-center animate-fade-in">
      <div className="flex items-center justify-center gap-1.5 text-xs text-red-400 font-medium">
        <Timer size={14} className="animate-spin" />
        <span>Tentativas excessivas. Aguarde {lockoutTime}s</span>
      </div>
      {intimidatingPhrase && (
        <p className="text-[11px] text-red-300/80 italic font-mono leading-relaxed">
          &quot;{intimidatingPhrase}&quot;
        </p>
      )}
    </div>
  );
}
