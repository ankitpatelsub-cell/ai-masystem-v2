// routes/settings.js — model provider switch (shared behavior with agents).
import express from 'express';
import fs from 'fs';
import path from 'path';
const router = express.Router();
const cwd = process.cwd();

function readEnv() { try { const e = {}; for (const l of fs.readFileSync(path.join(cwd, '.env'), 'utf8').split('\n')) { const m = l.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/); if (m) e[m[1]] = m[2].replace(/^["']|["']$/g, ''); } return e; } catch { return {}; } }
function writeEnv(env) { fs.writeFileSync(path.join(cwd, '.env'), Object.entries(env).map(([k, v]) => `${k}=${v}`).join('\n') + '\n'); }

router.get('/', (_, res) => {
  const env = readEnv();
  res.json({ provider: env.MODEL_PROVIDER || 'claude', openrouter_model: env.OPENROUTER_MODEL || '', openrouter_key: env.OPENROUTER_API_KEY ? 'set' : 'missing', claude_cli: true });
});
router.post('/', (req, res) => {
  const { provider, openrouter_model } = req.body || {};
  const env = readEnv();
  if (provider) env.MODEL_PROVIDER = provider;
  if (openrouter_model !== undefined) env.OPENROUTER_MODEL = openrouter_model;
  writeEnv(env);
  process.env.MODEL_PROVIDER = env.MODEL_PROVIDER;
  if (openrouter_model) process.env.OPENROUTER_MODEL = openrouter_model;
  res.json({ ok: true, provider: env.MODEL_PROVIDER });
});
export default router;
