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

## Project setup

### Development Workflow:

Start environment:
```bash
docker compose -f compose.yaml -f compose.dev.yaml up --watch
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

### Production Mode:

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

### Distroless Runtime
```bash
docker compose --profile distroless up --build api-distroless
```

### Hardened Runtime
```bash
docker compose --profile hardened up --build api-hardened
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

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