#!/usr/bin/env python3
# score_leads.py — Claude scores + tags + prioritizes each lead (0-100 fit score).
# Writes leads.score, leads.tags, leads.priority. Re-score only leads lacking a score.
# Run: python3 score_leads.py [--all]
import sqlite3, os, sys, json
import claude

DB = os.environ.get("DB_PATH", "/root/ai-masystem-v2/masystem.db")

def main():
    rescored = "--all" in sys.argv
    con = sqlite3.connect(DB)
    rows = con.execute("SELECT id,name,company,email,interest,message,source FROM leads WHERE score IS NULL OR score='' OR score='0' OR ?", (1 if rescored else 0,)).fetchall()
    print(f"Scoring {len(rows)} leads...")
    done = 0
    for r in rows:
        id_, name, company, email, interest, message, source = r
        seg = interest or "business"
        city = (message or "").split(",")[0][:40] if message else ""
        prompt = (
            f"Rate this lead's fit for MA System's AI agent services (Japan<->India offshore dev: hospital reception AI, hotel concierge AI, car-rental AI, dental front-desk AI). "
            f"Business: name='{name}', segment='{seg}', city hint='{city}', has website={'yes' if company else 'no'}, source='{source}'.\n"
            "Return ONLY JSON: {\"score\":<0-100 int>,\"priority\":\"hot|warm|cold\",\"tags\":[\"<max 3 short tags like 'hospital','ahmedabad','high-volume'>]\"}"
        )
        j = claude.ask_json(prompt, system="You are a B2B lead qualification analyst. Be concise, output strict JSON.")
        if not j or "score" not in j:
            # CLI capped / no response — mark score='0' so we don't loop forever; retry later with --all
            con.execute("UPDATE leads SET score='0', priority='warm' WHERE id=?", (id_,))
            con.commit()
            print(f"  id={id_} {name}: SKIPPED (no score, CLI capped?)")
            continue
        con.execute("UPDATE leads SET score=?, priority=?, tags=? WHERE id=?",
                    (str(j.get("score")), j.get("priority","warm"), json.dumps(j.get("tags",[])), id_))
        con.commit()  # persist per-row so progress survives interruptions
        done += 1
        print(f"  id={id_} {name}: score={j.get('score')} {j.get('priority')} {j.get('tags')}")
    con.commit(); con.close()
    print(f"Scored {done} leads.")

if __name__ == "__main__":
    main()
