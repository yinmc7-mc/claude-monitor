import * as sm from '../server/sessionManager.js';
import * as pm from '../server/processManager.js';

export function cleanupAll() {
  const sessions = sm.getAllSessions();
  for (const session of sessions) {
    if (pm.isRunning(session.id)) {
      pm.killSession(session.id);
      sm.updateStatus(session.id, 'INTERRUPTED');
    }
  }
}