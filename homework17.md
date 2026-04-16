# Homework 17 — CI/CD Pipeline

## Overview

This project implements a full end-to-end CI/CD pipeline for a NestJS backend using **GitHub Actions**. The pipeline covers the entire lifecycle from Pull Request quality checks through build, stage deployment, and production deployment with manual approval.

```
PR → quality checks → merge to develop → build image → stage deploy → smoke test
                                                                          │
                                                              manual approval gate
                                                                          │
                                                                   prod deploy → smoke test
```

### Key Principles

- **Immutable artifact** — a single Docker image (tagged `sha-<commit>`) is built once and promoted from stage to production without rebuilding.
- **Environment isolation** — stage and production run on separate EC2 instances with independent secrets/configuration via GitHub Environments.
- **Manual approval gate** — production deployment requires explicit reviewer approval through GitHub Environment protection rules.
- **Concurrency protection** — parallel production deployments are blocked via the `concurrency` setting.

---

## 1. Git Strategy

| Branch | Purpose |
|---|---|
| `feature/*` | Feature development branches |
| `develop` | Integration branch; merge triggers build + deploy |
| `main` | Production-ready code |

### Workflow

1. Create a `feature/*` branch from `develop`.
2. Open a Pull Request to `develop` (or `main`) — triggers **PR Checks**.
3. PR cannot be merged until all required checks pass.
4. Merge to `develop` — triggers **Build and Deploy** workflow (build → stage → prod).

---

## 2. PR Checks

**Workflow file:** `.github/workflows/pr-checks.yml`  
**Trigger:** Pull request to `develop` or `main`

### Steps

| Step | Command | Purpose |
|---|---|---|
| Checkout | `actions/checkout@v6` | Clone repository |
| Setup Node | `actions/setup-node@v6` (v24) | Install Node.js |
| Install deps | `npm ci` | Clean install of dependencies |
| Lint | `npm run lint` | ESLint code quality check |
| Typecheck | `npm run typecheck` | TypeScript type validation |
| Build check | `npm run build` | Verify NestJS compiles successfully |
| Docker build validation | `docker build -t test-build .` | Verify Dockerfile builds correctly |

> ⚠️ These checks are configured as **required** in GitHub branch protection rules — PRs cannot be merged if any step fails.

---

## 3. Build Artifact

**Workflow file:** `.github/workflows/build-and-stage.yml`  
**Trigger:** Push to `develop` or manual `workflow_dispatch`

### 3.1 Docker Image Build

The `build` job:

1. Authenticates to AWS via **OIDC** (no long-lived credentials).
2. Logs into **Amazon ECR**.
3. Builds a multi-stage Docker image (`--target prod`) optimized for production.
4. Pushes the image to ECR.

### 3.2 Immutable Tagging

Images are tagged with a **commit-based immutable tag**:

```
sha-<first 7 chars of commit SHA>
```

Example: `some-aws-account-id.dkr.ecr.eu-central-1.amazonaws.com/rd-course-api:sha-a1b2c3d`

This ensures:
- Every build produces a unique, traceable tag.
- The same image is used from stage through production (no rebuild).

### 3.3 Release Manifest

A `release-manifest.json` artifact is created and uploaded:

```json
{
  "commit": "<sha>",
  "services": {
    "api": {
      "image": "<full ECR image URI with tag>"
    }
  }
}
```

This artifact is downloaded by both the stage and production deploy jobs to retrieve the image reference. This approach is used because GitHub Actions masks job outputs that contain secret values (the ECR registry URL is derived from secrets).

---

## 4. Stage Deploy

**Job:** `deploy` in `build-and-stage.yml`  
**GitHub Environment:** `stage`  
**Trigger:** Automatic — runs immediately after a successful build

### Deploy Process

1. **Configure AWS** via OIDC.
2. **Download** the `release-manifest.json` artifact.
3. **Extract** the Docker image URI from the manifest.
4. **Deploy via AWS SSM** `SendCommand` to the stage EC2 instance:
   - Login to ECR on the instance.
   - Write environment-specific `.env` file (from GitHub Environment secrets/vars).
   - Stop existing containers (`docker-compose down`).
   - Pull the new image.
   - Start infrastructure (PostgreSQL, RabbitMQ).
   - Run database migrations.
   - Run database seed.
   - Start the API service.
5. **Wait** for SSM command completion and capture stdout/stderr.
6. **Smoke test** — `curl -f http://<STAGE_HOST>:3000/api/v1/health`.

### Compose File

