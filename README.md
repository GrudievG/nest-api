<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

# Architectural Vision

[Nest](https://github.com/nestjs/nest) offers a clearly structured, modular approach to building server-side applications. The core idea is to solve the "chaotic architecture" problem, which frequently occurs in Node.js projects, by implementing strict rules and design patterns.

## Core Concepts
The project structure is based on several fundamental principles:
* **Separation of Concerns (SoC)**
* **Dependency Injection (DI)**
* **Inversion of Control (IoC)**

### 1. Separation of Concerns (SoC)
NestJS enforces the separation of responsibilities at the class level:

* **Controllers**: Responsible solely for handling incoming HTTP requests and returning responses.
* **Services (Providers)**: Contain the core business logic. They remain decoupled and unaware of HTTP details or specific routes.
* **Modules**: Group related functionality together, creating clear boundaries and encapsulation within the system.

### 2. Dependency Injection & SOLID
Thanks to the implementation of **Dependency Injection**, we do not instantiate classes manually (e.g., via `new Service()`). Instead, the framework automatically "injects" the required dependencies.

This is a perfect implementation of the **Dependency Inversion** principle from **SOLID**:
> Our classes depend on abstractions (interfaces/providers) rather than concrete implementations, making the codebase highly maintainable and easy to test.

## Benefits of the Structure
The folder structure proposed by NestJS promotes:
1.  **Scalability**: Easy to add new features without breaking existing logic.
2.  **Readability**: A rigid structure ensures that any developer can immediately locate the logic for a specific domain.
3.  **Testability**: DI allows for seamless replacement of real services with "mock objects" during unit testing.

## Additional Features
In my opinion, the use of **Decorators** is particularly noteworthy. They provide a clean and convenient way to implement cross-cutting concerns, such as validation or authorization, without cluttering the main business logic within the services.

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```


## Homework 9:

**Integrated domain:** Users (avatars), Products (main product image)

### Upload Flow (presign → upload → complete)

**1.  POST /files/presign**

-  Validates authentication and permissions.
-  Backend generates a secure S3 key (avatar/{userId}/{uuid}.jpg).
-  Creates a FileRecord in pending status.
-  Returns a presigned PUT URL for direct upload to S3.

**2. Client Upload**

- Client uploads the file directly to S3 using the presigned URL.
- Backend does not proxy file bytes.

**3. POST /files/complete**

- Verifies file ownership.
- Confirms object exists in S3.
- Changes status from pending → ready.

**4. PATCH /users/me/avatar**

- Checks permissions
- Attaches file to User.avatarFileId.

### Access Control & Security

- S3 bucket is private (Block Public Access enabled).
- Object keys are generated only on the backend.
- Users cannot upload to other user's prefixes.
- Ownership is validated before completing upload.
- File must be in pending state to be completed.
- CloudFront uses Origin Access Control (OAC) to read from S3.
- Direct S3 access returns AccessDenied.

## Homework 10:

### Files added:

- Dockerfile — multi-stage build (dev, build, prod, prod-distroless)
- compose.yaml — production-like stack
- compose.dev.yaml — development overrides
- .dockerignore

### Multi-Stage Dockerfile

Implemented stages:

- **dev** — full dependencies, Nest watch mode
- **build** — TypeScript compilation
- **prod** — minimal runtime, non-root
- **prod-distroless** — hardened minimal runtime without shell

Services:

- **api** — NestJS backend
- **postgres** — PostgreSQL 16 (internal network only)
- **minio** — S3-compatible storage
- **minio-init** — bucket provisioning (one-off)
- **migrate** — DB migrations (one-off)
- **seed** — DB seed (one-off)

Networking:

- internal network → DB & MinIO isolation
- public network → API exposed on localhost

### Project Setup

**Development Workflow:**

Start environment:
```bash
docker compose -f compose.yaml -f compose.dev.yaml up
```

Run Migrations:
```bash
docker compose -f compose.yaml -f compose.dev.yaml run --build --rm migrate
```

Run Seed:
```bash
docker compose -f compose.yaml -f compose.dev.yaml run --build --rm seed
```

Create MinIO Bucket:
```bash
docker compose -f compose.yaml -f compose.dev.yaml --profile tools up minio-init
```

**Production Mode:**

Start environment:
```bash
docker compose up --build
```

Run Migrations:
```bash
docker compose run --rm migrate
```

Run Seed:
```bash
docker compose run --rm seed
```

Create MinIO Bucket:
```bash
docker compose --profile tools up minio-init
```

Distroless Runtime
```bash
docker compose --profile distroless up --build api-distroless
```

Hardened Runtime
```bash
docker compose --profile hardened up --build api-hardened
```

### Optimizations:

**Containers size:**

```bash
docker build --target dev -t app:dev .
docker build --target prod -t app:prod .
docker build --target prod-distroless -t app:distroless .
docker build --target prod-hardened -t app:hardened .
docker image ls
```
<img width="659" height="91" alt="Снимок экрана 2026-03-07 в 14 41 27" src="https://github.com/user-attachments/assets/188b6a82-287c-4d31-9abb-09c4f3497fef" />

**Containers layers:**

```bash
docker history app:prod
docker history app:distroless
```
<img width="922" height="477" alt="Снимок экрана 2026-03-07 в 14 56 28" src="https://github.com/user-attachments/assets/4770fbbd-6bf4-4ecb-a562-e6c3d5e6308d" />


**Distroless has:**

- No package manager
- No shell
- Minimal OS surface
- Smaller attack surface

**Non-root check:**

```bash
docker compose up --build -d
docker compose exec api id
```
<img width="475" height="40" alt="Снимок экрана 2026-03-07 в 15 01 20" src="https://github.com/user-attachments/assets/0bbd2616-239f-4b9b-a032-27ee0809504c" />

## RabbitMQ Topology
The application uses a **Work Queue** pattern to handle asynchronous order processing. This ensures high reliability and allows the system to scale horizontally by adding more worker instances.

| Component | Type | Description                                                      |
| :--- | :--- |:-----------------------------------------------------------------|
| Exchange | Direct | Default RabbitMQ exchange                                        |
| Queue | Durable | `orders.process`: Main workload queue for order fulfillment. <br> `orders.dlq`: Dead Letter Queue for messages that failed all retry attempts. |
| Retry Limit | Integer | 3 attempts                                                       |

### Message Flow
* **Production**: When an order is created, a message is published to `orders.process` with `persistent: true` to ensure data safety across broker restarts.

* **Consumption**: Workers fetch messages using a QoS Prefetch (configured via `RABBITMQ_PREFETCH`) to prevent overwhelming a single instance.

* **Retry Logic**: If processing fails, the worker increments an attempt counter in the payload:

  * **< 3 attempts**: The message is re-published to `orders.process` for a new try.

  * **≥ 3 attempts**: The message is moved to `orders.dlq` for manual inspection.

* **Idempotency**: Each message is tracked in the processed_messages database table to prevent duplicate processing.

### Management UI Inspection
To monitor the message flow and queue health:

1. **Access**: Open http://localhost:15672 (default) and log in.

2. **Queues Tab**: Check `orders.process` to see the current backlog (Ready vs Unacked).

   * Monitor `orders.dlq` for failed orders that require attention.

3. **Tracing**: Click on a queue and use the "Get Messages" panel to inspect the JSON payload and the `attempt` count of any pending task.

4. **Connections**: Verify that your NestJS instances are successfully connected under the "Connections" or "Channels" tabs.

### Retry Logic
Instead of using RabbitMQ's built-in Dead Letter Exchange (DLX) configuration, **Manual Retries** was used:

**Try/Catch**: The worker captures failures.

**State Tracking**: You use an attempt counter within the message payload.

**Re-publishing**: If `attempt < maxAttempts`, you publish a new message back to `orders.process`.

**Final Failure**: If `attempt >= maxAttempts`, you move the message to `orders.dlq`.

### Idempotency

The RabbitMQ topology is tightly coupled with the database state to achieve Exactly-Once processing at the application level through two primary mechanisms:

* **Idempotency Table**: The `processFromQueue` method inserts entries into a `ProcessedMessage` table. This prevents duplicate processing if a network interruption occurs between the database commit and the message acknowledgment (`ch.ack()`).

* **Pessimistic Locking**: The use of `pessimistic_write` during order creation ensures that every message published to the topology reflects a verified and guaranteed state within the database.

### Testing flow:

1. Run the environment with `docker compose up --build`. It's possible to use compose.local.yaml file. It will start Postgres, Minio and RabbitMQ containers. Then start api locally.
2. Run migrations and seed data. (`npm run db:migrate`, `npm run db:seed`)
3. Authenticate with admin credentials. Endpoint: `POST {{base_url}}/api/v1/auth/login` Request body: `{ email: 'admin@example.com', password: 'password123' }`
4. Create an order using `POST {{base_url}}/api/v1/orders`. Request body: ``` {
   "items": [
   {
   "productId": "9e9272e0-6143-4c16-aac6-b65c8a354862",
   "quantity": 3
   },
   {
   "productId": "3af2a9b6-8982-4641-9b5b-5a5e272dd3bf",
   "quantity": 2
   }
   ],
   "idempotencyKey": "someKey"
   }```
5. Check the order status using `GET {{base_url}}/api/v1/orders/:id`. Get the order ID from the previous response.
6. To check retry logic, send a request to the enspoint `POST {{base_url}}/api/v1/debug/orders/process`. Request body: ```{
   "orderId": "anyRandomString",
   "messageId": "anyRandomString",
   "attempt": 1, 
   "simulate": "alwaysFail"
   }```. Check logs in the console of API. And also it's possible to check the `process.dlq` queue in the GUI of RabbitMQ. 
7. To check idempotency, send a request to the enspoint `POST {{base_url}}/api/v1/debug/orders/process`. Request body: ```{
   "orderId": "Order ID of created order from the previous step",
   "messageId": "rder ID of created order from the previous step",
   "attempt": 1,
   }```. Since we already have entry in the `processed_messages` table with existing orderId as messageId and we have unique constraint on this column, it will not be inserted again. 

## Homework 14:

### Environment setup:

**1. Start infrastructure (Postgres, MinIO, RabbitMQ):**

```bash
# Option A — Docker Compose local profile (recommended)
docker compose -f compose.yaml -f compose.local.yaml up -d

# Option B — full stack
docker compose up --build -d
```

**2. Run migrations & seed:**

```bash
npm run db:migrate
npm run db:seed
```

> Seeded products are inserted with fixed UUIDs — you can get them via `GET /api/v1/products` (see below).

**3. Copy environment config:**

```bash
cp .env.example .env
# Fill in the required values (DB, MinIO, JWT secret, etc.)
```

**4. Start the main API:**

```bash
npm run start:dev
```

**5. Start the payments gRPC service (separate terminal):**

```bash
npm run start:payments:dev
```

> The payments gRPC service listens on `localhost:5021` by default (configurable via `PAYMENTS_GRPC_URL`).  
> Proto contract: `proto/payments.proto` at the repository root — referenced automatically by both services.

---

### Happy path: create → pay → check status

```bash
BASE=http://localhost:4000/api/v1

# 1. Authenticate
TOKEN=$(curl -s -X POST $BASE/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}' | jq -r .accessToken)

# 2. Get available product IDs
curl -s $BASE/products -H "Authorization: Bearer $TOKEN" | jq '[.[] | {id, title, stock}]'

# 3. Create an order (replace productId values with real ones from step 2)
ORDER=$(curl -s -X POST $BASE/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"productId": "9e9272e0-6143-4c16-aac6-b65c8a354862", "quantity": 1},
      {"productId": "3af2a9b6-8982-4641-9b5b-5a5e272dd3bf", "quantity": 1}
    ],
    "idempotencyKey": "order-key-001"
  }')
