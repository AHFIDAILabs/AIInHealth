# --- build ---
FROM node:20-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# VITE_* vars are baked into the static bundle at build time, not read at
# runtime — each one must be passed as a build ARG (Render forwards its
# dashboard-configured env vars into `docker build` as ARGs, but only for
# names a Dockerfile actually declares; an undeclared one is silently
# dropped). Defaults here match this app's "on by default" posture even if
# Render's dashboard has nothing configured for them at all.
ARG VITE_API_URL=http://localhost:5000/api/v1
ENV VITE_API_URL=$VITE_API_URL
ARG VITE_COMPENDIUM_ENABLED=true
ENV VITE_COMPENDIUM_ENABLED=$VITE_COMPENDIUM_ENABLED
ARG VITE_EVENT_EXTRAS_ENABLED=true
ENV VITE_EVENT_EXTRAS_ENABLED=$VITE_EVENT_EXTRAS_ENABLED
# Engagement Score + public Leaderboard (Portal) — on by default, same
# posture as the two flags above. Directory is NOT declared here on
# purpose: it's deliberately hidden for now (see PortalLayout.tsx/App.tsx's
# own VITE_DIRECTORY_ENABLED check) — an undeclared ARG is simply absent
# from the build, which is exactly "hidden by default" with no extra line
# needed. Add the matching ARG/ENV pair here (and set it in Render's
# dashboard) if Directory is ever brought back.
ARG VITE_LEADERBOARD_ENABLED=true
ENV VITE_LEADERBOARD_ENABLED=$VITE_LEADERBOARD_ENABLED
RUN npm run build

# --- production: static files served by nginx ---
FROM nginx:alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://localhost/ >/dev/null || exit 1
