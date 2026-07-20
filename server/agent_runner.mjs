// agent_runner.mjs — run an agent via local Claude CLI (free) or Codex CLI.
// Provider is selected by MODEL_PROVIDER env: 'claude' (default), 'codex', or 'auto'.
import { query } from '@anthropic-ai/claude-agent-sdk';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const execFileP = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MCP_SERVER = path.join(__dirname, 'mcp-server.mjs');
const CODEX_BIN = process.env.CODEX_BIN || '/root/.hermes/node/bin/codex';

const PROVIDER = (process.env.MODEL_PROVIDER || 'claude').toLowerCase();

// MCP config pointing at our stdio server (used by the Claude path).
const mcpServers = {
  'ai-masystem-db': {
    type: 'stdio',
    command: process.execPath,
    args: [MCP_SERVER],
    env: { DB_PATH: process.env.DB_PATH || '/root/ai-masystem-v2/masystem.db', HOME: process.env.HOME || '/root' },
  },
};

/** Run a task via the Codex CLI (spawns `codex exec`, prompt via stdin file for clean EOF). */
async function runViaCodex(systemPrompt, prompt, opts = {}) {
  const full = (systemPrompt ? systemPrompt + '\n\n' : '') + prompt;
  const fs = await import('fs');
  const os = await import('os');
  const pathMod = await import('path');
  const tmp = pathMod.join(os.tmpdir(), `codex_prompt_${process.pid}_${Date.now()}.txt`);
  fs.writeFileSync(tmp, full);
  try {
    const { stdout, stderr } = await execFileP('/bin/bash', [
      '-c',
      `"${CODEX_BIN}" exec --skip-git-repo-check --dangerously-bypass-approvals-and-sandbox < "${tmp}"`,
    ], {
      cwd: __dirname,
      maxBuffer: 4 * 1024 * 1024,
      timeout: (opts.maxTurns || 20) * 15000 + 30000,
      env: { ...process.env },
    });
    const raw = (stdout || '').trim() || (stderr || '').trim();
    const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
    const ci = lines.findIndex(l => l === 'codex');
    if (ci >= 0 && lines[ci + 1]) return lines[ci + 1];
    return raw;
  } finally {
    try { fs.unlinkSync(tmp); } catch {}
  }
}

/**
 * Run an agentic task. Returns the final text result.
 * @param {string} systemPrompt - agent persona/instructions
 * @param {string} prompt - the user task
 * @param {object} opts - { allowedTools, maxTurns }
 */
export async function runAgent(systemPrompt, prompt, opts = {}) {
  if (PROVIDER === 'codex') {
    return await runViaCodex(systemPrompt, prompt, opts);
  }
  // default: local Claude CLI (free)
  const out = query({
    prompt,
    options: {
      cwd: __dirname,
      systemPrompt: systemPrompt ? { type: 'preset', preset: 'claude_code' } : undefined,
      mcpServers,
      allowedTools: opts.allowedTools || ['mcp__ai-masystem-db__query_leads', 'mcp__ai-masystem-db__recent_activity', 'mcp__ai-masystem-db__hospital_queue', 'mcp__ai-masystem-db__hotel_bookings', 'mcp__ai-masystem-db__query_cars', 'mcp__ai-masystem-db__add_lead', 'mcp__ai-masystem-db__set_lead_status'],
      maxTurns: opts.maxTurns || 20,
    },
  });

  let text = '';
  for await (const m of out) {
    if (m.type === 'assistant' && m.message?.content) {
      for (const b of m.message.content) if (b.type === 'text') text += b.text;
    }
  }
  return text.trim();
}

// CLI quick-test: node agent_runner.mjs "task" [--system "persona"]
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/^.*\//, ''))) {
  const args = process.argv.slice(2);
  let task = '';
  let system = 'You are the MASystem back-office agent. Use the MCP DB tools to answer.';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--system') { system = args[i + 1]; i++; }
    else if (!task) task = args[i];
  }
  const res = await runAgent(system, task || 'summarize the latest leads in 3 bullets');
  console.log('AGENT:', res);
  process.exit(0);
}
