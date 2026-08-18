#!/usr/bin/env bash
# Redeploys the QA environment (docker-compose.yml) from the latest
# `development` branch. Run automatically at boot on the QA server
# (debianhomelab, see docs/QA-Server-Operations.md) via the
# qa-deploy.service systemd unit, since that server isn't left running
# permanently -- this is what makes "start the box, it's up to date" true
# without anyone having to SSH in and run commands by hand.
#
# Always resets hard to origin/development rather than a plain `git pull`
# -- this script is the only thing that should ever touch this checkout,
# so there's no local work to preserve, and a hard reset means the QA
# environment always converges to exactly what's on `development`, never
# silently drifts from a half-finished manual edit someone forgot about.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

git fetch origin development
git checkout development
git reset --hard origin/development

docker compose up --build -d

# Rebuilding on every boot otherwise accumulates dangling image layers
# forever -- this is the "don't end up with a shitty server" half of the
# ask, the other half being deploy/README's "one checkout, one stack" rule.
docker image prune -f
