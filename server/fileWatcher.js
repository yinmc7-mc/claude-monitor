import fs from 'fs';
import * as sm from './sessionManager.js';

const pendingCaptures = new Map();

export function captureBeforeState(sessionId, filePath, content) {
  try {
    if (fs.existsSync(filePath)) {
      const beforeContent = fs.readFileSync(filePath, 'utf-8');
      pendingCaptures.set(`${sessionId}:${filePath}`, { before: beforeContent, timestamp: Date.now() });
    } else {
      pendingCaptures.set(`${sessionId}:${filePath}`, { before: null, timestamp: Date.now() });
    }
  } catch {
    pendingCaptures.set(`${sessionId}:${filePath}`, { before: null, timestamp: Date.now() });
  }
}

export function captureAfterState(sessionId, filePath) {
  const key = `${sessionId}:${filePath}`;
  const pending = pendingCaptures.get(key);

  let afterContent = null;
  try {
    if (fs.existsSync(filePath)) {
      afterContent = fs.readFileSync(filePath, 'utf-8');
    }
  } catch {
    afterContent = '[unable to read]';
  }

  if (pending) {
    const change = {
      path: filePath,
      type: pending.before === null ? 'created' : 'modified',
      before: pending.before,
      after: afterContent,
      timestamp: pending.timestamp,
    };
    sm.addFileChange(sessionId, change);
    pendingCaptures.delete(key);
  } else {
    const change = {
      path: filePath,
      type: 'created',
      before: null,
      after: afterContent,
      timestamp: Date.now(),
    };
    sm.addFileChange(sessionId, change);
  }
}

export function watchDirectory(dir, sessionId) {
  try {
    const chokidar = await import('chokidar');
    const watcher = chokidar.watch(dir, {
      ignored: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**'],
      persistent: true,
      ignoreInitial: true,
    });

    watcher.on('add', (filePath) => {
      captureAfterState(sessionId, filePath);
      sm.broadcast(sessionId);
    });

    watcher.on('change', (filePath) => {
      const key = `${sessionId}:${filePath}`;
      if (!pendingCaptures.has(key)) {
        const beforeContent = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : null;
        pendingCaptures.set(key, { before: beforeContent, timestamp: Date.now() });
      }
      // Wait a short moment before capturing "after" to ensure write is complete
      setTimeout(() => captureAfterState(sessionId, filePath), 200);
    });

    watcher.on('unlink', (filePath) => {
      sm.addFileChange(sessionId, {
        path: filePath,
        type: 'deleted',
        before: null,
        after: null,
        timestamp: Date.now(),
      });
      sm.broadcast(sessionId);
    });

    return watcher;
  } catch (err) {
    console.warn('[fileWatcher] chokidar not available, using fs.watch fallback');
    try {
      return fs.watch(dir, { recursive: true }, (eventType, filename) => {
        if (!filename) return;
        const filePath = `${dir}/${filename}`;
        if (eventType === 'rename') {
          captureAfterState(sessionId, filePath);
        }
        sm.broadcast(sessionId);
      });
    } catch {
      return null;
    }
  }
}