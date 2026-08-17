# Branching & Release Workflow

## Branches

- **`mvp`** — frozen snapshot of the original MVP. Do not merge into this branch; it exists purely as a reference/rollback point.
- **`main`** — production. Always reflects the latest completed, released version of the service.
- **`development`** — integration branch. Buffer between feature work and `main`. Should always be in a working (buildable, lintable) state.
- **`feature/*`, `fix/*`, `chore/*`** — short-lived branches cut from `development` for individual units of work.

## Workflow

1. Decompose the work into a task, then branch from `development`:
   ```
   git checkout development
   git pull
   git checkout -b feature/short-description
   ```
2. Do the work, commit, push, open a PR **into `development`**.
3. CI runs lint + build on the PR automatically. Once green and reviewed, merge.
4. Repeat for each unit of work until `development` represents a complete, tested increment.
5. Open a PR from `development` into `main` to ship. Once merged, tag a release:
   ```
   git checkout main
   git pull
   git tag vX.Y.Z
   git push origin vX.Y.Z
   ```
   Pushing the tag triggers the release pipeline, which builds the app and publishes a GitHub Release with the packaged output attached.

## CI

- `.github/workflows/ci.yml` runs on every PR/push to `development` and `main`: installs deps, lints (`oxlint`), and builds (`vite build`).
- `.github/workflows/release.yml` runs on any `vX.Y.Z` tag push: builds and publishes a GitHub Release with a zipped `dist/`.

## Branch protection

Both `main` and `development` require PRs (no direct pushes) and passing CI checks before merging.
