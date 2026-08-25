export type BridgeActionType =
  | 'SQLITE_INIT'
  | 'SQLITE_QUERY'
  | 'SQLITE_EXEC'
  | 'SQLITE_BATCH'
  | 'SQLITE_GET_ALL'
  | 'SQLITE_GET_FIRST'
  | 'FS_READ'
  | 'FS_WRITE'
  | 'FS_DELETE'
  | 'FS_GET_INFO'
  | 'FS_SAVE_BASE64'
  | 'FS_READ_BASE64'
  | 'HAPTIC'
  | 'GET_DEVICE_INFO'
  | 'APP_READY'
  | 'OPEN_URL'
  | 'AUTH_GET_TOKEN'
  | 'AUTH_SAVE_TOKEN'
  | 'AUTH_CLEAR_TOKEN';

export interface BridgeRequest {
  id: string;
  type: BridgeActionType;
  payload?: any;
}

export interface BridgeResponse {
  id: string;
  success: boolean;
  data?: any;
  error?: string;
}

export interface DeviceInfo {
  platform: 'ios' | 'android' | 'web';
  osVersion?: string;
  isTablet: boolean;
  safeArea: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}
