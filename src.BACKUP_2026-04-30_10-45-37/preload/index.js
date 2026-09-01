const { contextBridge, ipcRenderer } = require('electron')

// Exponer API segura al renderer process
const api = {
  facturacionService: {
    enviarComprobante: (data) =>
      ipcRenderer.invoke('facturacionService:enviarComprobante', data),
    obtenerUltimos: (institucion) =>
      ipcRenderer.invoke('facturacionService:obtenerUltimos', institucion),
  },
  config: {
    get: () =>
      ipcRenderer.invoke('config:get'),
  },
}

contextBridge.exposeInMainWorld('electron', api)