ORDER_ID=$(echo $ORDER | jq -r .id)
echo "Order ID: $ORDER_ID"

# 4. Pay the order
PAY=$(curl -s -X POST $BASE/orders/$ORDER_ID/pay \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": "10.15",
    "currency": "USD",
    "idempotencyKey": "pay-key-001"
  }')
PAYMENT_ID=$(echo $PAY | jq -r .paymentId)
echo "Payment ID: $PAYMENT_ID"

# 5. Check payment status
curl -s $BASE/orders/payments/$PAYMENT_ID/status \
  -H "Authorization: Bearer $TOKEN" | jq .

# 6. Confirm order is now PAID
curl -s $BASE/orders/$ORDER_ID \
  -H "Authorization: Bearer $TOKEN" | jq '{id, status}'
```

**Expected outcomes:**
- Step 4 → `{"paymentId":"...","status":"PAYMENT_STATUS_AUTHORIZED","message":"Payment authorized",...}`
- Step 5 → `{"paymentId":"...","status":"PAYMENT_STATUS_AUTHORIZED","orderId":"...","providerRef":"..."}`
- Step 6 → `{"id":"...","status":"PAID"}`

**Idempotency check:**  
Repeat step 4 with the **same** `idempotencyKey` — you get back the same `paymentId`.  
Repeat with a **different** `idempotencyKey` — a new authorization is returned (order is already PAID so the response is the cached payment record).

---

### Proto contract:
Proto contract file is placed in the project root.

In the main app `PAYMENTS_GRPC_CLIENT` is registered in the Orders module and proto file is connected during registration of client.

```
ClientsModule.registerAsync([
      {
        name: 'PAYMENTS_GRPC_CLIENT',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: PAYMENTS_PACKAGE_NAME,
            protoPath: join(process.cwd(), 'proto/payments.proto'),
            url: configService.get<string>(
              'PAYMENTS_GRPC_URL',
              'localhost:5021',
            ),
          },
        }),
      },
    ]),
