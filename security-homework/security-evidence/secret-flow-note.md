# Secrets Management — Current State & Production Target

## Where Secrets Live

| Secret | Local dev | Production target |
|--------|-----------|-------------------|
| `JWT_SECRET` | `.env` file (gitignored) | AWS Secrets Manager / Vault |
| `DB_PASSWORD` | `.env` file | AWS RDS managed credentials / Vault |
| `AWS_SECRET_ACCESS_KEY` | `.env` file | IAM Instance Profile (no static key) |
| `RABBITMQ_URL` (contains credentials) | `.env` file | Vault / K8s Secret |
| Payment provider keys | `.env` file | Vault with lease-based rotation |

## How Secrets Reach the Runtime

```
.env file (local)          AWS Secrets Manager (prod)
      │                              │
      ▼                              ▼
 process.env               injected as env vars at
      │                    container/pod startup via
      │                    ECS task definition secrets
      │                    or K8s ExternalSecrets operator
      ▼
NestJS ConfigModule.forRoot({ load: [...configFactories] })
      │
      ▼
ConfigService.getOrThrow('auth.secret')  ← only way to read secrets in app code
      │
      ▼
Used in JwtModule, TypeOrmModule, etc.
```

**Key design decisions:**
- `ConfigModule` is the single injection point — business logic never reads `process.env` directly.
- `skipProcessEnv: true` is NOT set — env vars flow through, but secrets are mapped through typed config factories that allow validation and defaulting.
- No secret is ever passed to a Logger call.

## What Must Never Be Logged

The following values must NEVER appear in application logs, audit logs, or error responses:

- `JWT_SECRET` / raw JWT tokens (only the decoded `sub`, `roles`, `scopes` claims are safe to log)
- `DB_PASSWORD`
- `AWS_SECRET_ACCESS_KEY`
- `passwordHash` (bcrypt hash stored in DB)
- Payment card numbers, CVV, full PANs
- `RABBITMQ_URL` (contains password)

The `AuditService` only accepts a typed `AuditEventInput` interface that excludes all of the above by design.

## Rotation Strategy

### JWT_SECRET
**Current state:** Single static secret. All tokens are instantly invalidated when it rotates.
**Rotation procedure (current):**
1. Generate a new random 256-bit secret: `openssl rand -hex 32`
2. Update the value in the secret store / `.env`
3. Redeploy the API — all active sessions are invalidated (users must re-login)
4. Tradeoff: zero-downtime rotation requires key versioning (see production target)

**Production target:**
- Introduce `kid` (key ID) claim in JWT header
- Support 2 active keys simultaneously (current + previous) during a rotation window
- Retire the old key after `JWT_EXPIRES_IN` TTL has passed (ensuring no valid tokens reference it)

### DB_PASSWORD (PostgreSQL)
**Rotation procedure:**
1. Create new password in DB: `ALTER USER app_user PASSWORD 'new_password';`
2. Update secret in secret store
3. Rolling redeploy or graceful restart — TypeORM reconnects with new credentials
4. Remove old password entry from secret store

**Production target:** AWS RDS IAM authentication (no static password at all).

### AWS_SECRET_ACCESS_KEY
**Production target:** Use IAM Instance Profile / ECS Task Role — no static key required.
**If static key is used:** rotate in IAM console → update in Secrets Manager → redeploy.

### RabbitMQ Credentials
**Rotation procedure:**
1. Create new RabbitMQ user / update password via management API
2. Update `RABBITMQ_URL` in secret store
3. Redeploy workers

## Local vs Stage vs Production

| Environment | Secret source | Who can access |
|-------------|---------------|----------------|
| local | `.env` file (gitignored) | Developer only |
| stage | CI/CD pipeline injects from Vault / GitHub Actions Secrets | CI runners + team |
| production | AWS Secrets Manager / Vault with RBAC | Ops team + automated deploy |

**The `.env` file is never committed.** The committed `.env.example` contains all key names with empty values as a reference for onboarding.

