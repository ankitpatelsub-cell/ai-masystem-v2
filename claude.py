#!/usr/bin/env python3
"""claude.py — shared wrapper so Python scripts can call the free local Claude CLI
via the node agent_runner.mjs (same brain as the JS agents)."""
import subprocess, os, json

NODE = "/root/.hermes/node/bin/node"
RUNNER = "/root/ai-masystem-v2/server/agent_runner.mjs"

def ask(prompt, system=None, max_turns=15, timeout=120):
    """Run a one-shot Claude task. Returns trimmed text."""
    cmd = [NODE, RUNNER, "--system", system or "", prompt]
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout,
                           env={**os.environ, "DB_PATH": os.environ.get("DB_PATH", "/root/ai-masystem-v2/masystem.db"), "HOME": os.environ.get("HOME","/root")})
        out = r.stdout
        # runner prints "AGENT: <text>" in CLI mode; strip that prefix if present
        if out.startswith("AGENT:"):
            out = out[len("AGENT:"):]
        return out.strip()
    except subprocess.TimeoutExpired:
        return ""
    except Exception as e:
        return f"ERROR: {e}"

def ask_json(prompt, system=None, max_turns=15, timeout=120):
    """Ask Claude and parse a JSON object from the response."""
    txt = ask(prompt, system, max_turns, timeout)
    # extract first {...} block
    import re
    m = re.search(r"\{.*\}", txt, re.DOTALL)
    if not m:
        return {}
    try:
        return json.loads(m.group(0))
    except Exception:
        return {}

if __name__ == "__main__":
    import sys
    print(ask(sys.argv[1] if len(sys.argv) > 1 else "say hi in 3 words", "You are a helpful assistant."))
