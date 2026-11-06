// The only door between the page and the app: the page may ask for the system dialog to choose a folder.
const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("pultApp", { ordnerWaehlen: () => ipcRenderer.invoke("ordner-waehlen") });
