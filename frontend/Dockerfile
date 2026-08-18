# Built with the repo root as context (docker-compose.yml: build.context: .),
# since the Vite project (package.json, vite.config.js, index.html, src/,
# public/) lives at the repo root, not under frontend/. Pure SPA, no SSR
# (vite.config.js has no framework plugin beyond react()) -- production
# serving is static files behind nginx, not a Node process.
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Only what `vite build` actually needs from the root context -- avoids
# dragging api/, terraform/, docs/ etc. into this stage.
COPY vite.config.js index.html ./
COPY public ./public
COPY src ./src
RUN npm run build

FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
