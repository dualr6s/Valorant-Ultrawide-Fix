const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('valorantFit', {
  getDisplays: () => ipcRenderer.invoke('get-displays'),
  fitValorant: (options) => ipcRenderer.invoke('fit-valorant', options),
  setAutoFit: (options) => ipcRenderer.invoke('set-auto-fit', options),
});
