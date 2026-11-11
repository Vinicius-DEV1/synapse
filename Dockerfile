# ==========================================
# Synapse Web - Production Multi-Stage Build
# ==========================================

FROM node:22-alpine AS builder

WORKDIR /app

# Install the React app workspace using the single root lockfile.
COPY package.json package-lock.json ./
COPY apps/web-react/package.json apps/web-react/package.json
RUN npm ci --legacy-peer-deps

# Build the static web distribution.
COPY . .
RUN npm run build:web

FROM nginx:alpine

RUN rm -rf /usr/share/nginx/html/*
COPY --from=builder /app/apps/web-react/dist-web /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
