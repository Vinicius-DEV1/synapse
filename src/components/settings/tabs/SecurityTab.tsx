import { KeyRound } from 'lucide-react';
import type { AppSettings } from '../../../utils/settings';
import { MasterPasswordSection } from './security/MasterPasswordSection';
import { VisitorsManagementSection } from './security/VisitorsManagementSection';
import { AutoLockSection } from './security/AutoLockSection';
import { BackupAndWipeSection } from './security/BackupAndWipeSection';
import { useI18n } from '../../../i18n';

interface SecurityTabProps {
  appSettings: AppSettings;
  setAppSettings: (settings: AppSettings) => void;
  isChangingPassword: boolean;
  setIsChangingPassword: (val: boolean) => void;
}

export default function SecurityTab({ 
  appSettings, 
  setAppSettings, 
  isChangingPassword, 
  setIsChangingPassword 
}: SecurityTabProps) {
  const { t } = useI18n();
  
  if (isChangingPassword) {
    return <MasterPasswordSection onCancel={() => setIsChangingPassword(false)} />;
  }

  return (
    <div className="space-y-5">
      <AutoLockSection 
        appSettings={appSettings} 
        setAppSettings={setAppSettings} 
      />

      <VisitorsManagementSection />

      <div className="border-t border-white/5 pt-4">
        <button 
          type="button"
          onClick={() => setIsChangingPassword(true)}
          className="w-full py-2.5 rounded-xl border border-white/[0.08] text-sm font-medium text-white hover:bg-white/5 transition-colors flex items-center justify-center gap-2"
        >
          <KeyRound size={16} />
          {t('settings.security.changeMasterPassword')}
        </button>
      </div>

      <BackupAndWipeSection />
    </div>
  );
}
