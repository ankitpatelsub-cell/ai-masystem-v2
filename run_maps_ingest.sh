#!/usr/bin/env bash
# run_maps_ingest.sh — detached wrapper for the daily real-lead scrape.
# Kills any prior hung scrape, then runs ingest_maps.py (full targets) into the live DB.
export HOME=/root
export DB_PATH=/root/ai-masystem-v2/masystem.db
LOG=/root/ai-masystem-v2/maps_ingest.log
pkill -f "ingest_maps.py" 2>/dev/null
cd /root/ai-masystem-v2
echo "[$(date -u)] starting maps ingest" >> "$LOG"
nohup /root/.hermes/node/bin/node -e "0" 2>/dev/null  # noop keep shell
python3 /root/ai-masystem-v2/ingest_maps.py >> "$LOG" 2>&1
echo "[$(date -u)] done (exit $?) rows now: $(/root/.hermes/node/bin/node --input-type=module -e "import db from '/root/ai-masystem-v2/server/db.js';console.log(db.prepare(\"SELECT COUNT(*) c FROM leads WHERE source='\''maps'\''\").get().c)" 2>/dev/null | tail -1)" >> "$LOG"
