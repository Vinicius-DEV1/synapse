import type { AppSettings } from '../../../utils/settings';
import { VisitorsManagementSection } from './security/VisitorsManagementSection';
import { AutoLockSection } from './security/AutoLockSection';
import { BackupAndWipeSection } from './security/BackupAndWipeSection';
import { AccountStatusSection } from './security/AccountStatusSection';

interface SecurityTabProps {
  appSettings: AppSettings;
  setAppSettings: (settings: AppSettings) => void;
}

export default function SecurityTab({ appSettings, setAppSettings }: SecurityTabProps) {
  return (
    <div className="space-y-5">
      <AccountStatusSection />
      <AutoLockSection appSettings={appSettings} setAppSettings={setAppSettings} />
      <VisitorsManagementSection />
      <BackupAndWipeSection />
    </div>
  );
}
