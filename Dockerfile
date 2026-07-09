# Vira Frontend — Produktions-Image (Railway / beliebiger Docker-Host)
# ---------------------------------------------------------------------------
# Vite bettet VITE_*-Variablen zur BUILD-Zeit in das JS-Bundle ein (nicht zur
# Laufzeit). Deshalb müssen VITE_API_BASE_URL/VITE_API_KEY als Docker-Build-Args
# gesetzt werden — in Railway unter Service → Settings → Build → Build Args.
# Ändert sich die Backend-URL oder der API-Key, muss dieses Image NEU gebaut
# werden (ein reiner Redeploy mit geänderter Runtime-Env genügt NICHT).
#
# Build:  docker build --build-arg VITE_API_BASE_URL=https://api.example.com \
#                       --build-arg VITE_API_KEY=xxx -t vira-frontend .
# Run:    docker run -p 8080:8080 vira-frontend
# ---------------------------------------------------------------------------

# ── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

# Abhängigkeiten zuerst (Docker-Layer-Cache: ändert sich nur App-Code, muss
# npm ci nicht erneut das komplette node_modules herunterladen).
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_API_BASE_URL
ARG VITE_API_KEY
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL} \
    VITE_API_KEY=${VITE_API_KEY}

RUN npm run build

# ── Stage 2: Serve (statisches Bundle via nginx) ─────────────────────────────
FROM nginx:1.27-alpine

# Non-root-Betrieb — nginx:alpine bringt bereits einen "nginx"-User mit.
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

# Railway injiziert $PORT; nginx.conf verwendet ein envsubst-Template dafür.
RUN mkdir -p /etc/nginx/templates \
    && mv /etc/nginx/conf.d/default.conf /etc/nginx/templates/default.conf.template

ENV PORT=8080
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wget -qO- "http://localhost:${PORT:-8080}/" > /dev/null || exit 1

CMD ["sh", "-c", "envsubst '$PORT' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
