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
docker compose run --rm seed
```

Run Seed:
```bash
docker compose --profile tools up minio-init
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
