import { app, BrowserWindow, Tray, Menu, dialog, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { execSync } from 'child_process';
import os from 'os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PORT = process.env.PORT || 3000;

let mainWindow = null;
let tray = null;

function ensureClaudeInPath() {
  const candidates = [
    '/usr/local/bin/claude',
    '/opt/homebrew/bin/claude',
    `${os.homedir()}/.local/bin/claude`,
    `${os.homedir()}/.npm-global/bin/claude`,
    '/opt/homebrew/bin/openclaw',
    '/usr/local/bin/openclaw',
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      process.env.PATH = `${path.dirname(p)}:${process.env.PATH}`;
      return true;
    }
  }
  try {
    execSync('which claude', { stdio: 'ignore' });
    return true;
  } catch { }
  return false;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0a0a0a',
    title: 'Claude Monitor',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (!app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadURL(`http://localhost:${PORT}`);
  }

  mainWindow.on('close', (e) => {
    e.preventDefault();
    mainWindow.hide();
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

function createTray() {
  try {
    const iconPath = path.join(ROOT, 'assets', 'tray-iconTemplate.png');
    tray = new Tray(iconPath);
    tray.setToolTip('Claude Monitor');

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show Claude Monitor',
        click: () => { mainWindow?.show(); },
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          app.quit = () => { };
          app.quit();
        },
      },
    ]);
    tray.setContextMenu(contextMenu);
    tray.on('double-click', () => { mainWindow?.show(); });
  } catch { }
}

app.whenReady().then(() => {
  if (!ensureClaudeInPath()) {
    dialog.showErrorBox(
      'Claude CLI Not Found',
      'Neither `claude` nor `openclaw` was found in PATH or common install locations.\n\n' +
      'Checked: /usr/local/bin, /opt/homebrew/bin, ~/.local/bin, ~/.npm-global/bin\n\n' +
      'Please install with: npm install -g @anthropic-ai/claude-code'
    );
    process.exit(1);
  }

  process.env.CLAUDE_MONITOR_DB_DIR = path.join(app.getPath('userData'), 'data');

  import('../server/index.js');

  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow?.show();
    }
  });
});

app.on('before-quit', () => {
  try {
    import('./cleanup.js').then(m => m.cleanupAll());
  } catch { }
});

app.on('window-all-closed', () => { });

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}