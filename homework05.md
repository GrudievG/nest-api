## Transaction Management

Order creation is executed within a database transaction using the `dataSource.transaction()` helper provided by TypeORM. This approach was chosen because it automatically manages the full transaction lifecycle — including commit, rollback, and connection release — reducing the risk of human error and improving overall reliability.

Encapsulating all order-related operations (order creation, order items persistence, stock updates, and idempotency handling) inside a single transaction guarantees atomicity: either all changes succeed, or none are applied.

---

## Concurrency Control Strategy

The system uses **pessimistic locking** to protect inventory from concurrent modifications.

During order creation, the relevant `Product` rows are locked (`FOR UPDATE`) before stock validation and deduction. This ensures that no other transaction can modify the same rows until the current transaction completes.

This strategy was intentionally selected because **overselling inventory is an unacceptable outcome**. In this context, strong consistency is prioritized over maximum throughput. While pessimistic locking may introduce short wait times under high contention, it guarantees the integrity of stock levels and prevents race conditions.

---

## Idempotency

To make the `createOrder` endpoint safe for retries and resistant to double submissions, an **idempotency key** is required for each request.

When a client sends a create order request, it includes a unique idempotency key alongside the order payload. The system stores this key in the database with a **UNIQUE constraint** and checks for an existing order before processing the transaction.

**Behavior:**

- If the key is new → a new order is created.
- If the key already exists → the previously created order is returned.

This mechanism ensures that repeated requests — whether caused by network timeouts, client retries, or duplicate submissions — do not result in duplicated orders.

By enforcing idempotency at the database level, the system gains an additional layer of protection against concurrency issues and maintains consistent state even under unreliable network conditions.
