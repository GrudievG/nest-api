# Security Baseline

---

## 1. Service Overview

NestJS REST + GraphQL API that handles:
- User registration & JWT-based authentication
- Product catalogue (read-heavy)
- Order creation & lifecycle management
- Asynchronous order processing via RabbitMQ
- Payment authorisation via gRPC to a separate payments microservice
- File uploads (S3 presign flow)

Runtime: Docker (non-root), PostgreSQL 16, MinIO (S3-compatible), RabbitMQ.

---

## 2. Surface Area & Risk Table

| Surface area | Risk | Control before homework | What was added | Evidence | Residual risk |
|---|---|---|---|---|---|
| `POST /api/v1/auth/login` | Brute-force, credential stuffing | JWT auth only | **Strict rate limit** 5 req/60 s per IP + **audit log** on failure & success | `security-evidence/rate-limit.txt` | CAPTCHA / anomaly detection absent |
| `POST /api/v1/users` (register) | Mass account creation, abuse | None | **Strict rate limit** 5 req/60 s per IP | `security-evidence/rate-limit.txt` | CAPTCHA absent |
| `POST /api/v1/orders/:id/pay` | Double-charge, payment abuse | JWT + roles guard | **Strict rate limit** 5 req/60 s per IP + **audit log** | `security-evidence/audit-log-example.txt` | No webhook verification for payment provider |
| `GET /api/v1/users`, `GET /api/v1/users/:id` | User enumeration / PII leak | **No guard at all** ❌ | Added `JwtAuthGuard`; list endpoint additionally requires `ADMIN` role | — | — |
| `PATCH /api/v1/users/:id` | Unauthorised profile update | **No guard at all** ❌ | Added `JwtAuthGuard` + `ADMIN` role | — | Self-service profile update not yet available |
| `DELETE /api/v1/users/:id` | Privilege escalation | `ADMIN` role required | **Audit log** added | `security-evidence/audit-log-example.txt` | — |
| `DELETE /api/v1/orders/:id` | Admin abuse | `ADMIN` role required | **Audit log** added | `security-evidence/audit-log-example.txt` | — |
| All endpoints | Missing security headers | `cors: true` (wildcard) | **helmet()** added, CORS restricted to allowlist | `security-evidence/headers.txt` | CSP relaxed for Apollo Sandbox — tighten for prod |
| All endpoints | IP-based throttling bypass via proxy | — | `trust proxy: 1` configured for correct IP detection behind reverse proxy | `security-evidence/headers.txt` | Requires correct proxy config in infra |
| JWT secret | Weak / rotatable key | Single `JWT_SECRET` env var | Documented rotation strategy | `security-evidence/secret-flow-note.md` | No refresh token / no key versioning yet |
| DB credentials | Leaked via logs | Loaded via ConfigService only | Not logged, not hardcoded | `security-evidence/secret-flow-note.md` | — |
| Transport | Plaintext HTTP in dev | No TLS | Documented intended TLS design | `security-evidence/tls-note.md` | No certificate yet |
| GraphQL playground | Internal tooling exposed | No restriction | CSP partially relaxed — should be disabled in prod | — | Playground available on `/graphql` |
| RabbitMQ / gRPC | Plaintext internal comms | Localhost only | Documented production target (AMQPS, gRPC TLS) | `security-evidence/tls-note.md` | Not implemented in local env |

---

## 3. Changes Made in This Homework

### 3.1 Rate Limiting (2 policies)

**Package:** `@nestjs/throttler`

**Policy A — Global (all routes):** 100 requests / 60 s per IP
- Registered as `APP_GUARD` in `AppModule` so it applies to every route automatically.

**Policy B — Strict (risky endpoints):** 5 requests / 60 s per IP
- Applied via `@Throttle({ strict: { limit: 5, ttl: 60_000 } })` on:
  - `POST /auth/login` — brute-force protection
  - `POST /users` — mass account creation protection
  - `POST /orders/:id/pay` — payment abuse protection

Returns HTTP **429 Too Many Requests** when limit is exceeded.

**Proxy-aware IP detection:** `app.set('trust proxy', 1)` ensures Express reads the real client IP
from `X-Forwarded-For` when running behind nginx / Traefik / ALB.

### 3.2 Security Headers

**Package:** `helmet`

Applied globally in `main.ts` via `app.use(helmet({ ... }))`.

