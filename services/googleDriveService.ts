
/**
 * Google Drive & Local Backup Service for SPPG Martajasah
 */

const SCOPES = 'https://www.googleapis.com/auth/drive.file';

export interface DriveSyncStatus {
  connected: boolean;
  lastSync?: string;
  isSyncing: boolean;
  error?: string;
  configMissing?: boolean;
}

class GoogleDriveService {
  private tokenClient: any = null;
  private accessToken: string | null = null;
  // Ganti Client ID ini dengan ID asli dari Google Cloud Console jika ingin menggunakan Drive nyata
  private CLIENT_ID: string = 'YOUR_REAL_CLIENT_ID_HERE.apps.googleusercontent.com'; 

  constructor() {
    this.initTokenClient();
  }

  private initTokenClient() {
    if (typeof window === 'undefined') return;
    const google = (window as any).google;
    
    if (google && this.CLIENT_ID !== 'YOUR_REAL_CLIENT_ID_HERE.apps.googleusercontent.com') {
      try {
        this.tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: this.CLIENT_ID,
          scope: SCOPES,
          callback: (response: any) => {
            if (response.error !== undefined) {
              console.error(response);
              return;
            }
            this.accessToken = response.access_token;
            localStorage.setItem('gdrive_token', response.access_token);
          },
        });
      } catch (err) {
        console.warn("Drive Client Initialization failed: ", err);
      }
    }
  }

  isConfigured(): boolean {
    return this.CLIENT_ID !== 'YOUR_REAL_CLIENT_ID_HERE.apps.googleusercontent.com';
  }

  async authenticate(): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error("CLIENT_ID_MISSING");
    }

    return new Promise((resolve, reject) => {
      try {
        if (!this.tokenClient) {
          this.initTokenClient();
          if (!this.tokenClient) return reject("Client not initialized");
        }
        this.tokenClient.requestAccessToken({ prompt: 'consent' });
        
        const checkToken = setInterval(() => {
          if (this.accessToken) {
            clearInterval(checkToken);
            resolve();
          }
        }, 500);
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Mengunduh data sebagai file JSON (Fallback jika Drive tidak aktif)
   */
  exportLocal(data: any) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `Martajasah_Backup_${date}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    localStorage.setItem('gdrive_last_sync', new Date().toISOString());
  }

  async syncAll(data: { stock: any, menu: any, procurement: any, distribution: any }): Promise<void> {
    if (!this.isConfigured()) {
      this.exportLocal(data);
      return;
    }

    if (!this.accessToken) {
        const savedToken = localStorage.getItem('gdrive_token');
        if (savedToken) this.accessToken = savedToken;
        else throw new Error("Not authenticated");
    }

    try {
      const rootId = await this.findOrCreateFolder('SPPG Martajasah');
      const folderIds = {
        Gudang: await this.findOrCreateFolder('Gudang', rootId),
        Menu: await this.findOrCreateFolder('Menu', rootId),
        Pembelian: await this.findOrCreateFolder('Pembelian', rootId),
        Distribusi: await this.findOrCreateFolder('Distribusi', rootId)
      };

      const dateStr = new Date().toISOString().split('T')[0];

      await Promise.all([
        this.uploadFile(folderIds.Gudang, `Stok_${dateStr}.json`, data.stock),
        this.uploadFile(folderIds.Menu, `Menu_${dateStr}.json`, data.menu),
        this.uploadFile(folderIds.Pembelian, `Pembelian_${dateStr}.json`, data.procurement),
        this.uploadFile(folderIds.Distribusi, `Distribusi_${dateStr}.json`, data.distribution)
      ]);
      
      localStorage.setItem('gdrive_last_sync', new Date().toISOString());
    } catch (err) {
      console.error("Cloud sync failed, falling back to local export", err);
      this.exportLocal(data);
    }
  }

  private async findOrCreateFolder(folderName: string, parentId?: string): Promise<string> {
    const query = `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false${parentId ? ` and '${parentId}' in parents` : ''}`;
    const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id, name)`, {
      headers: { 'Authorization': `Bearer ${this.accessToken}` }
    });
    const data = await response.json();
    if (data.files && data.files.length > 0) return data.files[0].id;

    const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: folderName, mimeType: 'application/vnd.google-apps.folder', parents: parentId ? [parentId] : [] })
    });
    const folder = await createResponse.json();
    return folder.id;
  }

  private async uploadFile(folderId: string, fileName: string, content: any): Promise<void> {
    const metadata = { name: fileName, parents: [folderId], mimeType: 'application/json' };
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([JSON.stringify(content)], { type: 'application/json' }));
    await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.accessToken}` },
      body: form
    });
  }
}

export const driveService = new GoogleDriveService();
