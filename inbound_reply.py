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
        "You are MASystem Admin (Nihon Offshore). A prospect/emily replied to our AI-agent outreach. "
        "Write a SHORT, warm, professional reply (under 120 words). Thank them, offer a 5-minute demo, "
        "ask one clarifying question. No subject line, no headers — just the reply body.\n\n"
        f"Original subject: {subj}\nFrom: {from_}\nTheir message:\n{body[:800]}"
    )
    # call the SDK agent runner (free local Claude CLI)
    r = run([NODE, "/root/ai-masystem-v2/server/agent_runner.mjs", prompt])
    return r.stdout.strip()

def save_draft(to, subj, body):
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
            ok = save_draft(to, subj, reply)
            state["done"].append(mid)
            count += 1
            msg = f"[{datetime.datetime.utcnow()}] id={mid} from={from_} -> draft {'OK' if ok else 'FAIL'}: {reply[:80]}"
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
