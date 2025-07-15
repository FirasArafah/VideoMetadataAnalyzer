const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const Store = require('electron-store');
const exiftool = require('exiftool-vendored').exiftool;
const sharp = require('sharp');

const store = new Store();

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 850,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false
    },
    icon: path.join(__dirname, '../../src/assets/icons/icon.png')
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers
ipcMain.handle('open-file-dialog', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Media Files', extensions: ['mp4', 'mov', 'avi', 'mkv', 'm4v', 'jpg', 'jpeg', 'png', 'heic'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  return result.filePaths;
});

ipcMain.handle('extract-metadata', async (event, filePath) => {
  try {
    // Extract metadata using exiftool
    const metadata = await exiftool.read(filePath);
    
    // For images, extract additional thumbnail if available
    if (filePath.toLowerCase().match(/\.(jpg|jpeg|png|heic)$/)) {
      try {
        const thumbnail = await sharp(filePath)
          .resize(200, 200, { fit: 'inside' })
          .toBuffer();
        metadata.thumbnail = thumbnail.toString('base64');
      } catch (e) {
        console.log('Could not extract thumbnail:', e.message);
      }
    }

    return {
      success: true,
      metadata: metadata,
      rawMetadata: JSON.stringify(metadata, null, 2)
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

ipcMain.handle('get-settings', () => {
  return {
    language: store.get('language', 'en')
  };
});

ipcMain.handle('set-language', (event, language) => {
  store.set('language', language);
  return { success: true };
});