import { spawn } from 'child_process';
import * as sm from './sessionManager.js';
import { parseEvent, processRawText } from './outputParser.js';

const running = new Map();

const TERMINAL_COMMANDS = {
  claude: 'claude',
  openclaw: 'openclaw',
};

export function startSession(session) {
  const cmd = TERMINAL_COMMANDS[session.terminal] || 'claude';
  const args = [
    '--output-format', 'stream-json',
    '--verbose',
    '--print',
    '--dangerously-skip-permissions',
    '-p',
    session.prompt || session.command || '',
  ];

  const proc = spawn(cmd, args, {
    cwd: session.workingDirectory || process.cwd(),
    env: { ...process.env },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  running.set(session.id, proc);

  let buffer = '';
  proc.stdout.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const event = JSON.parse(line);
        parseEvent(session.id, event);
      } catch {
        processRawText(session.id, line);
      }
      sm.broadcast(session.id);
    }
  });

  proc.stderr.on('data', (data) => {
    sm.appendError(session.id, data.toString());
    sm.broadcast(session.id);
  });

  proc.on('exit', (code) => {
    sm.handleExit(session.id, code);
    running.delete(session.id);
    sm.broadcast(session.id);
  });

  proc.on('error', (err) => {
    sm.updateStatus(session.id, 'ERROR');
    sm.appendError(session.id, `Process error: ${err.message}`);
    running.delete(session.id);
    sm.broadcast(session.id);
  });

  return proc;
}

export function sendInput(sessionId, text) {
  const session = sm.getSession(sessionId);
  if (!session) return;
  if (session.status !== 'WAITING_INPUT') return null;

  const proc = running.get(sessionId);
  if (proc && proc.stdin.writable) {
    proc.stdin.write(text + '\n');
    sm.clearIntervention(sessionId);
    sm.updateStatus(sessionId, 'RUNNING');
    sm.broadcast(sessionId);
    return true;
  }
  return false;
}

export function killSession(sessionId) {
  const proc = running.get(sessionId);
  if (proc) {
    proc.kill('SIGTERM');
    setTimeout(() => {
      try { proc.kill('SIGKILL'); } catch {}
    }, 5000);
  }
  sm.deleteSession(sessionId);
}

export function isRunning(sessionId) {
  return running.has(sessionId);
}