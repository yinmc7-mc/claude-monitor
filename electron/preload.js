import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getPlatform: () => process.platform,

  checkClaudeInstalled: () => ipcRenderer.invoke('check-claude-installed'),

  openInFinder: (dirPath) => ipcRenderer.invoke('open-in-finder', dirPath),

  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  showNotification: (title, body) => ipcRenderer.invoke('show-notification', title, body),

  getDataPath: () => ipcRenderer.invoke('get-data-path'),

  onNavigate: (callback) => ipcRenderer.on('navigate', (_event, route) => callback(route)),
});