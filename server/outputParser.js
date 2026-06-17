import * as sm from './sessionManager.js';
import { alert } from './notifier.js';

const WAITING_PATTERNS = [
  { test: (text) => /\?\s*$/.test(text) && text.trim().split('\n').pop().endsWith('?'), weight: 0.3 },
  { test: (text) => /\(y\/n\)/i.test(text), weight: 0.8 },
  { test: (text) => /please (confirm|choose|select)/i.test(text), weight: 0.7 },
  { test: (text) => /which (option|approach|version)/i.test(text), weight: 0.6 },
  { test: (text) => /do you want/i.test(text), weight: 0.7 },
  { test: (text) => /shall i/i.test(text), weight: 0.7 },
  { test: (text) => /would you like me to/i.test(text), weight: 0.6 },
];

const ERROR_PATTERNS = [
  /error:/i,
  /failed to/i,
  /cannot find/i,
  /permission denied/i,
  /EACCES/i,
  /ENOENT/i,
];

const DONE_PATTERNS = [
  /task (complete|finished|done)/i,
  /all done/i,
];

const TOOL_USE_WRITE_TOOLS = new Set([
  'write_to_file', 'write', 'Bash', 'Write', 'Edit',
]);

export function parseEvent(sessionId, event) {
  try {
    onEvent(sessionId, event);
  } catch (e) {
    console.error(`[outputParser] Error processing event for ${sessionId}:`, e.message);
    sm.appendError(sessionId, `Parser error: ${e.message}`);
  }
}

function onEvent(sessionId, event) {
  const type = event.type;

  switch (type) {
    case 'system':
      onSystem(sessionId, event);
      break;
    case 'assistant':
      onAssistant(sessionId, event);
      break;
    case 'tool_use':
      onToolUse(sessionId, event);
      break;
    case 'tool_result':
      onToolResult(sessionId, event);
      break;
    case 'user':
      onUser(sessionId, event);
      break;
    case 'result':
      onResult(sessionId, event);
      break;
    default:
      break;
  }
}

function onSystem(sessionId, event) {
  const session = sm.getSession(sessionId);
  if (!session) return;
  if (event.subtype === 'init') {
    sm.updateStatus(sessionId, 'STARTING');
  }
}

function onAssistant(sessionId, event) {
  const session = sm.getSession(sessionId);
  if (!session) return;

  const text = extractText(event.message);
  if (!text) return;

  sm.updateStatus(sessionId, 'THINKING');
  sm.appendOutput(sessionId, text);

  const intervention = detectsIntervention(text);
  if (intervention.score > 0.6) {
    const options = extractOptions(text);
    sm.setWaitingInput(sessionId, text, options);
    alert(
      session.label,
      options ? `需要选择：${options.join(' / ')}` : text.slice(0, 100)
    );
  }
}

function extractText(message) {
  if (!message) return null;
  if (typeof message === 'string') return message;
  if (message.content && Array.isArray(message.content)) {
    return message.content
      .filter(c => c.type === 'text')
      .map(c => c.text)
      .join('\n');
  }
  if (message.content && typeof message.content === 'string') return message.content;
  return JSON.stringify(message);
}

function detectsIntervention(text) {
  let maxScore = 0;
  for (const pattern of WAITING_PATTERNS) {
    if (pattern.test(text)) maxScore = Math.max(maxScore, pattern.weight);
  }
  return { score: maxScore };
}

function extractOptions(text) {
  const options = [];
  const numbered = text.match(/(\d+)[.)]\s+([^\n]+)/g);
  if (numbered) {
    for (const m of numbered) {
      const match = m.match(/(\d+)[.)]\s+(.+)/);
      if (match) options.push(match[2].trim());
    }
  }
  return options.length > 0 ? options : null;
}

function onToolUse(sessionId, event) {
  const session = sm.getSession(sessionId);
  if (!session) return;

  sm.updateStatus(sessionId, 'RUNNING');

  const description = event.name ? `${event.name}: ${JSON.stringify(event.input || {}).slice(0, 100)}` : 'Tool call';
  sm.addStep(sessionId, {
    type: 'tool_use',
    description,
    detail: event.name,
  });

  if (TOOL_USE_WRITE_TOOLS.has(event.name)) {
    if (event.input?.file_path || event.input?.path) {
      const filePath = event.input.file_path || event.input.path;
      sm.addFileChange(sessionId, {
        path: filePath,
        type: 'modified',
        before: null,
        after: null,
        timestamp: Date.now(),
      });
    }
  }
}

function onToolResult(sessionId, event) {
  if (event.is_error) {
    sm.updateStatus(sessionId, 'ERROR');
  }

  const session = sm.getSession(sessionId);
  if (session && session.currentStep) {
    sm.completeStep(sessionId, session.currentStep);
  }
}

function onUser(sessionId, event) {
  // User message events — track for timeline
}

function onResult(sessionId, event) {
  if (event.subtype === 'success') {
    sm.updateStatus(sessionId, 'DONE');
  } else if (event.subtype === 'error') {
    sm.updateStatus(sessionId, 'ERROR');
  }
}

export function processRawText(sessionId, line) {
  const session = sm.getSession(sessionId);
  if (!session) return;
  sm.appendOutput(sessionId, line);
  sm.updateStatus(sessionId, 'THINKING');
}