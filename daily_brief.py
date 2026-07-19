#!/usr/bin/env python3
# daily_brief.py — Claude summarizes the day's pipeline activity into a concise brief.
# Prints to stdout (cron delivers to Telegram). Run daily.
import sqlite3, os, json
import claude

DB = os.environ.get("DB_PATH", "/root/ai-masystem-v2/masystem.db")

def main():
    con = sqlite3.connect(DB)
    today = con.execute("SELECT COUNT(*) c FROM leads WHERE created_at >= strftime('%s','now','-1 day')").fetchone()[0]
    hot = con.execute("SELECT COUNT(*) c FROM leads WHERE priority='hot' OR CAST(score AS INTEGER) >= 70").fetchone()[0]
    contacted = con.execute("SELECT COUNT(*) c FROM leads WHERE status='contacted'").fetchone()[0]
    total = con.execute("SELECT COUNT(*) c FROM leads").fetchone()[0]
    top = con.execute("SELECT name,interest,score FROM leads WHERE score IS NOT NULL AND score<>'' ORDER BY CAST(score AS INTEGER) DESC LIMIT 5").fetchall()
    top_str = "; ".join(f"{n} ({i}, score {s})" for n,i,s in top)
    con.close()
    prompt = (
        f"Write a short MORNING BRIEF for the MASystem (MA System) lead-gen team. Facts: "
        f"{total} total leads, {today} new in last 24h, {hot} hot, {contacted} contacted. "
        f"Top 5 by score: {top_str}. "
        "In 5-7 bullets: what changed, who to prioritize today, one suggested action. Use emojis. Plain text, no markdown headers."
    )
    brief = claude.ask(prompt, system="You are the MASystem ops lead writing a crisp daily brief.")
    print("📊 Daily AI Brief — " + os.environ.get("DATE", "today"))
    print(brief or "(brief generation skipped — CLI limit)")

if __name__ == "__main__":
    main()
