#!/usr/bin/env bash
cd /root/ai-masystem-v2
TOK=$(cat /root/.git-pat 2>/dev/null)
git remote set-url origin "https://$TOK@github.com/ankitpatelsub-cell/ai-masystem-v2.git"
git push origin main 2>&1 | tail -3
git remote set-url origin "https://github.com/ankitpatelsub-cell/ai-masystem-v2.git"
echo "scrub: $(grep -c ghp_ /root/ai-masystem-v2/.git/config)"
