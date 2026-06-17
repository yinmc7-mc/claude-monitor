import { v4 as uuidv4 } from 'uuid';
import * as db from './db.js';

const sessions = new Map();

const STATUS_TRANSITIONS = {
  IDLE: ['STARTING'],
  STARTING: ['STARTING', 'THINKING', 'RUNNING', 'ERROR', 'DONE'],
  THINKING: ['RUNNING', 'WAITING_INPUT', 'DONE', 'ERROR'],
  RUNNING: ['WAITING_INPUT', 'THINKING', 'DONE', 'ERROR'],
  WAITING_INPUT: ['RUNNING', 'ERROR', 'KILLED'],
  DONE: [],
  ERROR: [],
  KILLED: [],
  INTERRUPTED: [],
};

export function createSession({ label, workingDirectory, prompt, model, terminal }) {
  const id = uuidv4();
  const session = {
    id,
    label,
    workingDirectory,
    command: prompt || label,
    model: model || 'claude-opus-4-7',
    terminal: terminal || 'claude',
    status: 'IDLE',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    steps: [],
    currentStep: null,
    pendingIntervention: null,
    fileChanges: [],
    tokenUsage: { input: 0, output: 0, estimatedLimit: 200000 },
    events: [],
    pid: null,
    exitCode: null,
    proc: null,
  };
  sessions.set(id, session);
  db.insertSession(session);
  return session;
}

export function getSession(id) {
  return sessions.get(id);
}

export function getAllSessions() {
  return Array.from(sessions.values()).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function updateStatus(id, newStatus, exitCode = null) {
  const session = sessions.get(id);
  if (!session) return;
  const allowed = STATUS_TRANSITIONS[session.status] || [];
  if (!allowed.includes(newStatus)) {
    console.warn(`[sessionManager] Invalid transition: ${session.status} → ${newStatus}`);
    return;
  }
  session.status = newStatus;
  session.updatedAt = Date.now();
  if (exitCode !== null) session.exitCode = exitCode;
  db.updateSessionStatus(id, newStatus, exitCode);
}

export function addStep(id, step) {
  const session = sessions.get(id);
  if (!session) return;
  if (!step.id) step.id = uuidv4();
  step.startedAt = step.startedAt || Date.now();
  session.steps.push(step);
  session.currentStep = step.id;
  db.insertStep(step.id, id, step.type, step.description, step.detail, step.startedAt);
}

export function completeStep(id, stepId) {
  const session = sessions.get(id);
  if (!session) return;
  const step = session.steps.find(s => s.id === stepId);
  if (step) {
    step.completedAt = Date.now();
    db.completeStep(stepId, step.completedAt);
  }
}

export function setWaitingInput(id, question, options = null) {
  const session = sessions.get(id);
  if (!session) return;
  session.status = 'WAITING_INPUT';
  session.pendingIntervention = {
    question,
    options,
    rawOutput: question,
    timestamp: Date.now(),
  };
  session.updatedAt = Date.now();
  db.updateSessionStatus(id, 'WAITING_INPUT');
}

export function clearIntervention(id) {
  const session = sessions.get(id);
  if (!session) return;
  session.pendingIntervention = null;
  session.status = 'RUNNING';
  session.updatedAt = Date.now();
}

export function appendOutput(id, text) {
  const session = sessions.get(id);
  if (!session) return;
  session.events.push({ type: 'assistant', text, timestamp: Date.now() });
}

export function appendError(id, text) {
  const session = sessions.get(id);
  if (!session) return;
  session.events.push({ type: 'error', text, timestamp: Date.now() });
}

export function deleteSession(id) {
  sessions.delete(id);
  db.deleteSession(id);
}

export function addFileChange(id, change) {
  const session = sessions.get(id);
  if (!session) return;
  session.fileChanges.push(change);
  session.updatedAt = Date.now();
  db.insertFileChange(id, change.path, change.type, change.before, change.after, change.timestamp);
}

export function updateTokenUsage(id, input, output) {
  const session = sessions.get(id);
  if (!session) return;
  session.tokenUsage.input = input;
  session.tokenUsage.output = output;
  const pct = (input + output) / (session.tokenUsage.estimatedLimit || 200000);
  db.updateTokenUsage(id, input, output);
  return { updated: true, pct };
}

export function handleExit(id, code) {
  const session = sessions.get(id);
  if (!session) return;
  session.exitCode = code;
  if (session.status === 'RUNNING' || session.status === 'THINKING' || session.status === 'STARTING') {
    if (code === 0) updateStatus(id, 'DONE', code);
    else updateStatus(id, 'ERROR', code);
  }
  db.updateSessionStatus(id, session.status, code);
}

export function restoreFromDB() {
  const dbSessions = db.getAllSessions();
  for (const s of dbSessions) {
    if (['RUNNING', 'THINKING', 'STARTING', 'WAITING_INPUT'].includes(s.status)) {
      s.status = 'INTERRUPTED';
      db.updateSessionStatus(s.id, 'INTERRUPTED');
    }
    s.steps = db.getSteps(s.id);
    s.fileChanges = db.getFileChanges(s.id);
    s.events = [];
    s.pendingIntervention = null;
    s.proc = null;
    s.pid = null;
    sessions.set(s.id, s);
  }
  console.log(`[sessionManager] Restored ${sessions.size} sessions from DB`);
}

let broadcastFn = null;

export function setBroadcast(fn) {
  broadcastFn = fn;
}

export function broadcast(id) {
  if (broadcastFn) broadcastFn(id);
}