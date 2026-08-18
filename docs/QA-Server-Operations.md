# QA server operations

How the internal QA environment (`docker-compose.yml`) actually runs day to
day, on a physical server that isn't left powered on permanently. Read this
before touching the QA server so we don't end up with two checkouts, two
running stacks, or a disk full of stale Docker images -- all of which are
easy mistakes if this isn't written down somewhere.

## The server

- Host: `debianhomelab` (Debian 12), reachable at `192.168.3.17` on the
  LAN, user `lincalibur`. This is the same physical box used for
  Arduino/ESP32 flashing (see the `debian-server` Claude Code skill) --
  it's a shared homelab machine, not dedicated to this project.
- **It is not left running.** Someone powers it on when the QA environment
  is actually needed; it doesn't sit up 24/7. Everything below is designed
  around that: the QA stack refreshes itself automatically at boot, so
  turning the box on is the only manual step, never SSH-in-and-run-commands.
- There is exactly **one** checkout of this repo on that server:
  `/home/lincalibur/sellsmart-property`. **Never clone a second copy** to
  "just test something" -- work against that one checkout, or do it
  somewhere else entirely (your own machine). A second checkout easily
  turns into a second `docker compose` project bound to the same ports,
  which fails confusingly or, worse, half-succeeds and leaves two stacks
  fighting over the same containers/volumes.

## What happens automatically at boot

**Currently disabled (2026-08-19) -- the QA stack is being run manually
for now**, at the user's request. `qa-deploy.service` is installed but
`systemctl disable`d, and `docker compose down` has been run (data volume
preserved, nothing lost) -- the box currently has no containers running
and nothing starts on its own when it's powered on. Re-enable with
`sudo systemctl enable --now qa-deploy.service` when auto-refresh-on-boot
is wanted again; until then, see "Manually forcing a refresh" below for
how to bring it up by hand.

The service, when enabled, runs `deploy/qa-refresh.sh` on every boot:

1. `git fetch` + hard-reset the checkout to `origin/development` -- always
   converges to exactly what's on `development`, never silently drifts
   from some half-finished manual edit.
2. `docker compose up --build -d` -- rebuilds any image whose source
   changed and (re)starts the stack (`postgres` → `migrate` → `api` +
   `frontend`, per `docker-compose.yml`).
3. `docker image prune -f` -- clears dangling image layers left behind by
   the rebuild, so repeated boots don't slowly fill the disk.

So, once re-enabled: **power the box on, wait about a minute, the QA
environment is already up to date and running.** Nobody needs to SSH in
for a routine refresh.

## One-time setup (already done, documented for reference/reinstall)

```sh
sudo cp deploy/qa-deploy.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable qa-deploy.service
```

`enable` (not `start`) is deliberate -- this makes it run on every future
boot without starting it immediately; run `sudo systemctl start
qa-deploy.service` once by hand the first time, or just reboot.

Also one-time, and already done on `debianhomelab`:

- **Deploy key:** a repo-scoped, read-only SSH deploy key
  (`~/.ssh/sellsmart_deploy` on the server, titled "debianhomelab QA
  deploy (read-only)" in the repo's Deploy keys settings) -- this is what
  lets the server `git fetch` a private repo without a personal token.
  `~/.ssh/config` on the server aliases `github-sellsmart` to use it.
- **Docker:** installed from Docker's official apt repo (not the distro
  package), `lincalibur` added to the `docker` group so the systemd
  service can run `docker compose` without `sudo`.
- **Tailscale:** ~~installed, authenticated~~ **removed as of 2026-08-19**
  -- it was set up and verified working (Serve + HTTPS Certificates,
  reachable at `https://debianhomelab.tail5d3700.ts.net`), then fully torn
  down again at the user's request (logged out, `tailscaled` disabled,
  package uninstalled) out of caution about external reachability, even
  though `tailscale serve` (not `funnel`) never exposed anything beyond
  devices explicitly invited onto the tailnet. **The QA site is currently
  LAN-only** -- reachable at `http://192.168.3.17:8080` (frontend) /
  `:3000` (api) from the local network, not from outside it. `README.md`'s
  "External access (Tailscale)" section still documents the exact steps to
  re-enable this if/when external access is wanted again -- install
  (`curl -fsSL https://tailscale.com/install.sh | sudo sh`), `tailscale up
  --ssh`, re-approve Serve + HTTPS Certificates in the admin console, then
  `tailscale serve --bg --https=443 http://127.0.0.1:8080`.

## Checking it's actually up

```sh
ssh lincalibur@192.168.3.17 "docker compose -f ~/sellsmart-property/docker-compose.yml ps"
ssh lincalibur@192.168.3.17 "curl -sf http://localhost:3000/health"
```

Or, from any device on the LAN: open `http://192.168.3.17:8080` directly
(external/Tailscale access is currently disabled -- see above).

If `api`/`migrate` never come up healthy, check
`docker compose logs migrate` first -- that's the service that actually
applies `db/migrations/*.sql` and exits before `api` starts; a broken
migration is the most likely reason `api` never becomes healthy.

## Starting it manually (current mode) / forcing a refresh

While auto-start-on-boot is disabled (see above), this is how the QA
environment actually gets started:

```sh
ssh lincalibur@192.168.3.17 "sudo systemctl start qa-deploy.service"
```

This runs the exact same `deploy/qa-refresh.sh` the boot path would use --
fetches/resets to `origin/development`, rebuilds, brings the stack up,
prunes dangling images -- just triggered by hand instead of automatically.
Always use this rather than running `git pull`/`docker compose up` by hand
against the checkout, so there's only ever one code path that touches it.

To stop it again: `ssh lincalibur@192.168.3.17 "cd ~/sellsmart-property && sudo docker compose down"`
(the data volume is preserved; add `-v` only if you actually want to wipe it).

## Rolling back a bad deploy

```sh
ssh lincalibur@192.168.3.17
cd ~/sellsmart-property
git log --oneline -5          # find the last-good commit
git reset --hard <sha>
docker compose up --build -d
```

The next boot (or manual refresh) will fast-forward back to whatever's on
`development` at that point, so a rollback done this way is temporary --
fix the actual issue on `development` before the next reboot undoes it.

## Scope reminder

This environment is for clicking through the real API + frontend before
an AWS account exists -- it is **not** production, has no real auth behind
it (`COGNITO_USER_POOL_ID` is a syntactically-valid placeholder, see
`docker-compose.yml`), and document upload/e-signature/email are
disconnected from real providers. See `README.md`'s "QA environment"
section for the full scope and `docs/Infrastructure-Hosting-Plan.md` for
where this fits against the real (eventual) AWS deployment.
