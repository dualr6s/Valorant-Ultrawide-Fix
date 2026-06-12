const path = require('path');
const { app, BrowserWindow, ipcMain, screen } = require('electron');
const { fitValorantWindow, findValorantWindow } = require('./lib/valorant-window');

let mainWindow = null;
let autoFitTimer = null;

function getDisplays() {
  const primaryDisplayId = screen.getPrimaryDisplay().id;

  return screen.getAllDisplays().map((display, index) => ({
    id: display.id,
    index,
    label: display.label || `Monitor ${index + 1}`,
    primary: display.id === primaryDisplayId,
    bounds: display.bounds,
  }));
}

function getDisplayById(displayId) {
  const displays = getDisplays();
  return (
    displays.find((display) => display.id === displayId) ??
    displays.find((display) => display.primary) ??
    displays[0]
  );
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 420,
    minWidth: 360,
    minHeight: 380,
    resizable: true,
    autoHideMenuBar: true,
    backgroundColor: '#0f1923',
    title: 'Valorant Window Fit',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile('index.html');
}

function stopAutoFit() {
  if (autoFitTimer) {
    clearInterval(autoFitTimer);
    autoFitTimer = null;
  }
}

function startAutoFit(displayId) {
  stopAutoFit();

  autoFitTimer = setInterval(() => {
    if (!findValorantWindow()) {
      return;
    }

    const display = getDisplayById(displayId);
    if (!display) {
      return;
    }

    fitValorantWindow(display.bounds);
  }, 2000);
}

ipcMain.handle('get-displays', () => getDisplays());

ipcMain.handle('fit-valorant', (_event, payload) => {
  const display = getDisplayById(payload.displayId);
  if (!display) {
    return {
      success: false,
      message: 'Selected monitor was not found.',
    };
  }

  return fitValorantWindow(display.bounds);
});

ipcMain.handle('set-auto-fit', (_event, payload) => {
  if (payload.enabled) {
    startAutoFit(payload.displayId);
    return {
      success: true,
      message: 'Auto-fit enabled. The window will be adjusted every 2 seconds.',
    };
  }

  stopAutoFit();
  return { success: true, message: 'Auto-fit disabled.' };
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  stopAutoFit();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
