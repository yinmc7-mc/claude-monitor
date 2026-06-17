import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import * as sm from './sessionManager.js';
import * as pm from './processManager.js';
import { restoreFromDB } from './sessionManager.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

// --- REST API ---

app.get('/api/sessions', (_req, res) => {
  const sessions = sm.getAllSessions().map(s => ({
    id: s.id,
    label: s.label,
    workingDirectory: s.workingDirectory || s.working_directory,
    command: s.command,
    model: s.model || 'claude-opus-4-5',
    status: s.status,
    createdAt: s.createdAt || s.created_at,
    updatedAt: s.updatedAt || s.updated_at,
    steps: s.steps || [],
    currentStep: s.currentStep || null,
    pendingIntervention: s.pendingIntervention || null,
    fileChanges: s.fileChanges || [],
    tokenUsage: s.tokenUsage || { input: s.token_input || 0, output: s.token_output || 0 },
    pid: s.pid || null,
    exitCode: s.exit_code ?? s.exitCode ?? null,
  }));
  res.json(sessions);
});

app.get('/api/sessions/:id', (req, res) => {
  const session = sm.getSession(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  const s = session;
  res.json({
    id: s.id,
    label: s.label,
    workingDirectory: s.workingDirectory || s.working_directory,
    command: s.command,
    model: s.model || 'claude-opus-4-5',
    status: s.status,
    createdAt: s.createdAt || s.created_at,
    updatedAt: s.updatedAt || s.updated_at,
    steps: s.steps || [],
    currentStep: s.currentStep || null,
    pendingIntervention: s.pendingIntervention || null,
    fileChanges: s.fileChanges || [],
    tokenUsage: s.tokenUsage || { input: s.token_input || 0, output: s.token_output || 0 },
    pid: s.pid || null,
    exitCode: s.exitCode ?? s.exit_code ?? null,
  });
});

app.post('/api/sessions', (req, res) => {
  const { label, workingDirectory, prompt, model, terminal } = req.body;
  if (!label || !workingDirectory) {
    return res.status(400).json({ error: 'label and workingDirectory are required' });
  }

  try {
    const session = sm.createSession({
      label,
      workingDirectory,
      prompt: prompt || label,
      model: model || 'claude-opus-4-7',
      terminal: terminal || 'claude',
    });
    sm.updateStatus(session.id, 'STARTING');
    pm.startSession(session);
    broadcastSessionCreated(session.id);
    res.status(201).json({ id: session.id, status: session.status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sessions/:id/input', (req, res) => {
  const { text, type } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });

  const sent = pm.sendInput(req.params.id, text);
  if (sent === null) {
    return res.status(409).json({ error: 'Session is not waiting for input' });
  }
  if (sent) {
    return res.json({ success: true });
  }
  return res.status(409).json({ error: 'stdin write failed or process not found' });
});

app.post('/api/sessions/:id/kill', (req, res) => {
  pm.killSession(req.params.id);
  sm.updateStatus(req.params.id, 'KILLED');
  broadcastSessionUpdate(req.params.id);
  res.json({ success: true });
});

app.delete('/api/sessions/:id', (req, res) => {
  pm.killSession(req.params.id);
  broadcastSessionRemoved(req.params.id);
  res.json({ success: true });
});

app.get('/api/sessions/:id/events', (req, res) => {
  const session = sm.getSession(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json(session.events || []);
});

app.get('/api/sessions/:id/files', (req, res) => {
  const session = sm.getSession(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json((session.fileChanges || []).map(c => ({
    path: c.path,
    type: c.type,
    timestamp: c.timestamp,
    hasDiff: c.before !== null || c.after !== null,
  })));
});

app.get('/api/sessions/:id/diff', (req, res) => {
  const session = sm.getSession(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  const filePath = req.query.path;
  if (!filePath) return res.status(400).json({ error: 'path query param required' });
  const change = (session.fileChanges || []).find(c => c.path === filePath);
  if (!change) return res.status(404).json({ error: 'No changes found for this file' });
  res.json(change);
});

// Serve static frontend files
app.use(express.static(PUBLIC_DIR));
app.get('*', (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// --- WebSocket ---

const wss = new WebSocketServer({ server });
const wsClients = new Map();

wss.on('connection', (wS) => {
  const clientId = Math.random().toString(36).slice(2);
  const client = { id: clientId, ws: wS, subscribed: new Set() };
  wsClients.set(clientId, client);

  wS.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'subscribe') {
        if (Array.isArray(msg.sessionIds)) {
          msg.sessionIds.forEach(id => client.subscribed.add(id));
        }
      } else if (msg.type === 'unsubscribe') {
        if (Array.isArray(msg.sessionIds)) {
          msg.sessionIds.forEach(id => client.subscribed.delete(id));
        }
      }
    } catch {}
  });

  wS.on('close', () => {
    wsClients.delete(clientId);
  });

  // Send existing session list on connect
  const sessions = sm.getAllSessions().map(s => ({
    id: s.id,
    label: s.label,
    workingDirectory: s.workingDirectory || s.working_directory,
    command: s.command,
    model: s.model || 'claude-opus-4-5',
    status: s.status,
    createdAt: s.createdAt || s.created_at,
    updatedAt: s.updatedAt || s.updated_at,
    steps: s.steps || [],
    currentStep: s.currentStep || null,
    pendingIntervention: s.pendingIntervention || null,
    fileChanges: s.fileChanges || [],
    tokenUsage: s.tokenUsage || { input: s.token_input || 0, output: s.token_output || 0 },
  }));
  wS.send(JSON.stringify({ type: 'init', sessions }));
});

function broadcastToClients(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach((wS) => {
    if (wS.readyState === WebSocket.OPEN) {
      wS.send(msg);
    }
  });
}

function broadcastSessionUpdate(sessionId) {
  const session = sm.getSession(sessionId);
  if (!session) return;
  const s = session;
  broadcastToClients({
    type: 'session_update',
    sessionId,
    payload: {
      id: s.id,
      label: s.label,
      workingDirectory: s.workingDirectory || s.working_directory,
      command: s.command,
      model: s.model || 'claude-opus-4-5',
      status: s.status,
      createdAt: s.createdAt || s.created_at,
      updatedAt: s.updatedAt || s.updated_at,
      steps: s.steps || [],
      currentStep: s.currentStep || null,
      pendingIntervention: s.pendingIntervention || null,
      fileChanges: s.fileChanges || [],
      tokenUsage: s.tokenUsage || { input: s.token_input || 0, output: s.token_output || 0 },
      pid: s.pid || null,
      exitCode: s.exitCode ?? s.exit_code ?? null,
    },
    timestamp: Date.now(),
  });

  if (session.status === 'WAITING_INPUT') {
    const s2 = session;
    broadcastToClients({
      type: 'intervention_required',
      sessionId,
      payload: {
        sessionId,
        label: s2.label,
        question: s2.pendingIntervention?.question || '',
        options: s2.pendingIntervention?.options || null,
        requiresConfirmation: true,
      },
      timestamp: Date.now(),
    });
  }
}

function broadcastSessionCreated(sessionId) {
  const session = sm.getSession(sessionId);
  if (!session) return;
  broadcastToClients({
    type: 'session_created',
    sessionId,
    payload: {
      id: session.id,
      label: session.label,
      command: session.command,
      model: session.model,
      status: session.status,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      steps: [],
      currentStep: null,
      pendingIntervention: null,
      fileChanges: [],
      tokenUsage: { input: 0, output: 0 },
    },
    timestamp: Date.now(),
  });
}

function broadcastSessionRemoved(sessionId) {
  broadcastToClients({
    type: 'session_removed',
    sessionId,
    payload: null,
    timestamp: Date.now(),
  });
}

// Wire broadcast into sessionManager
sm.setBroadcast(broadcastSessionUpdate);

// --- Startup ---

try {
  restoreFromDB();
  console.log(`[server] Database restored. ${sm.getAllSessions().length} sessions loaded.`);
} catch (err) {
  console.warn('[server] DB restore failed:', err.message);
}

server.listen(PORT, () => {
  console.log(`[server] Claude Monitor running at http://localhost:${PORT}`);
});

export { wss, broadcastSessionUpdate as broadcast };