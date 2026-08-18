# Property

A React + Vite website styled with Tailwind CSS.

## Running locally

**Prerequisites:** [Node.js](https://nodejs.org/) (includes npm).

1. Install dependencies:

   ```sh
   npm install
   ```

2. Start the dev server:

   ```sh
   npm run dev
   ```

3. Open the URL printed in the terminal (usually [http://localhost:5173](http://localhost:5173)) in your browser. The page hot-reloads as you edit files.

## Other scripts

- `npm run build` — build a production bundle into `dist/`
- `npm run preview` — locally preview the production build
- `npm run lint` — run Oxlint

## Tech stack

- [React](https://react.dev/) + [React Router](https://reactrouter.com/)
- [Vite](https://vite.dev/) for dev server & builds
- [Tailwind CSS](https://tailwindcss.com/) for styling

## QA environment (Docker)

An internal, click-through QA environment -- API + frontend + a bundled,
seeded Postgres -- for trying out the real service before there's an AWS
account to deploy it to. The frontend still runs on mock data (not wired
to the API yet), and document upload/e-signature/email are disconnected
from any real provider (sandbox/blank credentials) -- see
`docker-compose.yml`'s header comment for the exact scope.

**On the Debian server (or anywhere with Docker), using published images:**

```sh
docker compose pull
docker compose up -d
```

- Frontend: [http://localhost:8080](http://localhost:8080)
- API: [http://localhost:3000](http://localhost:3000) (`/health` for a liveness check)

Images are published to GHCR by the "Publish QA images" GitHub Actions
workflow (`.github/workflows/publish-qa-images.yml`) -- manually triggered
(`workflow_dispatch`) from the Actions tab, not on every push.

**Building locally instead of pulling** (e.g. testing a change before
publishing):

```sh
docker compose up --build
```

The `migrate` service runs `db/migrations/*.sql` against the bundled
Postgres and exits before `api` starts; `docker compose logs migrate`
if `api` never comes up healthy.

### External access (Tailscale)

To let the team reach the QA environment from outside the server's own
network -- without opening any inbound ports on the server's firewall/router,
and without paying for a domain or TLS certificate -- put it behind
[Tailscale](https://tailscale.com/) (free for personal/small-team use).
`tailscale serve` only exposes the site to devices already on your private
tailnet (i.e. people you've explicitly invited), not the public internet,
which is the right default for an internal QA site.

**One-time setup on the Debian server:**

```sh
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up   # opens a URL -- log in with GitHub/Google/Microsoft, no card needed
```

Then, in the [Tailscale admin console](https://login.tailscale.com/admin/dns) →
DNS tab, enable **HTTPS Certificates** (needed for `tailscale serve`'s
automatic TLS).

**Every time the QA stack is (re)started** (`docker compose up -d`, frontend on `:8080`):

```sh
sudo tailscale serve --bg --https=443 http://127.0.0.1:8080
```

This persists across reboots (`tailscaled` runs as a systemd service). Find
the stable URL with `tailscale serve status`, or in the admin console --
it'll look like `https://<your-server-name>.tailXXXX.ts.net`.

**Giving teammates access:** admin console → Users → invite by email. Once
they install the free Tailscale app and accept, that URL just works in
their browser -- no VPN client juggling, no port forwarding, no certs to
manage.

**If the API needs to be reachable too** (e.g. hitting `/health` directly):
add a second mapping on another port, `sudo tailscale serve --bg --https=8443 http://127.0.0.1:3000`.

**Making it public instead of tailnet-only** is possible (`tailscale funnel`
instead of `serve`, same command shape) but isn't the default here on
purpose -- an internal QA environment with no real auth in front of it
(Cognito is only a syntactically-valid placeholder in this compose stack,
see `docker-compose.yml`) shouldn't be open to the whole internet.

**Where this actually runs, and how it stays up to date:** see
[`docs/QA-Server-Operations.md`](docs/QA-Server-Operations.md) -- the
server isn't kept running permanently, so the stack refreshes itself from
`development` automatically at boot rather than needing anyone to SSH in.
Read it before touching the QA server so we don't end up with duplicate
checkouts or stacks.