`compose.stage.yml` (on EC2 as `docker-compose.stage.yml`) defines:
- `postgres` — PostgreSQL 16 with health check
- `rabbitmq` — RabbitMQ with management UI
- `migrate` — runs TypeORM migrations
- `seed` — seeds initial data
- `api` — the NestJS application

---

## 5. Production Deploy

**Job:** `deploy-prod` in `build-and-stage.yml`  
**GitHub Environment:** `production` (with required reviewers)  
**Trigger:** Manual approval — waits for a reviewer to approve after stage succeeds

### Protection Mechanisms

| Mechanism | Implementation |
|---|---|
| **Manual approval** | GitHub Environment `production` with required reviewers |
| **Same artifact** | Downloads the same `release-manifest.json` — no image rebuild |
| **Concurrency guard** | `concurrency: { group: deploy-production, cancel-in-progress: false }` — blocks parallel deploys |
| **Deploy audit trail** | Logs commit SHA, image tag, environment, and triggering actor |

### Deploy Process

1. **Deploy info** — logs commit SHA, tag, environment, and actor for audit.
2. **Configure AWS** via OIDC.
3. **Download** the `release-manifest.json` artifact (same artifact from the build job).
4. **Extract** the Docker image URI.
5. **Deploy via AWS SSM** to the **production** EC2 instance:
   - Same pattern as stage, but using `docker-compose.prod.yml`.
   - **No seed step** — production data is not overwritten.
   - Only migrations are run.
6. **Smoke test** — `curl -f http://<PROD_HOST>/api/v1/health`.

### Differences from Stage

| Aspect | Stage | Production |
|---|---|---|
| Trigger | Automatic after build | Manual approval required |
| EC2 instance | Stage instance | Production instance |
| Compose file | `docker-compose.stage.yml` | `docker-compose.prod.yml` |
| Seed data | Yes (`seed` service runs) | No (skipped to protect data) |
| Concurrency | None | `deploy-production` group |
| Deploy info logging | No | Yes (commit, tag, actor) |

---

## 6. Pipeline Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PR Checks Workflow                           │
│  trigger: pull_request → develop / main                             │
│                                                                     │
│  ┌──────────┐  ┌──────┐  ┌───────────┐  ┌───────┐  ┌────────────┐   │
│  │ npm ci   │→ │ lint │→ │ typecheck │→ │ build │→ │ docker     │   │
│  │          │  │      │  │           │  │ check │  │ build      │   │
│  └──────────┘  └──────┘  └───────────┘  └───────┘  │ validation │   │
│                                                    └────────────┘   │
└─────────────────────────────────────────────────────────────────────┘

                              merge ↓

┌─────────────────────────────────────────────────────────────────────┐
│                     Build and Deploy Workflow                       │
│  trigger: push → develop / workflow_dispatch                        │
│                                                                     │
│  ┌──────────────────────────────────────┐                           │
│  │            build job                 │                           │
│  │                                      │                           │
│  │  checkout → OIDC → ECR login →       │                           │
│  │  docker build → push → manifest      │                           │
│  │                                      │                           │
│  │  outputs: tag (sha-xxxxxxx)          │                           │
│  │  artifact: release-manifest.json     │                           │
│  └──────────────┬───────────────────────┘                           │
│                 │                                                   │
│                 ▼                                                   │
│  ┌──────────────────────────────────────┐                           │
│  │       deploy job (stage)             │                           │
│  │       environment: stage             │                           │
│  │                                      │                           │
│  │  OIDC → download manifest →          │                           │
│  │  SSM deploy (stage EC2) →            │                           │
│  │  smoke test                          │                           │
│  └──────────────┬───────────────────────┘                           │
│                 │                                                   │
│                 ▼                                                   │
│  ┌──────────────────────────────────────┐                           │
│  │    deploy-prod job (production)      │                           │
│  │    environment: production           │                           │
│  │    ⏸  MANUAL APPROVAL REQUIRED       │                           │
│  │    concurrency: deploy-production    │                           │
│  │                                      │                           │
│  │  deploy info → OIDC →                │                           │
│  │  download manifest (same artifact) → │                           │
│  │  SSM deploy (prod EC2) →             │                           │
│  │  smoke test                          │                           │
│  └──────────────────────────────────────┘                           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 7. GitHub Environments & Secrets

### Repository-level secrets (shared)

| Secret | Description |
|---|---|
| `AWS_REGION` | AWS region (e.g., `eu-central-1`) |
| `ECR_REPOSITORY` | ECR repository name |
| `AWS_ROLE_ARN` | IAM role ARN for OIDC authentication |

