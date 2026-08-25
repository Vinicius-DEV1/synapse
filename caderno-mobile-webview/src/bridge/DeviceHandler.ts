import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { EdgeInsets } from 'react-native-safe-area-context';
import { DeviceInfo } from './types';

export const DeviceHandler = {
  async triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'light'): Promise<void> {
    try {
      switch (type) {
        case 'light':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'medium':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'heavy':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        case 'success':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'warning':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
        case 'error':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
      }
    } catch {
      // Haptics not supported or failed
    }
  },

  getDeviceInfo(insets: EdgeInsets): DeviceInfo {
    const isTablet = Platform.OS === 'ios' ? Boolean((Platform as any).isPad) : false;
    return {
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
      osVersion: String(Platform.Version),
      isTablet,
      safeArea: {
        top: insets.top,
        bottom: insets.bottom,
        left: insets.left,
        right: insets.right,
      },
    };
  }
};
