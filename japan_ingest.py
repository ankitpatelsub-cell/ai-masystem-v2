#!/usr/bin/env python3
"""japan_ingest.py — scrape real Japan businesses (Tokyo/Osaka/etc.) into leads, tagged japan."""
import os, sys, json, time, sqlite3, subprocess, argparse
sys.path.insert(0, os.path.dirname(__file__))
MAPS = "/root/.hermes/profiles/agent2/skills/productivity/maps/scripts/maps_client.py"
DB = os.environ.get("DB_PATH", "/root/ai-masystem-v2/masystem.db")

JP_TARGETS = [
    ("hospital", ["Tokyo, Japan", "Osaka, Japan", "Yokohama, Japan", "Nagoya, Japan"]),
    ("hotel",     ["Tokyo, Japan", "Osaka, Japan", "Kyoto, Japan", "Yokohama, Japan"]),
    ("dentist",   ["Tokyo, Japan", "Osaka, Japan", "Nagoya, Japan"]),
    ("clinic",    ["Tokyo, Japan", "Osaka, Japan"]),
]

def nearby(near, cat, radius=8000, limit=15):
    for attempt in range(3):
        try:
            out = subprocess.run(["python3", MAPS, "nearby", "--near", near,
                                  "--category", cat, "--radius", str(radius),
                                  "--limit", str(limit)], capture_output=True, text=True, timeout=120).stdout
            d = json.loads(out)
            if "results" in d:
                return d["results"]
        except Exception:
            pass
        time.sleep(5)
    return []

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--dry", action="store_true"); args = ap.parse_args()
    rows = []
    for cat, cities in JP_TARGETS:
        for city in cities:
            res = nearby(city, cat)
            kept = [r for r in res if r.get("name")]
            for r in kept:
                rows.append({
                    "segment": cat,
                    "city": city.split(",")[0].strip(),
                    "name": r["name"],
                    "website": r.get("website", "") or "",
                    "phone": r.get("phone", "") or "",
                    "address": (r.get("address", "") or "")[:80],
                    "email": "",
                })
            print(f"{cat} @ {city}: {len(res)} found, {len(kept)} kept", flush=True)
            time.sleep(2)
    # dedupe by (name, segment)
    seen, uniq = set(), []
    for r in rows:
        key = (r["name"].lower(), r["segment"])
        if key in seen: continue
        seen.add(key); uniq.append(r)
    print(f"\nTotal Japan prospects: {len(uniq)}")
    if args.dry:
        for r in uniq[:10]: print("  -", r["name"], r["segment"], r["phone"])
        return
    con = sqlite3.connect(DB); cur = con.cursor()
    now = int(time.time()); ins = 0
    for r in uniq:
        cur.execute("SELECT id FROM leads WHERE name=? AND interest=?", (r["name"], r["segment"]))
        if cur.fetchone(): continue
        cur.execute("""INSERT INTO leads (name,company,email,phone,interest,message,source,status,tags,created_at)
                       VALUES (?,?,?,?,?,?,?,?,?,?)""",
                    (r["name"], r["website"], "", r["phone"], r["segment"],
                     r["address"], "maps-japan", "new", json.dumps(["japan"]), now))
        ins += 1
    con.commit(); con.close()
    print(f"Inserted {ins} new Japan leads into {DB}")

if __name__ == "__main__":
    main()