### Environment: `stage`

| Type | Name | Description |
|---|---|---|
| Secret | `EC2_INSTANCE_ID` | Stage EC2 instance ID |
| Secret | `STAGE_HOST` | Stage public IP / DNS |
| Secret | `DB_USER` | Database username |
| Secret | `DB_PASSWORD` | Database password |
| Secret | `DB_NAME` | Database name |
| Secret | `JWT_SECRET` | JWT signing key |
| Secret | `AWS_S3_BUCKET` | S3 bucket name |
| Secret | `AWS_ACCESS_KEY_ID` | IAM access key for S3 |
| Secret | `AWS_SECRET_ACCESS_KEY` | IAM secret key for S3 |
| Secret | `AWS_CLOUDFRONT_URL` | CloudFront distribution URL |
| Secret | `RABBITMQ_URL` | RabbitMQ connection string |
| Var | `JWT_EXPIRES_IN` | JWT token expiration |
| Var | `FILES_PRESIGN_EXPIRES_IN_SEC` | S3 presign URL expiry |
| Var | `RABBITMQ_PREFETCH` | RabbitMQ prefetch count |
| Var | `PAYMENTS_GRPC_URL` | gRPC payments URL |
| Var | `PAYMENTS_GRPC_BIND_URL` | gRPC payments bind URL |
| Var | `PAYMENTS_RPC_TIMEOUT_MS` | gRPC timeout |
| Var | `PAYMENTS_RPC_MAX_RETRIES` | gRPC max retries |
| Var | `PAYMENTS_RPC_BACKOFF_MS` | gRPC backoff |

### Environment: `production`

Same secret/var keys as `stage`, with production-specific values. Additional differences:

| Type | Name | Description |
|---|---|---|
| Secret | `EC2_INSTANCE_ID` | **Production** EC2 instance ID |
| Secret | `PROD_HOST` | **Production** public IP / DNS |
| Protection | Required reviewers | Manual approval before deploy |

---

## 8. Deployment Infrastructure

### Architecture

```
GitHub Actions Runner
        │
        ├── (OIDC) → AWS IAM Role
        │                │
        │                ├── ECR (push/pull images)
        │                └── SSM (send commands)
        │
        ├── SSM SendCommand → Stage EC2
        │                       └── docker-compose.stage.yml
        │                           ├── postgres
        │                           ├── rabbitmq
        │                           ├── migrate
        │                           ├── seed
        │                           └── api
        │
        └── SSM SendCommand → Prod EC2
                                └── docker-compose.prod.yml
                                    ├── postgres
                                    ├── rabbitmq
                                    ├── migrate (migrations only)
                                    └── api
```

### Authentication

- **GitHub → AWS**: OIDC federation (no stored AWS credentials in GitHub).
- **EC2 → ECR**: `aws ecr get-login-password` via instance IAM role.
- **GitHub → EC2**: AWS SSM `SendCommand` (no SSH keys needed).

### Compose Files

| File | Location on EC2 | Purpose |
|---|---|---|
| `compose.stage.yml` | `/opt/api/docker-compose.stage.yml` | Stage deployment |
| `compose.prod.yml` | `/opt/api/docker-compose.prod.yml` | Production deployment |

Both are fully parameterized via environment variables — no hardcoded values. The `.env` file is generated during each deploy from GitHub Environment secrets.

---

## 9. How to Trigger a Full Deployment

1. Create a `feature/my-change` branch, make changes, push.
2. Open a PR to `develop` — PR Checks run automatically.
3. Once checks pass, merge the PR.
4. The **Build and Deploy** workflow triggers:
   - **Build** — Docker image built and pushed to ECR.
   - **Stage deploy** — automatically deploys to stage EC2, runs smoke test.
   - **Production deploy** — pauses and waits for manual approval.
5. Go to the GitHub Actions run → click **Review deployments** → approve `production`.
6. Production deploy executes — deploys to prod EC2, runs smoke test.

---

## 10. Files Overview

| File | Purpose |
|---|---|
| `.github/workflows/pr-checks.yml` | PR quality gates (lint, typecheck, build, Docker) |
| `.github/workflows/build-and-stage.yml` | Build + stage deploy + prod deploy workflow |
| `compose.stage.yml` | Docker Compose for stage environment |
| `compose.prod.yml` | Docker Compose for production environment |
| `Dockerfile` | Multi-stage Docker build (base → deps → build → prod) |