```

In the payments service proto file is connected during microservice creation
```
const grpc = await NestFactory.createMicroservice<MicroserviceOptions>(
    PaymentsGrpcModule,
    {
      transport: Transport.GRPC,
      options: {
        package: PAYMENTS_PACKAGE_NAME,
        protoPath: join(process.cwd(), 'proto/payments.proto'),
        url,
      },
    },
  );

  await grpc.listen();
```

## Security Homework — Baseline Hardening

Full baseline document: [`security-homework/SECURITY-BASELINE.md`](./security-homework/SECURITY-BASELINE.md)

### What was the weakest point before hardening?

Three endpoints — `GET /api/v1/users`, `GET /api/v1/users/:id`, and `PATCH /api/v1/users/:id` — had **no authentication guards at all**. Anyone could list all users (PII leak) or update any user profile without a token. Additionally, there was no rate limiting anywhere and no security headers.

### What was changed

| Area | Change |
|------|--------|
| **Rate limiting** | `@nestjs/throttler` installed. **Global policy**: 100 req/60 s on all routes. **Strict policy**: 5 req/60 s on `POST /auth/login`, `POST /users`, `POST /orders/:id/pay` |
| **Security headers** | `helmet()` added in `main.ts` — sets CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, etc. |
| **CORS** | Replaced wildcard `cors: true` with explicit `CORS_ALLOWED_ORIGINS` env-var allowlist |
| **Proxy-aware IP** | `trust proxy: 1` set so ThrottlerGuard reads real client IP behind nginx/ALB |
| **Audit logging** | New global `AuditService` — emits structured JSON events for: login failure, login success, payment initiated, admin order delete, admin user delete |
| **Access control fix** | `GET /users` → ADMIN only; `GET /users/:id` → auth required; `PATCH /users/:id` → ADMIN only |

### What is consciously left in backlog

- JWT refresh tokens / key versioning
- CAPTCHA on login / registration
- Redis-backed distributed rate limiting (multi-instance)
- gRPC TLS channel credentials (payments service)
- RabbitMQ AMQPS
- GraphQL playground disabled in production

### How to verify

**Security headers:**
```bash
curl -si http://localhost:4000/api/v1/auth/login -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"wrong"}' | head -20
```

**Rate limit (strict — triggers 429 after 4 attempts):**
```bash
for i in 1 2 3 4 5 6; do
  curl -s http://localhost:4000/api/v1/auth/login -X POST \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrongpassword"}' \
    -o /dev/null -w "Request $i: HTTP %{http_code}\n"
done
```
Expected: `401 401 401 401 429 429`

**Audit log** (watch app stdout while making requests):
```bash
# In one terminal — watch logs
npm run start 2>&1 | grep AUDIT

# In another terminal — trigger login failure
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"nonexistent@example.com","password":"password123"}'
```

**Unauthenticated access to users (now returns 401):**
```bash
curl -si http://localhost:4000/api/v1/users | head -5
# Expected: HTTP/1.1 401 Unauthorized
```

### Evidence files

| File | Contents |
|------|----------|
| `security-homework/security-evidence/headers.txt` | Real curl output with all security headers |
| `security-homework/security-evidence/rate-limit.txt` | Real 429 responses from strict throttle on login |
| `security-homework/security-evidence/audit-log-example.txt` | Structured audit event examples for all 5 instrumented events |
| `security-homework/security-evidence/secret-flow-note.md` | Secret storage, delivery flow, rotation strategy |
| `security-homework/security-evidence/tls-note.md` | Intended TLS architecture diagram and production design |

