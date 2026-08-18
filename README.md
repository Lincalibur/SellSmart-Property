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
