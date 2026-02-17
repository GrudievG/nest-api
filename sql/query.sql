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