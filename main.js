const { app, BrowserWindow, Menu } = require('electron')
const path = require('path')

// Mantém referência global para evitar garbage collection
let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Financeiro Fácil',
    // Remove a barra de título nativa do sistema operacional
    frame: true,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // Permite IndexedDB e localStorage funcionar normalmente
      webSecurity: true
    }
  })

  // Remove o menu superior (File, Edit, View…)
  Menu.setApplicationMenu(null)

  // Abre o app em tela cheia
  mainWindow.maximize()

  // Carrega o index.html local
  mainWindow.loadFile('index.html')

  // Descomenta a linha abaixo para abrir as DevTools durante desenvolvimento
  // mainWindow.webContents.openDevTools()

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  createWindow()

  // No macOS é comum recriar a janela ao clicar no ícone do dock
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Encerra o app quando todas as janelas são fechadas (Windows e Linux)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
