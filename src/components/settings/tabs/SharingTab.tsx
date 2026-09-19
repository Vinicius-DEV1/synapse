/**
 * @file SharingTab.tsx
 * @description Settings tab hosting the central Page Sharing management dashboard.
 */

import React from 'react';
import { ShareManagementPanel } from '../../sharing/ShareManagementPanel';

export const SharingTab: React.FC = () => {
  return (
    <div className="space-y-6">
      <ShareManagementPanel />
    </div>
  );
};
