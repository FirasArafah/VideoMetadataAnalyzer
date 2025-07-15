const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  extractMetadata: (filePath) => ipcRenderer.invoke('extract-metadata', filePath),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  setLanguage: (language) => ipcRenderer.invoke('set-language', language)
});