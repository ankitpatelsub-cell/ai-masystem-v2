#!/usr/bin/env python3
# ingest_maps.py — REAL data source: scrape live businesses via the maps skill,
# then upsert them into the live v2 leads table (masystem.db).
# Run: python3 ingest_maps.py            (inserts real prospects)
#      python3 ingest_maps.py --dry       (print only, no DB write)
import subprocess, json, os, sqlite3, argparse, sys

MAPS = "/root/.hermes/profiles/agent2/skills/productivity/maps/scripts/maps_client.py"
DB = os.environ.get("DB_PATH", "/root/ai-masystem-v2/masystem.db")

TARGETS = [
    ("hospital", ["Ahmedabad, Gujarat", "Gandhinagar, Gujarat", "Surat, Gujarat", "Vadodara, Gujarat"]),
    ("hotel",    ["Ahmedabad, Gujarat", "Surat, Gujarat", "Vadodara, Gujarat", "Rajkot, Gujarat"]),
    ("car_rental", ["Ahmedabad, Gujarat", "Surat, Gujarat"]),
    ("dentist",  ["Ahmedabad, Gujarat"]),
]

def nearby(near, cat, radius=10000, limit=15):
    for _ in range(3):
        try:
            out = subprocess.run(["python3", MAPS, "nearby", "--near", near,
                                  "--category", cat, "--radius", str(radius),
                                  "--limit", str(limit)], capture_output=True, text=True, timeout=120).stdout
            d = json.loads(out)
            if "results" in d:
                return d["results"]
        except Exception:
            pass
        import time; time.sleep(5)
    return []

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--dry", action="store_true"); args = ap.parse_args()
    rows = []
    for cat, cities in TARGETS:
        for city in cities:
            res = nearby(city, cat)
            kept = [r for r in res if r.get("name")]
            for r in kept:
                rows.append({
                    "segment": cat,
                    "city": city.split(",")[0],
                    "name": r["name"],
                    "website": r.get("website", "") or "",
                    "phone": r.get("phone", "") or "",
                    "address": (r.get("address", "") or "")[:80],
                    "email": "",  # maps has no email; left blank for manual/LLM enrichment
                })
            print(f"{cat} @ {city}: {len(res)} found, {len(kept)} kept", flush=True)
            import time; time.sleep(2)

    # dedupe by (name, website/city)
    seen, uniq = set(), []
    for r in rows:
        key = (r["name"].lower(), r["website"] or r["city"].lower())
        if key in seen: continue
        seen.add(key); uniq.append(r)
    print(f"\nTotal real prospects: {len(uniq)}")

    if args.dry:
        for r in uniq[:10]: print("  -", r["name"], r["segment"], r["website"])
        return

    con = sqlite3.connect(DB); cur = con.cursor()
    now = int(__import__("time").time())
    ins = 0
    for r in uniq:
        # upsert on name+city so re-runs don't duplicate
        cur.execute("SELECT id FROM leads WHERE name=? AND (email=? OR email='') AND interest=?",
                    (r["name"], r["website"], r["segment"]))
        if cur.fetchone():
            continue
        cur.execute("""INSERT INTO leads (name,company,email,phone,interest,message,source,status,created_at)
                       VALUES (?,?,?,?,?,?,?,?,?)""",
                    (r["name"], r["website"], "", r["phone"], r["segment"],
                     r["address"], "maps", "new", now))
        ins += 1
    con.commit(); con.close()
    print(f"Inserted {ins} new real leads into {DB}")

if __name__ == "__main__":
    main()
