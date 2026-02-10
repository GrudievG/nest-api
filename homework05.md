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

---

## Query Performance Analysis

### SQL Query

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT o.id,
o.user_id,
o.status,
o.created_at,
oi.product_id,
oi.quantity
FROM orders o
LEFT JOIN order_items oi ON oi.order_id = o.id
WHERE o.user_id = '2bfafba6-1c4b-42d2-9000-0a8e89b3f37d'
AND o.status = 'CREATED'
AND o.created_at >= '2026-01-01'
AND o.created_at <= '2026-10-02'
ORDER BY o.created_at DESC
LIMIT 20 OFFSET 0;
```

### Query Plan Before

```postgresql
Limit  (cost=5744.88..5744.89 rows=1 width=64) (actual time=22.334..24.541 rows=2 loops=1)
Buffers: shared hit=3081
->  Sort  (cost=5744.88..5744.89 rows=1 width=64) (actual time=22.332..24.539 rows=2 loops=1)
Sort Key: o.created_at DESC
Sort Method: quicksort  Memory: 25kB
Buffers: shared hit=3081
->  Nested Loop Left Join  (cost=1000.00..5744.87 rows=1 width=64) (actual time=1.481..24.520 rows=2 loops=1)
Join Filter: (oi.order_id = o.id)
Rows Removed by Join Filter: 2
Buffers: shared hit=3078
->  Gather  (cost=1000.00..5743.78 rows=1 width=44) (actual time=1.474..24.510 rows=1 loops=1)
Workers Planned: 2
Workers Launched: 2
Buffers: shared hit=3077
->  Parallel Seq Scan on orders o  (cost=0.00..4743.68 rows=1 width=44) (actual time=6.696..13.609 rows=0 loops=3)
Filter: ((created_at >= '2026-01-01 00:00:00+00'::timestamp with time zone) AND (created_at <= '2026-10-02 00:00:00+00'::timestamp with time zone) AND (user_id = '2bfafba6-1c4b-42d2-9000-0a8e89b3f37d'::uuid) AND (status = 'CREATED'::orders_status_enum))
Rows Removed by Filter: 66667
Buffers: shared hit=3077
->  Seq Scan on order_items oi  (cost=0.00..1.04 rows=4 width=36) (actual time=0.005..0.006 rows=4 loops=1)
Buffers: shared hit=1
Planning:
Buffers: shared hit=258
Planning Time: 0.910 ms
Execution Time: 24.578 ms
```

### Query Plan After

```postgresql
Limit  (cost=5.54..5.55 rows=1 width=64) (actual time=0.636..0.640 rows=2 loops=1)
Buffers: shared hit=2 read=3
->  Sort  (cost=5.54..5.55 rows=1 width=64) (actual time=0.615..0.616 rows=2 loops=1)
Sort Key: o.created_at DESC
Sort Method: quicksort  Memory: 25kB
Buffers: shared hit=2 read=3
->  Nested Loop Left Join  (cost=0.42..5.54 rows=1 width=64) (actual time=0.486..0.490 rows=2 loops=1)
Join Filter: (oi.order_id = o.id)
Rows Removed by Join Filter: 2
Buffers: shared hit=2 read=3
"              ->  Index Scan using ""IDX_orders_user_id"" on orders o  (cost=0.42..4.45 rows=1 width=44) (actual time=0.376..0.377 rows=1 loops=1)"
Index Cond: (user_id = '2bfafba6-1c4b-42d2-9000-0a8e89b3f37d'::uuid)
Filter: ((created_at >= '2026-01-01 00:00:00+00'::timestamp with time zone) AND (created_at <= '2026-10-02 00:00:00+00'::timestamp with time zone) AND (status = 'CREATED'::orders_status_enum))
Buffers: shared hit=1 read=3
->  Seq Scan on order_items oi  (cost=0.00..1.04 rows=4 width=36) (actual time=0.073..0.074 rows=4 loops=1)
Buffers: shared hit=1
Planning:
Buffers: shared hit=34 read=5
Planning Time: 4.490 ms
Execution Time: 1.000 ms
```

### Conclusion:

Before adding indexes, PostgreSQL executed a **Parallel Seq Scan** on the `orders` table, scanning the whole table to find matching records. This resulted in high buffer usage and an execution time of about **24.6 ms**.

After introducing indexes on `user_id` and `created_at`, the planner switched to an **Index Scan** using `IDX_orders_user_id`. Instead of scanning the entire table, PostgreSQL directly located the relevant rows, reducing buffer usage to just a few pages and lowering execution time to approximately **1 ms**.

