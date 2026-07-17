#!/usr/bin/env python3
# reengage.py — Claude drafts a fresh follow-up for leads stuck in new/contacted >7 days.
# Saves each follow-up as a Gmail Draft (so you review before sending).
import sqlite3, os, subprocess, json, datetime
import claude

DB = os.environ.get("DB_PATH", "/root/ai-masystem-v2/masystem.db")
HIMALAYA = "/root/.local/bin/himalaya"

def find_draft(subj):
    out = subprocess.run([HIMALAYA, "envelope", "list", "--folder", "[Gmail]/Drafts"], capture_output=True, text=True).stdout
    import re
    for line in out.splitlines():
        if f"Re: {subj}" in line:
            m = re.match(r"\|\s*(\d+)\s*\|", line)
            if m: return int(m.group(1))
    return None

def main():
    con = sqlite3.connect(DB)
    rows = con.execute(
        "SELECT id,name,email,interest,status,summary,last_contact_at FROM leads "
        "WHERE status IN ('new','contacted') AND (last_contact_at IS NULL OR last_contact_at < strftime('%s','now','-7 day')) "
        "AND email<>'' LIMIT 20").fetchall()
    print(f"Re-engaging {len(rows)} stale leads...")
    done = 0
    for r in rows:
        id_, name, email, interest, status, summary, lc = r
        prompt = (
            f"Draft a friendly FOLLOW-UP email (no subject/headers) to {name}, a {interest} lead we previously contacted but haven't heard back from. "
            f"Context: {summary or 'no prior notes'}. Keep it short, warm, offer a low-pressure 5-min demo, new angle (e.g. a recent result or a free audit). Under 110 words, MASystem Admin persona."
        )
        body = claude.ask(prompt, system="You are the MASystem re-engagement agent.")
        if not body: continue
        date = datetime.datetime.utcnow().strftime("%a, %d %b %Y %H:%M:%S +0000")
        raw = f"To: {email}\r\nFrom: admin.ai.masystem@gmail.com\r\nSubject: Re: AI agent demo for {name} — 5 min?\r\nDate: {date}\r\n\r\n{body}\r\n"
        old = find_draft(f"AI agent demo for {name}")
        if old: subprocess.run([HIMALAYA, "message", "delete", "--folder", "[Gmail]/Drafts", str(old)])
        subprocess.run([HIMALAYA, "message", "save", "--folder", "[Gmail]/Drafts"], input=raw)
        con.execute("UPDATE leads SET status='reengaged' WHERE id=?", (id_,))
        done += 1
        print(f"  id={id_} {name}: re-engagement draft saved")
    con.commit(); con.close()
    print(f"Re-engaged {done} leads (drafts in Gmail).")

if __name__ == "__main__":
    main()
