import * as FileSystem from 'expo-file-system/legacy';

export const FileSystemHandler = {
  getRootDir(): string {
    return FileSystem.documentDirectory || '';
  },

  getCacheDir(): string {
    return FileSystem.cacheDirectory || '';
  },

  async readFile(uri: string, encoding: 'utf8' | 'base64' = 'utf8'): Promise<string> {
    const fileEncoding = encoding === 'base64' 
      ? FileSystem.EncodingType.Base64 
      : FileSystem.EncodingType.UTF8;
    return await FileSystem.readAsStringAsync(uri, { encoding: fileEncoding });
  },

  async writeFile(uri: string, contents: string, encoding: 'utf8' | 'base64' = 'utf8'): Promise<void> {
    const fileEncoding = encoding === 'base64' 
      ? FileSystem.EncodingType.Base64 
      : FileSystem.EncodingType.UTF8;
    await FileSystem.writeAsStringAsync(uri, contents, { encoding: fileEncoding });
  },

  async deleteFile(uri: string): Promise<void> {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  },

  async getInfo(uri: string): Promise<FileSystem.FileInfo> {
    return await FileSystem.getInfoAsync(uri);
  },

  async saveBase64Image(filename: string, base64Data: string): Promise<string> {
    const dir = `${FileSystem.documentDirectory}images/`;
    const dirInfo = await FileSystem.getInfoAsync(dir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    }
    const fullPath = `${dir}${filename}`;
    // Strip data:image/...;base64, prefix if present
    const cleanData = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
    await FileSystem.writeAsStringAsync(fullPath, cleanData, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return fullPath;
  }
};
