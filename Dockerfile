# ==========================================
# Synapse Web - Production Multi-Stage Build
# ==========================================

# Stage 1: Build static web bundle
FROM node:22-alpine AS builder

WORKDIR /app

# Cache dependencies
COPY package*.json ./
RUN npm ci

# Copy source code and build
COPY . .
RUN npm run build:web

# Stage 2: Serve with lightweight, secure Nginx Alpine
FROM nginx:alpine

# Clean default web root
RUN rm -rf /usr/share/nginx/html/*

# Copy compiled SPA assets
COPY --from=builder /app/dist-web /usr/share/nginx/html

# Copy optimized Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
