# Built with the repo root as context (docker-compose.yml: build.context: .),
# not api/ -- scripts/migrate.js needs db/migrations/*.sql, which lives
# outside api/ entirely. COPY db /db (not /app/db) matters specifically:
# migrate.js resolves migrations via new URL("../../db/migrations",
# import.meta.url) relative to its own location -- two levels up from
# /app/scripts/migrate.js lands on /db/migrations.
FROM node:20-alpine

WORKDIR /app

COPY api/package.json api/package-lock.json* ./
RUN npm install --omit=dev

COPY api/src ./src
COPY api/scripts ./scripts
COPY db /db

EXPOSE 3000

CMD ["node", "src/index.js"]
