#!/usr/bin/env python3
# manager_run.py — Manager agent executes end-to-end: pick hottest unscored/contacted lead,
# draft a personalized first-touch via Claude, save as Gmail Draft, log to activity, mark status.
# This is the "real execution" loop (not just classification).
import sqlite3, os, subprocess, json, datetime
import claude

DB = os.environ.get("DB_PATH", "/root/ai-masystem-v2/masystem.db")
HIMALAYA = "/root/.local/bin/himalaya"

def main():
    con = sqlite3.connect(DB)
    # pick the hottest actionable lead lacking a draft/send
    lead = con.execute(
        "SELECT id,name,email,interest,company,message,score FROM leads "
        "WHERE status='new' AND email<>'' AND score IS NOT NULL AND score<>'' "
        "ORDER BY CAST(score AS INTEGER) DESC LIMIT 1").fetchone()
    if not lead:
        print("Manager: no actionable 'new' lead to execute right now.")
        con.close(); return
    id_, name, email, interest, company, message, score = lead
    prompt = (
        f"You are the MASystem Manager agent (MA System). Execute outreach for this lead end-to-end. "
        f"Lead: {name}, segment {interest}, website {company or 'none'}, location {(message or '')[:60]}, email {email}, score {score}. "
        "Draft a warm, business-SPECIFIC first-touch email (no subject/headers, under 130 words) offering a 5-min demo. Return ONLY the email body."
    )
    body = claude.ask(prompt, system="You are the MASystem Manager. Act decisively but politely.")
    if not body:
        print("Manager: draft generation skipped (CLI limit)."); con.close(); return
    date = datetime.datetime.utcnow().strftime("%a, %d %b %Y %H:%M:%S +0000")
    raw = f"To: {email}\r\nFrom: admin.ai.masystem@gmail.com\r\nSubject: AI agent demo for {name} — 5 min?\r\nDate: {date}\r\n\r\n{body}\r\n"
    r = subprocess.run([HIMALAYA, "message", "save", "--folder", "[Gmail]/Drafts"], input=raw, capture_output=True, text=True)
    con.execute("UPDATE leads SET status='contacted', last_contact_at=strftime('%s','now') WHERE id=?", (id_,))
    # log to activity table
    try:
        con.execute("INSERT INTO activity (agent,icon,title,detail,ts) VALUES (?,?,?,?,strftime('%s','now'))",
                    ('manager','🤖','Manager executed outreach', f"Drafted first-touch for {name} (score {score}) → Gmail Drafts", ))
    except Exception:
        pass
    con.commit(); con.close()
    print(f"🤖 Manager executed: drafted first-touch for {name} (score {score}) → Gmail Drafts.")

if __name__ == "__main__":
    main()
