#!/usr/bin/env python3
# enrich_emails.py — fill missing emails for maps leads so they become sendable.
# Strategy:
#   - website present (company field) -> derive info@<domain>  (high confidence)
#   - no website -> ask the local Claude CLI to guess a domain from name+city+segment
#                   -> form info@<domain>  (INFERRED, lower confidence)
# Writes email + email_source ('site' | 'inferred' | '') to each lead.
# Run:  python3 enrich_emails.py [--dry]
import subprocess, json, os, sys, re, sqlite3

DB = os.environ.get("DB_PATH", "/root/ai-masystem-v2/masystem.db")
NODE = "/root/.hermes/node/bin/node"
AGENT = "/root/ai-masystem-v2/server/agent_runner.mjs"

def run(cmd, input=None):
    return subprocess.run(cmd, capture_output=True, text=True, timeout=120, input=input)

def domain_from_url(u):
    m = re.search(r"https?://(?:www\.)?([^/\s]+)", u or "")
    return m.group(1).lower() if m else ""

def guess_domain(name, city, segment):
    prompt = (
        f"A business named '{name}' is a {segment} in {city}, India. "
        "Guess the most likely website domain (just the domain, e.g. 'cityhospital.com'), "
        "based on Indian SME naming. Reply with ONLY the domain, no explanation."
    )
    r = run([NODE, AGENT, prompt])
    out = r.stdout.strip()
    # take the first token that looks like a domain
    m = re.search(r"[a-z0-9\-]+\.[a-z]{2,}", out.lower())
    return m.group(0) if m else ""

def main():
    dry = "--dry" in sys.argv
    con = sqlite3.connect(DB)
    try:
        con.execute("ALTER TABLE leads ADD COLUMN email_source TEXT DEFAULT ''")
    except sqlite3.OperationalError:
        pass  # column already exists
    rows = con.execute("SELECT id,name,company,email,interest,message FROM leads WHERE source='maps' AND (email IS NULL OR email='')").fetchall()
    print(f"Maps leads needing email: {len(rows)}")
    done = 0
    for r in rows:
        id_, name, company, email, interest, msg = r
        dom = domain_from_url(company) if company else ""
        source = "site"
        if not dom:
            dom = guess_domain(name, (msg or "Ahmedabad"), interest)
            source = "inferred"
        if not dom:
            continue
        new_email = f"info@{dom}"
        if dry:
            print(f"  [dry] id={id_} {name} -> {new_email} ({source})")
        else:
            con.execute("UPDATE leads SET email=?, email_source=? WHERE id=?", (new_email, source, id_))
            done += 1
            print(f"  id={id_} {name} -> {new_email} ({source})")
    if not dry:
        con.commit()
    con.close()
    print(f"{'Would set' if dry else 'Set'} {done} emails.")

if __name__ == "__main__":
    main()
