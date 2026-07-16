#!/usr/bin/env python3
# inbound_reply.py — REAL inbound mail auto-responder (Option A: draft + notify).
# Polls Gmail INBOX for new mail, drafts a reply via the local Claude CLI (SDK),
# saves the reply as a GMAIL DRAFT (you review/send), logs + writes a notify file.
#
# Run manually:  python3 inbound_reply.py [--once]
# Cron:          every 15 min via ~/.hermes/scripts/inbound_reply.sh
import subprocess, json, os, sys, glob, datetime, re

HIMALAYA = "/root/.local/bin/himalaya"
STATE = "/root/ai-masystem-v2/.inbound_state.json"
LOG = "/root/ai-masystem-v2/inbound_reply.log"
NOTIFY = "/root/ai-masystem-v2/inbound_notify.txt"
NODE = "/root/.hermes/node/bin/node"

def run(cmd, input=None):
    return subprocess.run(cmd, capture_output=True, text=True, timeout=120, input=input)

def list_inbox():
    out = run([HIMALAYA, "envelope", "list", "--folder", "INBOX"]).stdout
    ids = []
    for line in out.splitlines():
        m = re.match(r"\|\s*(\d+)\s*\|", line)
        if m: ids.append(int(m.group(1)))
    return ids

def read_msg(mid):
    out = run([HIMALAYA, "message", "read", "--folder", "INBOX", str(mid)]).stdout
    # crude header/body split
    from_ = subj = ""
    body_lines = []
    in_body = False
    for ln in out.splitlines():
        if ln.lower().startswith("from:"): from_ = ln[5:].strip()
        elif ln.lower().startswith("subject:"): subj = ln[8:].strip()
        elif ln.strip() == "": in_body = True
        elif in_body: body_lines.append(ln)
    return from_, subj, "\n".join(body_lines).strip()

def draft_reply(from_, subj, body):
    prompt = (
        "You are MASystem Admin, representing Nihon Offshore — a Japan⇄India offshore AI development team. "
        "A prospect has replied to our AI-agent outreach email. Write a reply that is genuinely warm, "
        "polite, and human (not salesy). Conventions:\n"
        "  - Open with a sincere thank-you for their reply.\n"
        "  - Acknowledge something specific they said.\n"
        "  - Graciously offer a short (5-minute) demo at a time that suits THEM — give them an easy out.\n"
        "  - Ask ONE gentle, open clarifying question.\n"
        "  - Keep it under 130 words, friendly but professional, sign off as 'Warm regards, MASystem Admin'.\n"
        "  - No subject line, no headers — just the reply body.\n\n"
        f"Original subject: {subj}\nFrom: {from_}\nTheir message:\n{body[:800]}"
    )
    r = run([NODE, "/root/ai-masystem-v2/server/agent_runner.mjs", prompt])
    return r.stdout.strip()

def find_draft(subj):
    """Return the envelope id of an existing 'Re: <subj>' draft, if any."""
    out = run([HIMALAYA, "envelope", "list", "--folder", "[Gmail]/Drafts"]).stdout
    wanted = f"Re: {subj}"
    for line in out.splitlines():
        if wanted in line:
            m = re.match(r"\|\s*(\d+)\s*\|", line)
            if m: return int(m.group(1))
    return None

def update_draft(to, subj, body, old_id=None):
    """Save a fresh draft; if an old one exists, delete it first (one draft per thread)."""
    if old_id is not None:
        run([HIMALAYA, "message", "delete", "--folder", "[Gmail]/Drafts", str(old_id)])
    date = datetime.datetime.utcnow().strftime("%a, %d %b %Y %H:%M:%S +0000")
    raw = f"To: {to}\r\nFrom: admin.ai.masystem@gmail.com\r\nSubject: Re: {subj}\r\nDate: {date}\r\n\r\n{body}\r\n"
    r = run([HIMALAYA, "message", "save", "--folder", "[Gmail]/Drafts"], input=raw)
    return "saved" in r.stdout.lower() or "success" in r.stdout.lower()

def main():
    once = "--once" in sys.argv
    state = {"done": []}
    if os.path.exists(STATE):
        try: state = json.load(open(STATE))
        except: pass
    ids = list_inbox()
    new = [i for i in ids if i not in state["done"]]
    log = open(LOG, "a")
    count = 0
    for mid in new:
        try:
            from_, subj, body = read_msg(mid)
            # avoid loops: skip our own outbound test sends / noreply
            if "admin.ai.masystem@gmail.com" in from_ or "noreply" in from_.lower():
                state["done"].append(mid); continue
            reply = draft_reply(from_, subj, body)
            if not reply or "session limit" in reply.lower() or "rate limit" in reply.lower():
                # don't mark done — retry next run (CLI limit may reset)
                log = open(LOG, "a"); 
                log.write(f"[{datetime.datetime.utcnow()}] id={mid} SKIP (draft empty/limited) — will retry\n"); log.close()
                continue
            to = from_.split("<")[-1].rstrip(">") if "<" in from_ else from_
            # revise the reply using the lead's CURRENT status (if we have it)
            status_note = ""
            try:
                import sqlite3
                con = sqlite3.connect(os.environ.get("DB_PATH", "/root/ai-masystem-v2/masystem.db"))
                row = con.execute("SELECT status FROM leads WHERE email=? OR name=? ORDER BY id DESC LIMIT 1", (to, from_)).fetchone()
                con.close()
                if row and row[0] and row[0] not in ("new",):
                    status_note = f"\n\n[Context: this lead is currently marked '{row[0]}' in our pipeline.]"
            except Exception:
                pass
            reply = (reply + status_note).strip()
            old_id = find_draft(subj)
            ok = update_draft(to, subj, reply, old_id)
            action = "UPDATED" if old_id else "CREATED"
            state["done"].append(mid)
            count += 1
            msg = f"[{datetime.datetime.utcnow()}] id={mid} from={from_} -> draft {action} {'OK' if ok else 'FAIL'}: {reply[:80]}"
            print(msg); open(LOG, "a").write(msg + "\n")
        except Exception as e:
            err = f"[{datetime.datetime.utcnow()}] id={mid} ERROR {e}"
            print(err); open(LOG, "a").write(err + "\n")
    log.close()
    json.dump(state, open(STATE, "w"))
    if count:
        with open(NOTIFY, "a") as f:
            f.write(f"{datetime.datetime.utcnow()} — drafted {count} inbound reply/replies (see Gmail Drafts)\n")
    print(f"Processed {count} new message(s).")

if __name__ == "__main__":
    main()
