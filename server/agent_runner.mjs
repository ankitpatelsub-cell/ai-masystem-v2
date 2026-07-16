// agent_runner.mjs — run an agent via @anthropic-ai/claude-agent-sdk,
// connected to our MCP DB server (free local Claude CLI, no paid API).
import { query } from '@anthropic-ai/claude-agent-sdk';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MCP_SERVER = path.join(__dirname, 'mcp-server.mjs');

// MCP config pointing at our stdio server.
// SDK option mcpServers expects { name: {type,command,args,env} } (it wraps it).
const mcpServers = {
  'ai-masystem-db': {
    type: 'stdio',
    command: process.execPath, // node
    args: [MCP_SERVER],
    env: { DB_PATH: process.env.DB_PATH || '/root/ai-masystem-v2/masystem.db', HOME: process.env.HOME || '/root' },
  },
};

/**
 * Run an agentic task. Returns the final text result.
 * @param {string} systemPrompt - agent persona/instructions
 * @param {string} prompt - the user task
 * @param {object} opts - { allowedTools, maxTurns }
 */
export async function runAgent(systemPrompt, prompt, opts = {}) {
  const out = query({
    prompt,
    options: {
      cwd: __dirname,
      systemPrompt: systemPrompt ? { type: 'preset', preset: 'claude_code' } : undefined,
      mcpServers,
      allowedTools: opts.allowedTools || ['mcp__ai-masystem-db__query_leads', 'mcp__ai-masystem-db__recent_activity', 'mcp__ai-masystem-db__hospital_queue', 'mcp__ai-masystem-db__hotel_bookings', 'mcp__ai-masystem-db__query_cars', 'mcp__ai-masystem-db__add_lead', 'mcp__ai-masystem-db__set_lead_status'],
      maxTurns: opts.maxTurns || 20,
      // NOTE: bypassPermissions is blocked under root; use default + allowedTools.
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

// CLI quick-test: node agent_runner.mjs "summarize tickets"
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/^.*\//, ''))) {
  const task = process.argv[2] || 'summarize the latest leads in 3 bullets';
  const res = await runAgent(
    'You are the MASystem back-office agent. Use the MCP DB tools to answer.',
    task,
  );
  console.log('AGENT:', res);
  process.exit(0);
}
