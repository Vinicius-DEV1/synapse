import React from 'react';
import { KeyRound } from 'lucide-react';
import type { AppSettings } from '../../../utils/settings';
import { MasterPasswordSection } from './security/MasterPasswordSection';
import { VisitorsManagementSection } from './security/VisitorsManagementSection';
import { AutoLockSection } from './security/AutoLockSection';
import { BackupAndWipeSection } from './security/BackupAndWipeSection';

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
          className="w-full py-2.5 rounded-xl border border-white/10 text-sm font-medium text-white hover:bg-white/5 transition-colors flex items-center justify-center gap-2"
        >
          <KeyRound size={16} />
          Alterar Senha Mestra
        </button>
      </div>

      <BackupAndWipeSection />
    </div>
  );
}
