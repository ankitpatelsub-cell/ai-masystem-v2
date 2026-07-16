#!/usr/bin/env bash
# inbound_reply.sh — detached wrapper for the inbound auto-responder (Option A: draft+notify).
export HOME=/root
export DB_PATH=/root/ai-masystem-v2/masystem.db
cd /root/ai-masystem-v2
python3 /root/ai-masystem-v2/inbound_reply.py >> /root/ai-masystem-v2/inbound_reply.log 2>&1