Headers set by default:
| Header | Value |
|--------|-------|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `SAMEORIGIN` |
| `X-XSS-Protection` | `0` (modern browsers use CSP) |
| `Strict-Transport-Security` | `max-age=15552000; includeSubDomains` |
| `Referrer-Policy` | `no-referrer` |
| `Cross-Origin-Opener-Policy` | `same-origin` |
| `Cross-Origin-Resource-Policy` | `same-origin` |
| `Content-Security-Policy` | see below |

**CSP directives:**
```
default-src 'self';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
connect-src 'self';
font-src 'self' https: data:;
object-src 'none';
upgrade-insecure-requests;
```

> `unsafe-inline` for script/style is required for Apollo Sandbox (GraphQL playground).
> In production, disable the playground and restore the strict default CSP.

### 3.3 CORS Hardening

Replaced `cors: true` (wildcard) with an explicit origin allowlist:
```typescript
app.enableCors({
  origin: process.env.CORS_ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:3000'],
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
  credentials: true,
});
```

New env var: `CORS_ALLOWED_ORIGINS` (comma-separated).

### 3.4 Audit Logging

New `AuditService` (`src/common/audit/audit.service.ts`) — global module, available everywhere.

**Audit event schema:**
```json
{
  "action": "auth.login.failure",
  "actorId": "uuid | null",
  "actorRoles": ["user"],
  "targetType": "User",
  "targetId": "uuid | null",
  "outcome": "failure",
  "timestamp": "2026-04-22T10:00:00.000Z",
  "correlationId": "x-request-id value",
  "ip": "1.2.3.4",
  "userAgent": "curl/8.0",
  "reason": "invalid_password"
}
```

**Events instrumented:**

| Event | Where | Trigger |
|-------|--------|---------|
| `auth.login.failure` | `AuthService.login()` | Wrong password or unknown email |
| `auth.login.success` | `AuthService.login()` | Successful authentication |
| `order.payment.initiated` | `OrdersController.payOrder()` | Any call to pay an order |
| `order.admin.delete` | `OrdersController.remove()` | Admin hard-deletes an order |
| `user.admin.delete` | `UsersController.remove()` | Admin hard-deletes a user |

**What is NEVER logged:**
- Raw JWT tokens
- Passwords or `passwordHash`
- Full payment card numbers or CVV
- AWS secret keys
- DB passwords

**Current sink:** NestJS Logger → stdout (captured by Docker).
**Production target:** Ship stdout to CloudWatch / Datadog / ELK via log aggregator.

### 3.5 Access Control Fixes

Critical gaps closed:

| Endpoint | Before | After |
|----------|--------|-------|
| `GET /api/v1/users` | No auth ❌ | `JwtAuthGuard` + `ADMIN` role |
| `GET /api/v1/users/:id` | No auth ❌ | `JwtAuthGuard` |
| `PATCH /api/v1/users/:id` | No auth ❌ | `JwtAuthGuard` + `ADMIN` role |

---

## 4. Secrets Management

See `security-evidence/secret-flow-note.md` for full details.

**Summary:**
- Secrets never hardcoded in source code ✅
- `.env` is in `.gitignore` ✅
- `.env.example` is committed with keys but no values ✅
- Secrets loaded via NestJS `ConfigModule` only — not from raw `process.env` in business logic ✅
- Secrets never logged ✅

---

## 5. Transport / TLS Posture

See `security-evidence/tls-note.md` for the full intended architecture.

**Summary:**
- Currently: HTTP only (local dev)
- Intended production: TLS terminates at reverse proxy (nginx/Traefik/ALB), internal traffic is HTTP
- gRPC and RabbitMQ should use TLS in production

---

## 6. Backlog (Not Implemented — Conscious Decisions)

| Item | Reason deferred |
|------|-----------------|
| JWT refresh tokens + key versioning | Requires additional migration, session management design |
| CAPTCHA on login/register | Requires external service integration |
| GraphQL playground disabled in prod | Config-level change, low risk in current non-prod env |
| gRPC TLS channel credentials | Payments service is on localhost only |
| RabbitMQ AMQPS | Internal Docker network, not exposed publicly |
| Rate limit by user ID (not just IP) | Requires Redis for distributed throttling |
| Distributed rate limiting (Redis store) | Single-instance deployment currently |
| Payment provider webhook signature verification | No inbound webhooks implemented yet |

---

## 7. Evidence References

| Evidence | File |
|----------|------|
| Security headers curl output | `security-evidence/headers.txt` |
| Rate limit 429 response | `security-evidence/rate-limit.txt` |
| Audit log examples | `security-evidence/audit-log-example.txt` |
| Secret handling flow | `security-evidence/secret-flow-note.md` |
| TLS / transport design | `security-evidence/tls-note.md` |

