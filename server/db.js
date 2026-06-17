import Database from 'better-sqlite3';
import path from 'path';
import os from 'os';
import fs from 'fs';

const DB_DIR = path.join(os.homedir(), '.claude-monitor');
const DB_PATH = path.join(DB_DIR, 'monitor.db');

let db;

function getDb() {
  if (db) return db;
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      working_directory TEXT,
      command TEXT,
      model TEXT DEFAULT 'claude-opus-4-5',
      status TEXT NOT NULL DEFAULT 'IDLE',
      created_at INTEGER,
      updated_at INTEGER,
      token_input INTEGER DEFAULT 0,
      token_output INTEGER DEFAULT 0,
      exit_code INTEGER
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      type TEXT NOT NULL,
      raw_json TEXT NOT NULL,
      processed_text TEXT,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    );

    CREATE TABLE IF NOT EXISTS steps (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT NOT NULL,
      detail TEXT,
      started_at INTEGER,
      completed_at INTEGER,
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    );

    CREATE TABLE IF NOT EXISTS file_changes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      path TEXT NOT NULL,
      change_type TEXT NOT NULL,
      before_content TEXT,
      after_content TEXT,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    );

    CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);
    CREATE INDEX IF NOT EXISTS idx_steps_session ON steps(session_id);
    CREATE INDEX IF NOT EXISTS idx_file_changes_session ON file_changes(session_id);
  `);

  return db;
}

export function insertSession({ id, label, workingDirectory, command, model, status, createdAt, updatedAt }) {
  const s = getDb().prepare(`
    INSERT INTO sessions (id, label, working_directory, command, model, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  s.run(id, label, workingDirectory, command, model, status, createdAt, updatedAt);
}

export function updateSessionStatus(id, status, exitCode = null) {
  const d = getDb().prepare('UPDATE sessions SET status = ?, updated_at = ?, exit_code = ? WHERE id = ?');
  d.run(status, Date.now(), exitCode, id);
}

export function updateTokenUsage(id, input, output, limit) {
  const d = getDb().prepare('UPDATE sessions SET token_input = ?, token_output = ? WHERE id = ?');
  d.run(input, output, id);
}

export function insertEvent(sessionId, type, rawJson, processedText, timestamp) {
  const s = getDb().prepare(
    'INSERT INTO events (session_id, type, raw_json, processed_text, timestamp) VALUES (?, ?, ?, ?, ?)'
  );
  s.run(sessionId, type, rawJson, processedText ?? null, timestamp);
}

export function insertStep(id, sessionId, type, description, detail, startedAt) {
  const s = getDb().prepare(
    'INSERT INTO steps (id, session_id, type, description, detail, started_at) VALUES (?, ?, ?, ?, ?, ?)'
  );
  s.run(id, sessionId, type, description, detail ?? null, startedAt);
}

export function completeStep(id, completedAt) {
  const s = getDb().prepare('UPDATE steps SET completed_at = ? WHERE id = ?');
  s.run(completedAt, id);
}

export function insertFileChange(sessionId, path_, changeType, beforeContent, afterContent, timestamp) {
  const s = getDb().prepare(
    'INSERT INTO file_changes (session_id, path, change_type, before_content, after_content, timestamp) VALUES (?, ?, ?, ?, ?, ?)'
  );
  s.run(sessionId, path_, changeType, beforeContent ?? null, afterContent ?? null, timestamp);
}

export function getSteps(sessionId) {
  return getDb().prepare('SELECT * FROM steps WHERE session_id = ? ORDER BY started_at').all(sessionId);
}

export function getFileChanges(sessionId) {
  return getDb().prepare('SELECT * FROM file_changes WHERE session_id = ? ORDER BY timestamp').all(sessionId);
}

export function getEvents(sessionId) {
  return getDb().prepare('SELECT * FROM events WHERE session_id = ? ORDER BY timestamp').all(sessionId);
}

export function getAllSessions() {
  return getDb().prepare('SELECT * FROM sessions ORDER BY created_at DESC').all();
}

export function getSession(id) {
  return getDb().prepare('SELECT * FROM sessions WHERE id = ?').get(id);
}

export function deleteSession(id) {
  getDb().prepare('DELETE FROM file_changes WHERE session_id = ?').run(id);
  getDb().prepare('DELETE FROM steps WHERE session_id = ?').run(id);
  getDb().prepare('DELETE FROM events WHERE session_id = ?').run(id);
  getDb().prepare('DELETE FROM sessions WHERE id = ?').run(id);
}

export { getDb };