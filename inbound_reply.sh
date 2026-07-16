#!/usr/bin/env bash
# inbound_reply.sh — detached wrapper for the inbound auto-responder (Option A: draft+notify).
# Stdout (a concise per-draft summary) is delivered to Telegram by the cron;
# full detail also goes to inbound_reply.log.
export HOME=/root
export DB_PATH=/root/ai-masystem-v2/masystem.db
cd /root/ai-masystem-v2
python3 /root/ai-masystem-v2/inbound_reply.py 2>> /root/ai-masystem-v2/inbound_reply.log | tee -a /root/ai-masystem-v2/inbound_reply.log
