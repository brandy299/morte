// The only door between the page and the app: the page may ask for the system dialog to choose a folder and for the system page with the microphone switch.
const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("pultApp", { ordnerWaehlen: () => ipcRenderer.invoke("ordner-waehlen"), mikrofonEinstellungen: () => ipcRenderer.invoke("mikrofon-einstellungen") });
