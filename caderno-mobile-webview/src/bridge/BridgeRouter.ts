import { BridgeRequest, BridgeResponse } from './types';
import { SQLiteHandler } from './SQLiteHandler';
import { FileSystemHandler } from './FileSystemHandler';
import { DeviceHandler } from './DeviceHandler';
import { EdgeInsets } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';

export class BridgeRouter {
  private insets: EdgeInsets;
  private onAppReady?: () => void;

  constructor(insets: EdgeInsets, onAppReady?: () => void) {
    this.insets = insets;
    this.onAppReady = onAppReady;
  }

  updateInsets(insets: EdgeInsets) {
    this.insets = insets;
  }

  async handleMessage(messageRaw: string): Promise<BridgeResponse> {
    let req: BridgeRequest;
    try {
      req = JSON.parse(messageRaw);
    } catch {
      return { id: 'unknown', success: false, error: 'Invalid JSON payload' };
    }

    const { id, type, payload } = req;

    try {
      switch (type) {
        // --- SQLITE COMMANDS ---
        case 'SQLITE_INIT': {
          await SQLiteHandler.getDb();
          return { id, success: true };
        }

        case 'SQLITE_GET_ALL': {
          const { query, params } = payload || {};
          const rows = await SQLiteHandler.getAll(query, params || []);
          return { id, success: true, data: rows };
        }

        case 'SQLITE_GET_FIRST': {
          const { query, params } = payload || {};
          const row = await SQLiteHandler.getFirst(query, params || []);
          return { id, success: true, data: row };
        }

        case 'SQLITE_EXEC': {
          const { sql } = payload || {};
          await SQLiteHandler.exec(sql);
          return { id, success: true };
        }

        case 'SQLITE_QUERY': {
          const { query, params } = payload || {};
          const result = await SQLiteHandler.run(query, params || []);
          return { id, success: true, data: result };
        }

        case 'SQLITE_BATCH': {
          const { statements } = payload || {}; // array of { sql, params }
          const result = await SQLiteHandler.transaction(async (db) => {
            for (const st of statements) {
              await db.runAsync(st.sql, st.params || []);
            }
            return true;
          });
          return { id, success: true, data: result };
        }

        // --- FILE SYSTEM COMMANDS ---
        case 'FS_READ': {
          const { uri, encoding } = payload || {};
          const data = await FileSystemHandler.readFile(uri, encoding);
          return { id, success: true, data };
        }

        case 'FS_WRITE': {
          const { uri, contents, encoding } = payload || {};
          await FileSystemHandler.writeFile(uri, contents, encoding);
          return { id, success: true };
        }

        case 'FS_DELETE': {
          const { uri } = payload || {};
          await FileSystemHandler.deleteFile(uri);
          return { id, success: true };
        }

        case 'FS_GET_INFO': {
          const { uri } = payload || {};
          const info = await FileSystemHandler.getInfo(uri);
          return { id, success: true, data: info };
        }

        case 'FS_SAVE_BASE64': {
          const { filename, data } = payload || {};
          const savedPath = await FileSystemHandler.saveBase64Image(filename, data);
          return { id, success: true, data: savedPath };
        }

        // --- DEVICE & UI ---
        case 'HAPTIC': {
          const { style } = payload || {};
          await DeviceHandler.triggerHaptic(style);
          return { id, success: true };
        }

        case 'GET_DEVICE_INFO': {
          const info = DeviceHandler.getDeviceInfo(this.insets);
          return { id, success: true, data: info };
        }

        case 'OPEN_URL': {
          const { url } = payload || {};
          if (url) {
            await Linking.openURL(url);
          }
          return { id, success: true };
        }

        case 'APP_READY': {
          if (this.onAppReady) {
            this.onAppReady();
          }
          return { id, success: true };
        }

        default:
          return { id, success: false, error: `Unknown bridge command: ${type}` };
      }
    } catch (err: any) {
      console.error(`[BridgeRouter Error] ${type}:`, err);
      return { id, success: false, error: err?.message || String(err) };
    }
  }
}
