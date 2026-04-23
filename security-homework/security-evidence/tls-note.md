# Transport Security / TLS Posture

## Current State (Local Development)

All traffic is plain HTTP on localhost. No TLS is configured. This is acceptable for
local development only — the network boundary is the developer's machine.

```
curl http://localhost:3000/api/v1/...   ← HTTP, local only
```

Internal services (Postgres, MinIO, RabbitMQ) are on an isolated Docker internal
network and are not exposed to the host except on defined ports.

## Intended Production Architecture

```
                    ┌──────────────────────────────────┐
  Browser / Client  │        Public Internet           │
  ────────────────► │  HTTPS (TLS 1.2+, HSTS)          │
                    └────────────┬───────────────────-─┘
                                 │  TLS terminates here
                    ┌────────────▼─────────────────────-─┐
                    │   Reverse Proxy / Load Balancer    │
                    │   (nginx / Traefik / AWS ALB)      │
                    │                                    │
                    │  • HTTP → HTTPS redirect (301)     │
                    │  • HSTS: max-age=31536000          │
                    │  • Minimum TLS 1.2, prefer 1.3     │
                    │  • Cipher hardening (no RC4/3DES)  │
                    └────────────┬──────────────────────-┘
                                 │  HTTP (internal network)
                    ┌────────────▼───────────────────────┐
                    │         NestJS API                 │
                    │         port 3000 (internal only)  │
                    └───┬─────────────┬──────────────────┘
                        │             │
           ┌────────────▼──┐   ┌──────▼──────────────────┐
           │  PostgreSQL   │   │  gRPC Payments Service  │
           │  (internal)   │   │  (should use TLS creds  │
           └───────────────┘   │   in production)        │
                               └─────────────────────────┘
                    ┌─────────────────────────────────────┐
                    │  RabbitMQ                           │
                    │  AMQP → AMQPS in production         │
                    │  (currently internal Docker only)   │
                    └─────────────────────────────────────┘
                    ┌─────────────────────────────────────┐
                    │  MinIO / AWS S3                     │
                    │  SDK always uses HTTPS for AWS      │
                    │  MinIO local: HTTP (internal only)  │
                    └─────────────────────────────────────┘
```

## Traffic Classification

| Traffic type | Classification | TLS required |
|---|---|---|
| Client → Reverse proxy | Public | ✅ Yes (terminate TLS here) |
| Reverse proxy → NestJS | Internal / trusted-by-placement | HTTP acceptable on internal Docker net |
| NestJS → PostgreSQL | Internal | TLS recommended in prod (ssl: true in TypeORM) |
| NestJS → RabbitMQ | Internal | AMQPS in production |
| NestJS → gRPC Payments | Internal | gRPC TLS credentials in production |
| NestJS → AWS S3 | External | ✅ Always HTTPS (AWS SDK default) |
| NestJS → MinIO (local) | Internal | HTTP acceptable (dev only) |
| Client → CloudFront → S3 | Public | ✅ HTTPS only (CloudFront config) |

## HTTP → HTTPS Redirect

This must be enforced at the reverse proxy level, NOT in NestJS.

**nginx example:**
```nginx
server {
    listen 80;
    server_name api.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.example.com;

    ssl_certificate     /etc/ssl/certs/api.crt;
    ssl_certificate_key /etc/ssl/private/api.key;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:...;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    location / {
        proxy_pass         http://nestjs-api:3000;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   Host $host;
    }
}
```

**Why X-Forwarded-For matters:** NestJS ThrottlerGuard uses `req.ip` for rate limiting.
With `app.set('trust proxy', 1)`, Express reads the real client IP from `X-Forwarded-For`
set by the proxy — preventing all clients from appearing as the proxy's IP.

## HSTS (HTTP Strict Transport Security)

helmet() adds: `Strict-Transport-Security: max-age=15552000; includeSubDomains`

For production, increase to 1 year and add `preload`:
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```
Submit the domain to https://hstspreload.org after confirming TLS is stable.

## Backlog

- [ ] Configure TLS certificate (Let's Encrypt / ACM) on reverse proxy
- [ ] Enable PostgreSQL SSL in TypeORM config (`ssl: { rejectUnauthorized: true }`)
- [ ] Switch RabbitMQ to AMQPS (`amqps://` URL)
- [ ] Add gRPC channel credentials for payments service
- [ ] Submit to HSTS preload list

