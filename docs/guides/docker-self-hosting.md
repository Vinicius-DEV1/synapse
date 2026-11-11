# 🐳 Synapse Self-Hosting Guide (Docker & Docker Compose)

This guide provides instructions for deploying a self-hosted instance of **Synapse Web** using Docker and Docker Compose.

---

## 1. Architectural Overview

The containerized deployment packages Synapse Web into an ultra-lightweight, hardened Nginx Alpine container:
- **Build Stage**: Compiles the web application using Node 22 Alpine (`npm run build:web`).
- **Runtime Stage**: Serves the compiled SPA via Nginx Alpine with built-in security headers (`X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`), Gzip compression, and static asset caching.
- **Image Size**: ~25 MB total footprint.
- **Data and Sync**: The container serves the React web build. User data is stored by the browser adapters, including IndexedDB; cloud sync is optional and follows the entity-specific encryption behavior of the active adapters. This deployment description does not certify that all browser data or metadata is encrypted at rest or in the cloud.

---

## 2. Prerequisites

- **Docker Engine**: Version 24.0 or higher.
- **Docker Compose**: Version 2.0 or higher (`docker compose`).

---

## 3. Quick Deployment

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/Vinicius-DEV1/synapse.git
   cd synapse
   ```

2. **Configure Environment Variables (Build-Time)**:
   Since Vite embeds `VITE_*` environment variables during the build stage, create your `.env` before compiling the container:
   ```bash
   cp apps/web-react/.env.example apps/web-react/.env
   # Edit .env to add your Firebase or Google Cloud keys (optional)
   ```

3. **Build and Launch Container**:
   ```bash
   docker compose up -d --build
   ```

4. **Access Synapse**:
   Open your browser and navigate to:
   ```
   http://localhost:8080
   ```

---

## 4. Docker Compose Operations

```bash
# View real-time container logs
docker compose logs -f

# Check container health status
docker compose ps

# Stop the container
docker compose down

# Rebuild container after updating code
git pull origin master
docker compose up -d --build
```

---

## 5. Reverse Proxy & HTTPS Deployment (Nginx / Caddy / Traefik)

When exposing Synapse Web to the internet, always terminate SSL/TLS using a reverse proxy.

### Example Nginx Reverse Proxy Configuration
```nginx
server {
    listen 443 ssl http2;
    server_name synapse.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/synapse.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/synapse.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
