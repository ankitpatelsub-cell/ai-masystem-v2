# Architecture: agent pattern decision (HYBRID)

This system uses **two agent patterns** deliberately. Do NOT "migrate everything
to SDK+MCP" — the transactional routes are correct as direct-DB.

## Pattern A — Transactional (direct DB, fast, deterministic)
Used for: car, hospital, hotel intake/state, manager routing, inventory.
- Each route calls `db.prepare(...)` directly.
- Latency ~5ms, output is a fixed JSON shape the React UI depends on
  (e.g. `{id, steps}`, `{target}`).
- Multi-language rule parsing (HI/JA hospital intake) lives here.
- NEVER an LLM in the request path → no latency, no variance, works offline.

Routes: `routes/car.js`, `routes/hospital.js`, `routes/hotel.js`,
        `routes/manager.js` (classify = keyword router, instant).

## Pattern B — Cognitive (claude-agent-sdk + MCP tools, free local CLI)
Used for: backoffice (summarize leads, draft replies, analyze).
- `server/agent_runner.mjs` spawns the local `claude` CLI connected to
  `server/mcp-server.mjs` (which exposes the shared DB as MCP tools).
- The agent REASONs and may CALL tools (query_leads, add_lead, ...).
- Latency 10–60s; output is natural language.
- Cost: $0 (drives the already-authenticated free CLI).

Only appropriate for open-ended reasoning, NOT for structured DB writes the UI
must render deterministically.

## Rule of thumb
- Need a predictable JSON object fast? → Pattern A (direct DB).
- Need judgment / summarization / drafting? → Pattern B (SDK agent).

## Verified
- `npm test` → 18/18 (covers both patterns + RBAC + MCP read/write).
- MCP tools list: query_leads, add_lead, set_lead_status, query_cars,
  add_car, hospital_queue, hotel_bookings, recent_activity.
