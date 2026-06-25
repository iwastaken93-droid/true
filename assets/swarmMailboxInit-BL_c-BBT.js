import{S as D,aC as N}from"./MainApp-Df-Yla8O.js";import{y as x,bJ as q,aG as V,bK as Y,bI as z}from"./index-fjg3G3vZ.js";import{quotePathForShell as X}from"./shared-BM-yHd5F.js";import"./vendor-markdown-kWDvDbaY.js";import"./index-CURR3cC1.js";import"./vendor-react-C0wFb-u9.js";import"./updaterErrors-DcJ7VU4M.js";import"./webviewSuppressStore-BoP0D7lc.js";import"./TauriBootstrapGate-C8B4sL18.js";import"./ErrorNotificationContext-Dd8_JIL2.js";import"./StripeService-Jc8DsSRZ.js";import"./send-horizontal-sXcjo4Nn.js";import"./index-BTBlX0yg.js";import"./download-CfowfDZj.js";import"./protocol-7GFuTYYI.js";import"./index-ZyM25V0a.js";import"./vendor-codemirror-legF6snt.js";function Q(){return`#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const SCRIPT_DIR = __dirname;
const GLOBAL_STATUS_DIR = path.join(os.homedir(), '.bridgespace', 'claude-hooks', 'global');

// Read Claude's hook stdin payload up-front so we can derive the workspace
// root from it. Claude includes \`cwd\` (project root) on every hook event —
// using stdin avoids depending on the script's own location, which lets us
// install the dispatcher at a HOME-stable path even when the workspace path
// contains spaces.
function readStdinSync() {
  if (process.stdin.isTTY) return '';
  try {
    const buf = fs.readFileSync(0, 'utf8');
    return typeof buf === 'string' ? buf : '';
  } catch {
    return '';
  }
}

const stdinRaw = readStdinSync();
let stdinPayload = null;
if (stdinRaw) {
  try { stdinPayload = JSON.parse(stdinRaw); } catch { stdinPayload = null; }
}

function deriveWorkspaceRoot() {
  // 1. stdin cwd from Claude's hook payload (canonical source).
  if (stdinPayload && typeof stdinPayload.cwd === 'string' && stdinPayload.cwd) {
    return stdinPayload.cwd;
  }
  // 2. Legacy install path: dispatcher used to live in
  //    \`<workspace>/.bridgespace/bin/\`, so __dirname's grandparent IS the
  //    workspace root. Detect by checking that SCRIPT_DIR's parent is named
  //    \`.bridgespace\` — if so, fall back to that for older installs that
  //    haven't been re-registered with the HOME-based dispatcher yet.
  const scriptParent = path.basename(path.dirname(SCRIPT_DIR));
  if (scriptParent === '.bridgespace') {
    return path.dirname(path.dirname(SCRIPT_DIR));
  }
  // 3. Last resort: process.cwd(). Claude generally invokes hooks with the
  //    project root as cwd, so this is correct in practice.
  return process.cwd();
}

const WORKSPACE_ROOT = deriveWorkspaceRoot();
const BS_ROOT = path.join(WORKSPACE_ROOT, '.bridgespace');
const REGISTRY_DIR = path.join(BS_ROOT, 'claude-hooks', 'scopes');

function listActiveScopes() {
  if (!fs.existsSync(REGISTRY_DIR)) return [];
  try {
    return fs.readdirSync(REGISTRY_DIR)
      .filter((name) => name.endsWith('.json'))
      .map((name) => name.replace(/\\.json$/i, ''));
  } catch {
    return [];
  }
}

function readMarker(markerPath) {
  try {
    const content = fs.readFileSync(markerPath, 'utf8');
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
  } catch {
    // Ignore malformed markers and treat them as missing.
  }
  return null;
}

function resolveScopeContext() {
  const envScopeId = process.env.BRIDGESPACE_SWARM_SCOPE_ID || '';
  if (envScopeId) {
    const markerPath = path.join(REGISTRY_DIR, envScopeId + '.json');
    if (fs.existsSync(markerPath)) {
      const marker = readMarker(markerPath);
      if (marker && typeof marker.binDir === 'string') {
        return marker;
      }
    }
  }

  const activeScopes = listActiveScopes();
  if (activeScopes.length === 1) {
    const markerPath = path.join(REGISTRY_DIR, activeScopes[0] + '.json');
    const marker = readMarker(markerPath);
    if (marker && typeof marker.binDir === 'string') {
      return marker;
    }
  }

  return null;
}

function runNodeScript(scriptPath, args) {
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    stdio: 'inherit',
    env: process.env,
  });
  return typeof result.status === 'number' ? result.status : 0;
}

function dispatchMail(scope) {
  const mailScript = path.join(BS_ROOT, scope.binDir, 'bs-mail.cjs');
  if (!fs.existsSync(mailScript)) return 0;
  return runNodeScript(mailScript, ['check', '--inject']);
}

function dispatchStatus(scope, status, title, body) {
  const notifyScript = path.join(BS_ROOT, scope.binDir, 'bs-notify.cjs');
  if (!fs.existsSync(notifyScript)) return 0;
  return runNodeScript(notifyScript, [status, title, body]);
}

const event = (process.argv[2] || '').toLowerCase();
const status = process.argv[3] || '';
const title = process.argv[4] || '';
const body = process.argv[5] || '';
const scope = resolveScopeContext();

// stdin was already consumed at the top of the script to derive the workspace
// root. The payload also carries the user's prompt (UserPromptSubmit) which
// the renderer uses to seed terminal-title generation.
function pickUserPromptFromPayload(payload) {
  if (!payload || typeof payload !== 'object') return '';
  // Claude Code uses 'prompt'; other agents may use 'user_prompt' or 'message'.
  const keys = ['prompt', 'user_prompt', 'userPrompt', 'message', 'text'];
  for (const k of keys) {
    const v = payload[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

const userPrompt = pickUserPromptFromPayload(stdinPayload);

// Claude Code includes its own conversation id on every hook payload as
// \`session_id\`. This is a DIFFERENT namespace from BRIDGESPACE_SESSION_ID
// (our PTY id) — it's the durable identity needed to build a
// \`claude --resume <id>\` command that survives an app crash / battery death.
function pickNativeSessionId(payload) {
  if (!payload || typeof payload !== 'object') return '';
  const keys = ['session_id', 'sessionId', 'conversation_id', 'conversationId'];
  for (const k of keys) {
    const v = payload[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

const nativeSessionId = pickNativeSessionId(stdinPayload);

// One-line debug breadcrumb when prompt extraction fails on a prompt-submit
// event. Helps diagnose host-specific stdin quirks without blowing up logs.
if (event === 'user-prompt-submit' && !userPrompt) {
  try {
    const debugDir = path.join(os.homedir(), '.bridgespace', 'logs');
    fs.mkdirSync(debugDir, { recursive: true });
    const stdinIsTTY = !!process.stdin.isTTY;
    let stdinKind = 'unknown';
    try {
      const st = fs.fstatSync(0);
      stdinKind = st.isFIFO() ? 'fifo' : st.isFile() ? 'file' : st.isCharacterDevice() ? 'char' : st.isSocket() ? 'socket' : 'other';
    } catch (e) {
      stdinKind = 'fstat-err:' + (e && e.code ? e.code : 'unknown');
    }
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      event: 'user-prompt-submit',
      stdinIsTTY,
      stdinKind,
      stdinLen: stdinRaw.length,
      stdinHead: stdinRaw.slice(0, 200),
    }) + '\\n';
    fs.appendFileSync(path.join(debugDir, 'claude-hook-stdin-debug.log'), line);
  } catch {
    // Debug logging is best-effort.
  }
}

function writeGlobalStatus(eventName, statusValue, titleValue, bodyValue) {
  const sessionId = process.env.BRIDGESPACE_SESSION_ID || '';
  if (!sessionId) return; // Nothing to correlate — bail silently.

  try {
    fs.mkdirSync(GLOBAL_STATUS_DIR, { recursive: true });
  } catch {
    return;
  }

  const timestamp = Date.now();

  const payload = {
    sessionId,
    status: statusValue || (eventName === 'notification' ? 'needs-input' : 'idle'),
    title: titleValue || (eventName === 'notification' ? 'Needs input' : 'Finished working'),
    body: bodyValue || '',
    event: eventName,
    cwd: process.cwd(),
    pid: typeof process.pid === 'number' ? process.pid : null,
    timestamp,
    // Carry the user's prompt through to the renderer so it can seed
    // terminal-title generation. Truncated to 4KB to keep drop files small.
    userPrompt: userPrompt ? userPrompt.slice(0, 4000) : '',
    // Claude's own conversation id — powers \`claude --resume <id>\` in the
    // Warp-style session recovery flow. Empty when the payload omits it.
    nativeSessionId: nativeSessionId || '',
    agentType: 'claude',
  };

  // One file per event so that back-to-back events (e.g., Stop followed by
  // Notification a few ms later) don't overwrite each other before the
  // renderer's fs.watch handler has a chance to read them.
  // Filename: <sessionId>--<timestamp>-<event>.json
  const eventSlug = String(eventName).replace(/[^a-z0-9-]/gi, '').slice(0, 32) || 'event';
  const filename = sessionId + '--' + timestamp + '-' + eventSlug + '.json';
  const filePath = path.join(GLOBAL_STATUS_DIR, filename);
  const tmpPath = filePath + '.tmp';
  try {
    // Atomic write: write to a tmp path, then rename so watchers never see
    // a truncated JSON file mid-write.
    fs.writeFileSync(tmpPath, JSON.stringify(payload));
    fs.renameSync(tmpPath, filePath);
  } catch {
    // Best effort — do not let hook failures propagate to Claude.
  }
}

if (scope) {
  switch (event) {
    case 'user-prompt-submit':
      dispatchMail(scope);
      // Also write a global status file so the renderer records the userPrompt
      // for the agent-session history / resume (lastPrompt). The swarm dispatch
      // above handles mail injection but doesn't carry the prompt back to the
      // renderer. (This no longer drives terminal titles — that feature was
      // removed; panes keep their seeded agent name.)
      if (userPrompt) writeGlobalStatus('user-prompt-submit', 'running', '', '');
      break;
    case 'stop':
      dispatchStatus(scope, status || 'idle', title || 'Finished working', body || '');
      break;
    case 'notification':
      dispatchStatus(scope, status || 'needs-input', title || 'Needs input', body || '');
      break;
    default:
      break;
  }
} else {
  // Fallback path for non-swarm Claude conversations: just record the status
  // write to the per-session global file. BridgeSpace's renderer watches this
  // directory and surfaces a notification.
  switch (event) {
    case 'stop':
      writeGlobalStatus('stop', status, title, body);
      break;
    case 'notification':
      writeGlobalStatus('notification', status, title, body);
      break;
    default:
      break;
  }
}

process.exit(0);
`}function Z(){return`#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SCRIPT_DIR = __dirname;
const BS_ROOT = path.dirname(SCRIPT_DIR);
const INBOX_DIR = path.join(BS_ROOT, 'inbox');
const NUDGE_DIR = path.join(BS_ROOT, 'nudges');
const TRANSCRIPT_DIR = path.join(BS_ROOT, 'transcript');
const AGENTS_FILE = path.join(BS_ROOT, 'agents.json');

function genId() {
  return Date.now().toString() + '-' + crypto.randomBytes(4).toString('hex');
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const current = argv[i];
    if (!current.startsWith('--')) continue;
    const key = current.slice(2);
    const value = argv[i + 1];
    if (value && !value.startsWith('--')) {
      args[key] = value;
      i += 1;
    } else {
      args[key] = 'true';
    }
  }
  return args;
}

function readAgents() {
  if (!fs.existsSync(AGENTS_FILE)) return [];
  try {
    const raw = fs.readFileSync(AGENTS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value) + '\\n', 'utf8');
}

function sendCommand(argv) {
  const args = parseArgs(argv);
  const to = args.to || '';
  const body = args.body || '';
  const msgType = args.type || 'message';

  if (!to || !body) {
    console.error('Usage: bs-mail send --to <agent|@all|@operator> [--type message|status|escalation|worker_done|swarm_complete] --body "message"');
    process.exit(1);
  }

  if (!['message', 'status', 'escalation', 'worker_done', 'swarm_complete'].includes(msgType)) {
    console.error('Invalid message type: ' + msgType);
    process.exit(1);
  }

  const msgId = genId();
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const from = process.env.SWARM_AGENT_NAME || 'unknown';
  const payloadTo = to === '@all' ? '@all' : to;
  const payload = {
    id: msgId,
    from,
    to: payloadTo,
    body,
    type: msgType,
    timestamp,
  };

  const sendTo = (target) => {
    const targetInbox = path.join(INBOX_DIR, target);
    fs.mkdirSync(targetInbox, { recursive: true });
    fs.mkdirSync(NUDGE_DIR, { recursive: true });

    writeJson(path.join(targetInbox, msgId + '.json'), payload);

    fs.writeFileSync(path.join(NUDGE_DIR, target + '.txt'), 'Message from ' + from + '\\n', 'utf8');
  };

  if (to === '@all') {
    for (const agent of readAgents()) {
      if (agent && typeof agent.label === 'string' && agent.label.length > 0) {
        sendTo(agent.label);
      }
    }
  } else {
    sendTo(to);
  }

  fs.mkdirSync(TRANSCRIPT_DIR, { recursive: true });
  writeJson(path.join(TRANSCRIPT_DIR, msgId + '.json'), payload);

  console.log('Sent to ' + to);
}

function checkCommand(argv) {
  const inject = argv.includes('--inject');
  const consume = inject || argv.includes('--consume');
  const agentName = process.env.SWARM_AGENT_NAME || '';

  if (!agentName) {
    console.error('SWARM_AGENT_NAME not set');
    process.exit(1);
  }

  const agentInbox = path.join(INBOX_DIR, agentName);
  if (!fs.existsSync(agentInbox) || !fs.statSync(agentInbox).isDirectory()) {
    if (!inject && !consume) console.log('No inbox found for ' + agentName);
    process.exit(0);
  }

  const messageFiles = fs.readdirSync(agentInbox)
    .filter((fileName) => fileName.endsWith('.json'))
    .sort();

  if (inject) {
    console.log('\\n--- BridgeSwarm Inbox ---');
  }

  if (messageFiles.length === 0 && !inject) {
    if (!consume) console.log('No messages');
    process.exit(0);
  }

  for (const fileName of messageFiles) {
    const fullPath = path.join(agentInbox, fileName);
    try {
      const raw = fs.readFileSync(fullPath, 'utf8');
      const message = JSON.parse(raw);
      const from = typeof message.from === 'string' ? message.from : 'unknown';
      const body = typeof message.body === 'string' ? message.body : '';
      const type = typeof message.type === 'string' ? message.type : 'message';
      const timestamp = typeof message.timestamp === 'string' ? message.timestamp : '';

      if (inject) {
        console.log('From: ' + from + ' | Type: ' + type + ' | Time: ' + timestamp);
        console.log(body);
        console.log('');
        if (consume) {
          fs.rmSync(fullPath, { force: true });
        }
      } else {
        console.log('From: ' + from + ' | Type: ' + type);
        console.log(body);
        console.log('');
        if (consume) {
          fs.rmSync(fullPath, { force: true });
        }
      }
    } catch {
      if (consume) {
        fs.rmSync(fullPath, { force: true });
      }
    }
  }

  if (inject) {
    console.log('--- End Inbox ---');
  }
}

function agentsCommand() {
  if (!fs.existsSync(AGENTS_FILE)) {
    console.error('No agents registered');
    process.exit(1);
  }
  process.stdout.write(fs.readFileSync(AGENTS_FILE, 'utf8'));
}

const command = process.argv[2] || '';
const argv = process.argv.slice(3);

switch (command) {
  case 'send':
    sendCommand(argv);
    break;
  case 'check':
    checkCommand(argv);
    break;
  case 'agents':
    agentsCommand();
    break;
  default:
    console.error("bs-mail: unknown command '" + command + "'");
    console.error('Usage: bs-mail send|check [--inject|--consume]|agents');
    process.exit(1);
}
`}function ee(){return`#!/bin/sh
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
node "$SCRIPT_DIR/bs-mail.cjs" "$@"
`}function te(){return`@echo off
node "%~dp0bs-mail.cjs" %*
`}function se(){return`#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SCRIPT_DIR = __dirname;
const BS_ROOT = path.dirname(SCRIPT_DIR);
const PLAN_DIR = path.join(BS_ROOT, 'plan');
const EVENTS_DIR = path.join(PLAN_DIR, 'events');

const GOAL_STATUSES = new Set(['active', 'completed', 'blocked', 'cancelled']);
const TASK_STATUSES = new Set(['open', 'assigned', 'planning', 'building', 'review', 'done', 'blocked', 'cancelled']);

function genId(prefix) {
  return prefix + '-' + Date.now().toString(36) + '-' + crypto.randomBytes(4).toString('hex');
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const current = argv[i];
    if (!current.startsWith('--')) continue;
    const key = current.slice(2);
    const value = argv[i + 1];
    if (value && !value.startsWith('--')) {
      args[key] = value;
      i += 1;
    } else {
      args[key] = 'true';
    }
  }
  return args;
}

function die(message) {
  console.error(message);
  process.exit(1);
}

function bounded(value, max, label) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > max) {
    return trimmed.slice(0, max);
  }
  return trimmed;
}

function requiredString(value, max, label) {
  const out = bounded(value, max, label);
  if (!out) die('Missing required --' + label);
  return out;
}

function list(value, maxItems, maxLength) {
  if (!value) return [];
  const values = String(value)
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  const seen = new Set();
  const out = [];
  for (const entry of values) {
    if (seen.has(entry)) continue;
    seen.add(entry);
    out.push(entry.length > maxLength ? entry.slice(0, maxLength) : entry);
    if (out.length >= maxItems) break;
  }
  return out;
}

function ensureDirs() {
  fs.mkdirSync(EVENTS_DIR, { recursive: true });
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\\n', { encoding: 'utf8', flag: 'wx' });
}

function writeEvent(type, payload) {
  ensureDirs();
  const now = Date.now();
  const event = {
    id: genId('evt'),
    type,
    timestamp: now,
    actorLabel: process.env.SWARM_AGENT_NAME || 'unknown',
    ...payload,
  };
  const filePath = path.join(EVENTS_DIR, event.id + '.json');
  writeJson(filePath, event);
  return event;
}

function readEvents() {
  try {
    return fs.readdirSync(EVENTS_DIR)
      .filter((fileName) => fileName.endsWith('.json'))
      .sort()
      .map((fileName) => {
        try {
          return JSON.parse(fs.readFileSync(path.join(EVENTS_DIR, fileName), 'utf8'));
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

function applyEvent(state, event) {
  if (!event || typeof event !== 'object') return state;
  const now = Number.isFinite(event.timestamp) ? event.timestamp : Date.now();
  const actor = typeof event.actorLabel === 'string' ? event.actorLabel : 'unknown';
  if ((event.type === 'goal_created' || event.type === 'goal_updated') && event.goal && event.goal.id) {
    const existing = state.goals.find((goal) => goal.id === event.goal.id);
    const nextGoal = {
      id: event.goal.id,
      title: bounded(event.goal.title, 240) || (existing && existing.title) || 'Untitled goal',
      description: bounded(event.goal.description, 2000) || (existing && existing.description),
      status: GOAL_STATUSES.has(event.goal.status) ? event.goal.status : ((existing && existing.status) || 'active'),
      createdAt: (existing && existing.createdAt) || event.goal.createdAt || now,
      updatedAt: event.goal.updatedAt || now,
      createdBy: (existing && existing.createdBy) || event.goal.createdBy || actor,
      updatedBy: event.goal.updatedBy || actor,
    };
    state.goals = existing
      ? state.goals.map((goal) => goal.id === nextGoal.id ? nextGoal : goal)
      : [...state.goals, nextGoal];
    return state;
  }
  if ((event.type === 'task_created' || event.type === 'task_updated') && event.task && event.task.id) {
    const existing = state.tasks.find((task) => task.id === event.task.id);
    const status = TASK_STATUSES.has(event.task.status)
      ? event.task.status
      : ((existing && existing.status) || (event.task.ownerAgentLabel ? 'assigned' : 'open'));
    const nextTask = {
      id: event.task.id,
      goalId: event.task.goalId || (existing && existing.goalId) || (state.goals[0] && state.goals[0].id) || 'goal-primary',
      title: bounded(event.task.title, 240) || (existing && existing.title) || 'Untitled task',
      description: bounded(event.task.description, 2000) || (existing && existing.description),
      status,
      ownerAgentLabel: bounded(event.task.ownerAgentLabel, 160) || (existing && existing.ownerAgentLabel),
      ownedFiles: Array.isArray(event.task.ownedFiles) ? event.task.ownedFiles : ((existing && existing.ownedFiles) || []),
      acceptanceCriteria: Array.isArray(event.task.acceptanceCriteria) ? event.task.acceptanceCriteria : ((existing && existing.acceptanceCriteria) || []),
      dependsOn: Array.isArray(event.task.dependsOn) ? event.task.dependsOn : ((existing && existing.dependsOn) || []),
      notes: (existing && existing.notes) || [],
      blockedReason: bounded(event.task.blockedReason, 1000) || (status === 'blocked' && existing ? existing.blockedReason : undefined),
      createdAt: (existing && existing.createdAt) || event.task.createdAt || now,
      updatedAt: event.task.updatedAt || now,
      completedAt: status === 'done' ? ((event.task.completedAt || (existing && existing.completedAt) || now)) : event.task.completedAt,
      createdBy: (existing && existing.createdBy) || event.task.createdBy || actor,
      updatedBy: event.task.updatedBy || actor,
    };
    state.tasks = existing
      ? state.tasks.map((task) => task.id === nextTask.id ? nextTask : task)
      : [...state.tasks, nextTask];
    return state;
  }
  if (event.type === 'task_note_added' && event.taskId && event.note && event.note.text) {
    state.tasks = state.tasks.map((task) => {
      if (task.id !== event.taskId) return task;
      const note = {
        id: event.note.id || event.id,
        agentLabel: bounded(event.note.agentLabel, 160) || actor,
        text: bounded(event.note.text, 1000) || '',
        timestamp: Number.isFinite(event.note.timestamp) ? event.note.timestamp : now,
      };
      return {
        ...task,
        notes: [...task.notes, note].slice(-20),
        updatedAt: now,
        updatedBy: actor,
      };
    });
  }
  return state;
}

function readState() {
  return readEvents().reduce(applyEvent, { goals: [], tasks: [] });
}

function resolveGoalId(input, state) {
  if (!input || input === 'primary') {
    return (state.goals[0] && state.goals[0].id) || 'goal-primary';
  }
  return input;
}

function goalCommand(action, argv) {
  const args = parseArgs(argv);
  const state = readState();
  if (action === 'create') {
    const id = bounded(args.id, 200) || genId('goal');
    const title = requiredString(args.title, 240, 'title');
    const event = writeEvent('goal_created', {
      goal: {
        id,
        title,
        description: bounded(args.description, 2000),
        status: GOAL_STATUSES.has(args.status) ? args.status : 'active',
      },
    });
    console.log('Created goal ' + event.goal.id + ': ' + event.goal.title);
    return;
  }
  if (action === 'update') {
    const id = resolveGoalId(requiredString(args.id, 200, 'id'), state);
    const existing = state.goals.find((goal) => goal.id === id);
    if (!existing) die('Unknown goal id: ' + id);
    if (args.status && !GOAL_STATUSES.has(args.status)) die('Invalid goal status: ' + args.status);
    const event = writeEvent('goal_updated', {
      goal: {
        id,
        title: bounded(args.title, 240),
        description: bounded(args.description, 2000),
        status: args.status,
      },
    });
    console.log('Updated goal ' + event.goal.id);
    return;
  }
  die('Usage: bs-swarm goal create|update --title ...');
}

function taskCommand(action, argv) {
  const args = parseArgs(argv);
  const state = readState();
  if (action === 'create') {
    if (args.status && !TASK_STATUSES.has(args.status)) die('Invalid task status: ' + args.status);
    const owner = bounded(args.owner, 160);
    const status = args.status || (owner ? 'assigned' : 'open');
    const event = writeEvent('task_created', {
      task: {
        id: bounded(args.id, 200) || genId('task'),
        goalId: resolveGoalId(args.goal, state),
        title: requiredString(args.title, 240, 'title'),
        description: bounded(args.description, 2000),
        status,
        ownerAgentLabel: owner,
        ownedFiles: list(args.files, 40, 500),
        acceptanceCriteria: list(args.acceptance, 20, 500),
        dependsOn: list(args.depends, 50, 200),
      },
    });
    console.log('Created task ' + event.task.id + ': ' + event.task.title);
    return;
  }
  if (action === 'update') {
    const id = requiredString(args.id, 200, 'id');
    const existing = state.tasks.find((task) => task.id === id);
    if (!existing) die('Unknown task id: ' + id);
    if (args.status && !TASK_STATUSES.has(args.status)) die('Invalid task status: ' + args.status);
    if (args.note) {
      const event = writeEvent('task_note_added', {
        taskId: id,
        note: {
          id: genId('note'),
          agentLabel: process.env.SWARM_AGENT_NAME || 'unknown',
          text: requiredString(args.note, 1000, 'note'),
          timestamp: Date.now(),
        },
      });
      console.log('Added note to task ' + event.taskId);
    }
    const patch = {
      id,
      title: bounded(args.title, 240),
      description: bounded(args.description, 2000),
      status: args.status,
      ownerAgentLabel: bounded(args.owner, 160),
      blockedReason: bounded(args.blockedReason || args.blocked, 1000),
    };
    if (args.files) patch.ownedFiles = list(args.files, 40, 500);
    if (args.acceptance) patch.acceptanceCriteria = list(args.acceptance, 20, 500);
    if (args.depends) patch.dependsOn = list(args.depends, 50, 200);
    const meaningful = Object.keys(patch).some((key) => key !== 'id' && patch[key] !== undefined);
    if (meaningful) {
      const event = writeEvent('task_updated', { task: patch });
      console.log('Updated task ' + event.task.id);
    }
    if (!meaningful && !args.note) die('No task update provided');
    return;
  }
  if (action === 'list') {
    const tasks = state.tasks
      .filter((task) => !args.goal || task.goalId === resolveGoalId(args.goal, state))
      .filter((task) => !args.owner || task.ownerAgentLabel === args.owner);
    if (args.json === 'true') {
      console.log(JSON.stringify(tasks, null, 2));
      return;
    }
    if (tasks.length === 0) {
      console.log('No tasks');
      return;
    }
    for (const task of tasks) {
      const owner = task.ownerAgentLabel ? ' @' + task.ownerAgentLabel : '';
      console.log(task.id + ' [' + task.status + ']' + owner + ' ' + task.title);
    }
    return;
  }
  die('Usage: bs-swarm task create|update|list ...');
}

const area = process.argv[2] || '';
const action = process.argv[3] || '';
const argv = process.argv.slice(4);

if (area === 'goal') {
  goalCommand(action, argv);
} else if (area === 'task') {
  taskCommand(action, argv);
} else if (area === 'state') {
  console.log(JSON.stringify(readState(), null, 2));
} else {
  console.error('Usage: bs-swarm goal|task|state');
  process.exit(1);
}
`}function ae(){return`#!/bin/sh
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
node "$SCRIPT_DIR/bs-swarm.cjs" "$@"
`}function ne(){return`@echo off
node "%~dp0bs-swarm.cjs" %*
`}function oe(){return`#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const SCRIPT_DIR = __dirname;
const BS_ROOT = path.dirname(SCRIPT_DIR);
const STATUS_DIR = path.join(BS_ROOT, 'status');

const args = process.argv.slice(2);
const status = args[0] || 'idle';
const title = args[1] || '';
const body = args[2] || '';

// Resolve agent label from SWARM_AGENT_NAME env var (set during spawn)
const agentLabel = process.env.SWARM_AGENT_NAME || 'unknown';

// Ensure status directory exists
try {
  fs.mkdirSync(STATUS_DIR, { recursive: true });
} catch {}

const payload = {
  status: status,
  title: title,
  body: body,
  agent: agentLabel,
  timestamp: Date.now(),
};

const filePath = path.join(STATUS_DIR, agentLabel + '.json');
try {
  fs.writeFileSync(filePath, JSON.stringify(payload) + '\\n');
} catch (err) {
  // Non-critical — swarm monitor will fall back to inactivity detection
  process.stderr.write('[bs-notify] Failed to write status: ' + err.message + '\\n');
}
`}function ie(e){const{projectName:t,goal:s,agents:r,selectedSkills:i}=e,n=new Date().toISOString().slice(0,10),d=r.map(o=>`## ${o.label}

**Role:** ${o.role}
**Status:** WAITING
**Assigned Task:** —
**Owned Files:** —
**Progress:**
<!-- ${o.label} updates here -->
`).join(`
---

`),u=(i??[]).map(o=>D.find(c=>c.id===o)).filter(Boolean),l=u.length>0?`## Active Skills

The following behavioral directives apply to ALL agents in this swarm:

`+u.map(o=>`- **${o.name}:** ${o.promptFragment}`).join(`
`)+`

---

`:"";return`# Swarm Board — ${t} — ${n}

> Shared coordination hub. Read before starting. Update after completing.
> Structured UI state is authoritative: use \`bs-swarm goal\` and \`bs-swarm task\` commands for goals/tasks.

**Goal:** ${s}

---

${l}## Task Breakdown

> Coordinator: fill this table. Each task must list owned files — no overlaps between tasks.
> Status lifecycle: OPEN → ASSIGNED → PLANNING → BUILDING → REVIEW → DONE

| ID | Task | Owner | Owned Files | Depends On | Status |
|----|------|-------|-------------|------------|--------|
| — | (coordinator will assign tasks here) | — | — | — | OPEN |

---

${d}
---

## Completed Work Log

| Task | Agent | Summary | Files Changed |
|------|-------|---------|---------------|
`}function Be(e){const{rootPath:t,agentLabel:s,role:r,goal:i,swarmScopeId:n,allAgents:d,supportingKnowledgeCount:u=0,selectedSkills:l}=e,o=q,c=n?`.bridgespace${o}swarms${o}${n}${o}SWARM_BOARD.md`:`.bridgespace${o}SWARM_BOARD.md`,p=n?`.bridgespace${o}swarms${o}${n}${o}knowledge`:`.bridgespace${o}knowledge`,m=`${p}${o}KNOWLEDGE.md`,y=`${p}${o}knowledge-manifest.json`,f={coordinator:`You are the **Coordinator** — a Staff Engineer leading this coding swarm.

⚠️ CRITICAL TIMING: BridgeSpace launches you (and any Scouts) FIRST. Builders and Reviewers come up roughly 2 seconds later and start polling bs-mail within 60 seconds of their own launch. Use that head start: have the Task Breakdown table filled and initial bs-mail assignments sent BEFORE Builders begin checking — that's your #1 priority.
If you need Scout input, assign preliminary tasks to Builders FIRST, then refine after Scout reports.

FIRST ACTIONS (do these immediately, in order):
1. Read ${c} and any Supporting Knowledge files
2. If a Scout exists: send it a bs-mail with specific codebase areas to explore
3. Decompose the goal into parallel-safe tasks:
   - Each task owns SPECIFIC files — list them explicitly
   - No two tasks share file ownership (if unavoidable, sequence them with DEPENDS_ON)
   - Each task has concrete acceptance criteria (what "done" means)
   - Size tasks for ~5-15 min of focused agent work
4. Create every task with \`bs-swarm task create --goal primary --title "..." --owner "Builder" --files "path/a,path/b" --acceptance "done means ..."\`
5. Mirror the high-level breakdown in the board table for readability
6. Send each Builder a bs-mail with: task summary, owned files, acceptance criteria, dependencies

DECOMPOSITION METHOD:
- Identify layers: schema/types → backend logic → API routes → frontend UI → tests
- Within each layer, split by feature or file group
- Cross-cutting concerns (shared types, configs): assign to ONE "foundation" task that runs first

ONGOING:
- After sending initial assignments, check messages when BridgeSpace notifies you or before assigning follow-up work; do not send status about an empty inbox
- When a Builder sends worker_done → verify acceptance criteria, run \`bs-swarm task update --id <task-id> --status review\`, assign next task if any
- When a Reviewer sends approval → run \`bs-swarm task update --id <task-id> --status done\` and update the board
- When all tasks complete → final integration check, update Completed Work Log, then declare completion with BOTH commands:
  \`bs-mail send --to @all --type swarm_complete --body "summary, changed files, validation, open risks"\`
  \`bs-mail send --to @operator --type swarm_complete --body "summary, changed files, validation, open risks"\`
  After sending swarm_complete, stop polling and exit/stop. Do not start new work.
- If an agent is stuck (sends escalation) → unblock, reassign, or break the task down further
- If a Builder escalates "no assignment" → immediately send them their task via bs-mail and update the board
- IMPORTANT: When the Operator messages you, ALWAYS respond via bs-mail:
  \`bs-mail send --to @operator --body "your response here"\`
  Do NOT just respond in the terminal — the Operator can only see bs-mail messages in the Swarm chat panel.
- Until all work is complete, check \`bs-mail check --consume\` only when notified, before assigning follow-up, or before declaring completion. Never message anyone just to say there are no messages. After declaring swarm_complete, stop polling and exit/stop.`,builder:`You are a **Builder** — a Senior Software Engineer in this coding swarm.

WORKFLOW:
1. Read ${c} and run \`bs-swarm task list --owner "${s}"\` to find your assignment
2. Run \`bs-mail check --consume\` for your assignment from the Coordinator
3. **IF no task is assigned yet:** The Coordinator needs time to decompose the goal.
   - Wait ~30 seconds (use \`sleep 30\`), then re-read the board AND run \`bs-mail check --consume\` again
   - Repeat this wait-and-check cycle up to 3 times (~90 seconds total)
   - Only send an escalation to the Coordinator AFTER all 3 retries still show no assignment
   - Do NOT escalate immediately — the Coordinator is actively working on task decomposition
4. EXPLORE: read existing code in your assigned files — understand patterns, conventions, imports
5. Update structured state: \`bs-swarm task update --id <task-id> --status planning --note "approach summary"\`
6. IMPLEMENT: write production-quality code matching existing project style
7. VALIDATE: run available test/lint/build commands to catch errors
8. Update structured state: \`bs-swarm task update --id <task-id> --status done --note "validation + files changed"\`, update board log, send worker_done to Coordinator

RULES:
- Only modify files listed in your Owned Files. Need other files? → escalation to Coordinator
- Match existing code style: naming, imports, error handling, formatting
- No silent failures — handle errors explicitly
- If you find a bug outside your scope → report to Coordinator, do not fix it
- When blocked → send --type escalation to Coordinator with the specific blocker, continue on non-blocked work
- After sending an escalation, wait for a response; when BridgeSpace notifies you, run \`bs-mail check --consume\` and continue
- When the Operator messages you, respond via: \`bs-mail send --to @operator --body "your response"\`
- After completing your task, send worker_done, then stop active work. Only run \`bs-mail check --consume\` again when BridgeSpace notifies you or the Coordinator assigns follow-up. Never report an empty inbox. Once swarm_complete arrives, stop polling and exit/stop.`,scout:`You are a **Scout** — a codebase intelligence specialist in this coding swarm.

WORKFLOW:
1. Read ${c} and run \`bs-swarm state\` for the swarm goal/tasks
2. Check bs-mail for exploration targets from the Coordinator
3. Systematically explore and produce a structured report in your board section

EXPLORATION TARGETS:
- Project structure: directories, entry points, config files
- Tech stack: frameworks, package versions, build tools
- Relevant files: paths + what each does, grouped by relevance to the goal
- Patterns: naming conventions, error handling, component structure, import style
- Testing: framework, file locations, how to run tests
- Risks: files likely to be modified by multiple agents, shared dependencies, gotchas

OUTPUT FORMAT (update your board section):
### Codebase Report
**Stack:** [frameworks, key packages]
**Relevant Files:**
- \`path/file.ts\` — [description]
**Patterns:** [naming, structure, error handling]
**Tests:** [how to run, where tests live]
**Risks:** [conflicts, gotchas]

After posting → send bs-mail summary to Coordinator. Then stay available for BridgeSpace notifications; do not poll or report empty inboxes on a timer.
- When the Operator messages you, respond via: \`bs-mail send --to @operator --body "your response"\`
- Stay available after your initial report because Builders may need codebase guidance. Once swarm_complete arrives, stop polling and exit/stop.`,reviewer:`You are a **Reviewer** — a Principal Engineer providing code review in this coding swarm.

WORKFLOW:
1. Read ${c} and run \`bs-swarm task list\` — note which tasks exist and their status
2. Wait for Builders to mark tasks DONE (or Coordinator to request review)
   - If no tasks are assigned yet, re-read the board when BridgeSpace notifies you or before a review pass
   - Builders need time to complete work — do not send status about an empty inbox
3. For each completed task: review the changed files listed in the board

REVIEW CHECKLIST:
- [ ] Correctness: does the code fulfill the task's acceptance criteria?
- [ ] Consistency: does it follow existing project patterns and style?
- [ ] Error handling: are edge cases and failures handled?
- [ ] File scope: did the builder stay within their assigned files?
- [ ] Types & imports: correct types, clean imports, no unused code?
- [ ] Security: no hardcoded secrets, no unsafe input handling?
- [ ] No regressions: are existing features preserved?

OUTPUT (update your board section per task):
### Review: [Task ID]
**Verdict:** APPROVED | CHANGES_REQUESTED
**Issues:** (if any)
- [high|med|low] \`file:line\` — description
**Summary:** one-line assessment

CHANGES_REQUESTED → send bs-mail to Builder with specific fixes needed.
APPROVED → run \`bs-swarm task update --id <task-id> --status done --note "approved: summary"\` and send bs-mail to Coordinator.

ONGOING:
- After reviewing, wait for BridgeSpace notifications or coordinator review requests before running \`bs-mail check --consume\` again. Never report an empty inbox.
- When the Operator messages you, respond via: \`bs-mail send --to @operator --body "your response"\`
- Stay available after completing reviews because more tasks may need review. Once swarm_complete arrives, stop polling and exit/stop.`},R=f[r]??f.builder,k=(d??[]).filter(w=>w.label!==s),v=k.length>0?k.map(w=>`  - "${w.label}" (${w.role})`).join(`
`):"  (no other agents)",I=u>0?`## Supporting Knowledge

${u} supporting knowledge file${u===1?"":"s"} have been staged for this swarm in ${p}.
Start by reading ${m} for the file list and staged paths.
Structured metadata is also available at ${y}.
Use these materials as shared reference context before planning or implementation.

`:"",b=(l??[]).map(w=>D.find(T=>T.id===w)).filter(Boolean),A=b.length>0?`## Active Swarm Skills

The following behavioral directives are REQUIRED for all work in this swarm:

`+b.map(w=>`- **${w.name}:** ${w.promptFragment}`).join(`
`)+`

`:"";return`[BRIDGESWARM AGENT: ${s}]
Working directory: ${t}
Coordination board: ${t}/${c}

${R}

**Swarm Goal:** ${i}

${I}${A}## Inter-Agent Messaging (bs-mail)

You can send messages to other agents and they will receive them automatically.
Other agents in this swarm:
${v}

**Send to a specific agent:** bs-mail send --to "<AgentLabel>" --body "<message>"
**Send to all agents:** bs-mail send --to @all --body "<message>"
**Send to the operator:** bs-mail send --to ${N} --body "<message>"

## Structured Goals and Tasks (bs-swarm)

BridgeSpace shows goals/tasks from structured \`bs-swarm\` events in the Swarm UI.
- List state: \`bs-swarm state\` or \`bs-swarm task list\`
- Create a task: \`bs-swarm task create --goal primary --title "..." --owner "AgentLabel" --files "path/a,path/b" --acceptance "done means ..."\`
- Update task status: \`bs-swarm task update --id <task-id> --status planning|building|review|done|blocked --note "..."\`
- Update goal status: \`bs-swarm goal update --id primary --status active|completed|blocked|cancelled\`

Message types (use --type flag):
  - message (default): general inter-agent communication
  - status: concise progress update
  - escalation: request human help from the operator
  - worker_done: notify that your task is complete
  - swarm_complete: coordinator-only final signal that all work is complete

SWARM RULES (all agents):
1. Read SWARM_BOARD.md BEFORE doing anything else
2. Update structured task status with \`bs-swarm task update\` when status changes: assigned → planning → building → review/done
3. Only modify files assigned to you in the Task Breakdown. Violating file ownership causes conflicts.
4. No social chatter, greetings, or off-topic messages. Every bs-mail must advance the goal.
5. When your task is complete: update board, write to Completed Work Log, send --type worker_done to Coordinator
6. When blocked: send --type escalation to Coordinator with the specific blocker
7. Do NOT create branches or force-push. Work on the current branch.
8. Prioritize DOING WORK over sending messages.
9. ALL replies to the Operator MUST use: \`bs-mail send --to @operator --body "..."\` — terminal output alone is invisible to the Operator.
10. After completing a task, stop active work after sending the required update. Only check \`bs-mail check --consume\` again when BridgeSpace notifies you or a coordinator assigns follow-up. Never send messages about an empty inbox. Once swarm_complete arrives, stop polling and exit/stop.

---

`}function a(...e){return V(...e)}async function g(e){try{await window.tauriAPI.fs.createDirectory(e)}catch{}}async function re(e,t){await window.tauriAPI.fs.writeFile(e,`${JSON.stringify(t,null,2)}
`)}function _(e){return a(e,".bridgespace","claude-hooks","scopes")}async function C(){const e=await window.tauriAPI.system.getHomeDir();return a(e,".bridgespace","bin","bs-claude-hook.cjs")}function j(e,t){return a(_(e),`${t}.json`)}function ce(){const e=z?"win32":"darwin";return typeof window>"u"?e:window.tauriAPI?.system?.platform??e}function O(e,t){return`node ${X(e,ce())} ${t}`}function le(e){if(typeof e!="object"||e===null)return"";const t=e.command;return typeof t=="string"?t:""}function de(e){const t=e.replace(/\\/g,"/");return t.includes(".bridgespace/")?t.includes("/bin/bs-claude-hook.cjs")||t.includes("/bin/bs-mail.cjs")||t.includes("/bin/bs-notify.cjs"):!1}function E(e){const t=[];for(const s of e){if(typeof s!="object"||s===null){t.push(s);continue}const r=s.hooks;if(!Array.isArray(r)){t.push(s);continue}const i=r.filter(n=>!de(le(n)));i.length===r.length?t.push(s):i.length>0&&t.push({...s,hooks:i})}return t}async function ue(e){const{rootPath:t,scopeId:s}=e;try{await window.tauriAPI?.fs?.addAllowedRoot?.(t)}catch{}const r=_(t),i=s||"root",n=s?`swarms/${s}/bin`:"bin";try{await g(r),await re(j(t,i),{scopeId:s||null,binDir:n,registeredAt:new Date().toISOString()})}catch(d){console.warn("[claude-hooks] Failed to write scope marker (best-effort):",t,d)}}async function pe(e){const{rootPath:t,scopeId:s}=e;try{await window.tauriAPI.fs.delete(j(t,s||"root"))}catch{}}async function ge(e){const t=_(e);try{return(await window.tauriAPI.fs.readDirectory(t)).some(r=>r.name.endsWith(".json"))}catch{return!1}}async function F(e){const{rootPath:t}=e,s=a(t,".claude"),r=a(s,"settings.local.json"),i=(await C()).replace(/\\/g,"/"),n=O(i,"user-prompt-submit"),d=O(i,'stop idle "Finished working"'),u=O(i,'notification needs-input "Needs input"');await g(s);let l={};try{const p=await window.tauriAPI.fs.readFile(r);let m;try{m=JSON.parse(p)}catch{console.warn("[claude-hooks] Refusing to overwrite invalid Claude settings at",r);return}if(typeof m!="object"||m===null||Array.isArray(m)){console.warn("[claude-hooks] Refusing to overwrite non-object Claude settings at",r);return}l=m}catch{}const o=typeof l.hooks=="object"&&!Array.isArray(l.hooks)&&l.hooks!==null?{...l.hooks}:{},c=(p,m)=>{const y=Array.isArray(o[p])?[...o[p]]:[],f=E(y);f.push({matcher:"",hooks:[{type:"command",command:m}]}),o[p]=f};c("UserPromptSubmit",n),c("Stop",d),c("Notification",u),l.hooks=o,await window.tauriAPI.fs.writeFile(r,`${JSON.stringify(l,null,2)}
`)}async function $e(){const e=await window.tauriAPI.system.getHomeDir(),t=[a(e,".claude","settings.json"),a(e,".claude","settings.local.json")];for(const s of t){let r;try{r=await window.tauriAPI.fs.readFile(s)}catch{continue}let i;try{i=JSON.parse(r)}catch{console.warn("[claude-hooks] Skipping cleanup of unreadable user settings:",s);continue}if(typeof i!="object"||i===null||Array.isArray(i))continue;const n=i,d=n.hooks;if(typeof d!="object"||d===null||Array.isArray(d))continue;const u=d;let l=!1;for(const o of Object.keys(u)){const c=u[o];if(!Array.isArray(c))continue;const p=E(c);if(p.length!==c.length)u[o]=p,l=!0;else{for(let m=0;m<c.length;m++)if(c[m]!==p[m]){l=!0;break}l&&(u[o]=p)}}if(l)try{await window.tauriAPI.fs.writeFile(s,`${JSON.stringify(n,null,2)}
`),console.info("[claude-hooks] Cleaned stale BridgeSpace hook entries from",s)}catch(o){console.warn("[claude-hooks] Failed to write cleaned user settings:",s,o)}}}async function me(e){if(await ge(e))return;const t=a(e,".claude"),s=a(t,"settings.local.json");try{const r=await window.tauriAPI.fs.readFile(s),i=JSON.parse(r);if(typeof i.hooks=="object"&&!Array.isArray(i.hooks)&&i.hooks!==null){const n=i.hooks;for(const d of["SessionStart","UserPromptSubmit","Stop","Notification"])Array.isArray(n[d])&&(n[d]=E(n[d]));await window.tauriAPI.fs.writeFile(s,`${JSON.stringify(i,null,2)}
`)}}catch{}}function fe(e){if(!Number.isFinite(e)||e===void 0||e<0)return"Unknown size";if(e<1024)return`${e} B`;const t=["KB","MB","GB","TB"];let s=e/1024,r=0;for(;s>=1024&&r<t.length-1;)s/=1024,r+=1;return`${s>=10?s.toFixed(0):s.toFixed(1)} ${t[r]}`}function he(e){const{projectName:t,entries:s}=e,r=new Date().toISOString().slice(0,10),i=s.map(n=>[`## ${n.stagedFileName}`,"",`- Staged path: \`${n.stagedRelativePath}\``,`- Original path: \`${n.sourcePath}\``,`- Size: ${fe(n.size)}`,n.modified?`- Last modified: ${n.modified}`:null,""].filter(Boolean).join(`
`)).join(`
`);return`# Supporting Knowledge — ${t} — ${r}

These files were attached to this swarm before launch. Use them as shared reference context alongside the swarm mission.

## How to Use This Folder

- Read this file first to see what materials are available.
- Open the staged files directly from the \`knowledge/\` folder when you need the raw source.
- Check \`knowledge-manifest.json\` for structured metadata.

${i}`.trimEnd()+`
`}function we(e){const t=Date.now();return`${JSON.stringify({id:"seed-primary-goal",type:"goal_created",timestamp:t,actorLabel:"BridgeSpace",goal:{id:"goal-primary",title:e,status:"active",createdAt:t,updatedAt:t,createdBy:"BridgeSpace",updatedBy:"BridgeSpace"}},null,2)}
`}async function ye(e){const{swarmDir:t,rootPath:s,projectName:r,supportingKnowledge:i}=e,n=a(t,"knowledge");if(await window.tauriAPI.fs.exists(n))try{await window.tauriAPI.fs.delete(n)}catch(l){console.warn("[swarm] Failed to clear previous knowledge directory:",l)}if(!i||i.length===0)return[];await g(n);const d=(await Promise.all(i.map(async l=>{try{const o=l.fileName||x(l.sourcePath),c=await Y(n,o);await window.tauriAPI.fs.copy(l.sourcePath,c);const p=await window.tauriAPI.fs.basename(c);return{...l,stagedFileName:p,stagedPath:c,stagedRelativePath:`knowledge/${p}`,addedAt:new Date().toISOString()}}catch(o){return console.warn("[swarm] Failed to stage supporting knowledge file:",l.sourcePath,o),null}}))).filter(l=>l!==null);if(d.length===0)return[];const u=r||x(s)||"project";return await Promise.all([window.tauriAPI.fs.writeFile(a(n,"knowledge-manifest.json"),JSON.stringify(d,null,2)),window.tauriAPI.fs.writeFile(a(n,"KNOWLEDGE.md"),he({projectName:u,entries:d}))]),d}async function Le(e){const{rootPath:t,agents:s,swarmGoal:r,projectName:i,swarmScopeId:n,supportingKnowledge:d,selectedSkills:u,preserveExisting:l=!1}=e,o=a(t,".bridgespace"),c=n?a(o,"swarms",n):o,p=a(c,"inbox"),m=a(c,"nudges"),y=a(c,"transcript"),f=a(c,"bin"),R=a(o,"bin"),k=a(c,"plan"),v=a(k,"events"),I=a(o,".gitignore");window.tauriAPI.fs.readFile(I).catch(()=>{window.tauriAPI.fs.writeFile(I,`*
`).catch(()=>{})});const b=[g(o),g(R)];n&&b.push(g(a(o,"swarms"))),await Promise.all(b),n&&await g(c);const A=a(c,"status"),w=async()=>{l||await Promise.all([p,m,A,y,k].map(async h=>{try{await window.tauriAPI.fs.exists(h)&&await window.tauriAPI.fs.delete(h)}catch(K){console.warn("[swarm] Failed to purge previous directory:",h,K)}})),await Promise.all([g(p),g(m),g(f),g(A),g(y),g(v)]),await Promise.all([...s.map(h=>g(a(p,h.label))),g(a(p,N))])},T=JSON.stringify(s.map(h=>({label:h.label,role:h.role})),null,2),B=Z(),$=ee(),L=te(),G=se(),W=ae(),M=ne(),U=oe(),P=r?ie({projectName:i||x(t)||"project",goal:r,agents:s,selectedSkills:u}):null;await w(),await ue({rootPath:t,scopeId:n});const S=[window.tauriAPI.fs.writeFile(a(c,"agents.json"),T),window.tauriAPI.fs.writeFile(a(f,"bs-mail.cjs"),B),window.tauriAPI.fs.writeFile(a(f,"bs-mail"),$),window.tauriAPI.fs.writeFile(a(f,"bs-mail.cmd"),L),window.tauriAPI.fs.writeFile(a(f,"bs-swarm.cjs"),G),window.tauriAPI.fs.writeFile(a(f,"bs-swarm"),W),window.tauriAPI.fs.writeFile(a(f,"bs-swarm.cmd"),M),window.tauriAPI.fs.writeFile(a(f,"bs-notify.cjs"),U)];if(r&&!l&&S.push(window.tauriAPI.fs.writeFile(a(v,"0000000000000-seed-primary-goal.json"),we(r))),l||S.push(ye({swarmDir:c,rootPath:t,projectName:i,supportingKnowledge:d})),P&&!l)S.push(window.tauriAPI.fs.writeFile(a(c,"SWARM_BOARD.md"),P));else if(P&&l){const h=a(c,"SWARM_BOARD.md");S.push(window.tauriAPI.fs.readFile(h).catch(()=>window.tauriAPI.fs.writeFile(h,P)))}await Promise.all(S);const J=a(f,"bs-mail"),H=a(f,"bs-swarm");try{await Promise.all([window.tauriAPI.fs.setExecutable?.(J),window.tauriAPI.fs.setExecutable?.(H)])}catch(h){console.warn("[swarm] chmod swarm helpers failed:",h)}try{await F({rootPath:t})}catch(h){console.warn("[swarm] Failed to merge Claude hook:",h)}}async function Ge(e){const{rootPath:t,agents:s,swarmScopeId:r}=e,i=a(t,".bridgespace"),n=r?a(i,"swarms",r):i,d=a(n,"inbox");await Promise.all([g(i),r?g(a(i,"swarms")):Promise.resolve(),g(n),g(d)]),await Promise.all([...s.map(u=>g(a(d,u.label))),g(a(d,N))]),await window.tauriAPI.fs.writeFile(a(n,"agents.json"),JSON.stringify(s.map(u=>({label:u.label,role:u.role})),null,2))}async function We(e,t){await pe({rootPath:e,scopeId:t});try{await me(e)}catch(s){console.warn("[swarm] Mailbox teardown failed:",s)}}async function Me(e){if(e){try{await ke()}catch(t){console.warn("[claude-hooks] Failed to write HOME hook script:",t);return}try{await F({rootPath:e})}catch(t){console.warn("[claude-hooks] Failed to merge .claude/settings.local.json:",t)}}}async function ke(){const e=await C(),t=e.lastIndexOf("/");return t>0&&await g(e.slice(0,t)),await window.tauriAPI.fs.writeFile(e,Q()),e}export{Be as buildSwarmBoardPromptPrefix,$e as cleanupUserScopeClaudeHooks,Me as ensureClaudeHooksInstalled,ke as ensureGlobalClaudeHookScriptInstalled,ie as generateSwarmBoard,Le as initSwarmMailbox,Ge as syncSwarmMailboxAgents,We as teardownSwarmMailbox};
