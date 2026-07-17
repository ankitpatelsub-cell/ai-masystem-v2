#!/usr/bin/env bash
# run_maps_ingest.sh — detached wrapper for the daily real-lead maps scrape.
export HOME=/root
export DB_PATH=/root/ai-masystem-v2/masystem.db
LOG=/root/ai-masystem-v2/maps_ingest.log
pkill -f "ingest_maps.py" 2>/dev/null
cd /root/ai-masystem-v2
echo "[$(date -u)] maps ingest starting" | tee -a "$LOG"
python3 /root/ai-masystem-v2/ingest_maps.py >> "$LOG" 2>&1
echo "[$(date -u)] maps ingest done (exit $?)" | tee -a "$LOG"
# always emit a final count so the cron reports OK
/root/.hermes/node/bin/node --input-type=module -e "import db from '/root/ai-masystem-v2/server/db.js';console.log('maps leads now:', db.prepare(\"SELECT COUNT(*) c FROM leads WHERE source='maps'\").get().c)" 2>/dev/null | tail -1 | sed 's/^/  /'
