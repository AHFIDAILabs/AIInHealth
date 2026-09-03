# --- deps: install once, reused by both the build and (via multi-stage copy) prod stages ---
FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- build: compile TypeScript, excluding test files (tsconfig.build.json) ---
FROM deps AS build
COPY . .
RUN npm run build

# --- production: only prod dependencies + compiled output, nothing else ---
FROM node:20-slim AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist

EXPOSE 5000
# /healthz checks real DB connectivity (not a static 200) — see src/routes/health.routes.ts.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||5000)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]
