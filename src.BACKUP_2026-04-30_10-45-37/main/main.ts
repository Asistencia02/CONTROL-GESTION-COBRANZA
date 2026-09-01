import { app, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs';

// Log file setup
const logPath = path.join(process.env.APPDATA || '.', 'GestionCobranzas', 'logs.txt');
const logDir = path.dirname(logPath);
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

function writeLog(message: string) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(logPath, logMessage);
  console.log(message);
}

writeLog('=== Electron App Starting ===');

const isDev = process.env.VITE_DEV_SERVER_URL ? true : __dirname.includes('app.asar') === false && process.env.NODE_ENV === 'development';
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';

writeLog(`isDev: ${isDev}`);
writeLog(`__dirname: ${__dirname}`);
writeLog(`app.asar in path: ${__dirname.includes('app.asar')}`);

// Load config.json for production
let config = { SUPABASE_URL: '', SUPABASE_ANON_KEY: '' };
const configPath = isDev ? path.join(__dirname, '../config.json') : path.join(__dirname, '../config.json');
writeLog(`Config path: ${configPath}`);

if (fs.existsSync(configPath)) {
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    writeLog('Config loaded successfully');
  } catch (err) {
    writeLog(`Failed to load config.json: ${err}`);
  }
} else {
  writeLog(`Config file not found at: ${configPath}`);
}

// Si está en asar, __dirname es app/main. Si es dev, es dist/main
const isAsar = __dirname.includes('app.asar');
const MAIN_DIST = isAsar ? path.join(__dirname, '../renderer') : path.join(__dirname, '../../dist/renderer');

writeLog(`isAsar: ${isAsar}`);
writeLog(`MAIN_DIST: ${MAIN_DIST}`);

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  writeLog('Creating window...');
  
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, isAsar ? '../preload/index.js' : '../preload/index.js'),
      contextIsolation: true,
      sandbox: true,
    },
  });

  if (isDev) {
    writeLog(`Loading dev server: ${VITE_DEV_SERVER_URL}`);
    mainWindow.loadURL(VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    const indexPath = path.join(MAIN_DIST, 'index.html')
    writeLog(`Loading file: ${indexPath}`);
    writeLog(`File exists: ${fs.existsSync(indexPath)}`);
    
    // Usar file:// protocol con ruta absoluta
    const fileUrl = `file://${path.resolve(indexPath).replace(/\\/g, '/')}`
    writeLog(`File URL: ${fileUrl}`);
    
    mainWindow.loadURL(fileUrl).catch(err => {
      writeLog(`Error loading file: ${err}`);
      mainWindow?.reload()
    })
  }

  mainWindow.on('closed', () => {
    writeLog('Window closed');
    mainWindow = null;
  });
  
  mainWindow.on('ready-to-show', () => {
    writeLog('Window ready to show');
    mainWindow?.show();
  });

  mainWindow.webContents.on('dom-ready', () => {
    writeLog('DOM ready');
  });
}

app.on('ready', () => {
  writeLog(`App ready. isDev: ${isDev}, isAsar: ${isAsar}`);
  createWindow();
});

app.on('window-all-closed', () => {
  writeLog('All windows closed');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  writeLog('App activated');
  if (mainWindow === null) {
    createWindow();
  }
});

process.on('uncaughtException', (error) => {
  writeLog(`Uncaught exception: ${error}`);
});

// IPC Handlers
import { ipcMain } from 'electron';

ipcMain.handle('facturacionService:enviarComprobante', async (_event, _data) => {
  writeLog('IPC: facturacionService:enviarComprobante');
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return {
    success: true,
    cae: 'CAE' + Math.random().toString().substring(2, 13),
    message: 'Comprobante registrado exitosamente en ARCA',
    timestamp: new Date().toISOString(),
  };
});

ipcMain.handle('facturacionService:obtenerUltimos', async (_event, institucion: string) => {
  writeLog(`IPC: facturacionService:obtenerUltimos: ${institucion}`);
  await new Promise((resolve) => setTimeout(resolve, 500));
  return {
    success: true,
    data: [
      {
        id: 1,
        cae: 'CAE1234567890',
        concepto: 'Matrícula',
        monto: 15000,
        fecha: new Date().toISOString(),
        institucion,
      },
    ],
  };
});

ipcMain.handle('config:get', async () => {
  writeLog('IPC: config:get');
  return config;
});
